import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, email, first_name, last_name, role, status, created_at
      FROM app_users
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching users', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();

    if (!body.email || !body.first_name || !body.last_name || !body.role) {
      return NextResponse.json(
        { success: false, error: 'Email, first name, last name and role are required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM app_users WHERE LOWER(email) = LOWER(${body.email})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      INSERT INTO app_users (email, first_name, last_name, role, status)
      VALUES (
        ${String(body.email).trim()},
        ${String(body.first_name).trim()},
        ${String(body.last_name).trim()},
        ${String(body.role).trim()},
        'active'
      )
      RETURNING id, email, first_name, last_name, role, status, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
