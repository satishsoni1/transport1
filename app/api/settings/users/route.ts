import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, email, username, first_name, last_name, role, status, created_at
      FROM users
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

    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!body.email || !username || !password || !body.first_name || !body.last_name || !body.role) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, first name, last name and role are required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM users
      WHERE LOWER(email) = LOWER(${body.email})
         OR LOWER(username) = LOWER(${username})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await sql`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role, status)
      VALUES (
        ${String(body.email).trim()},
        ${username},
        ${passwordHash},
        ${String(body.first_name).trim()},
        ${String(body.last_name).trim()},
        ${String(body.role).trim()},
        'active'
      )
      RETURNING id, email, username, first_name, last_name, role, status, created_at
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'CREATE',
        'app_user',
        ${String(rows[0].id)},
        ${`Created user ${rows[0].email}`},
        'system'
      )
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
