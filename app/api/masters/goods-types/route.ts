import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM goods_types ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching goods types', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure POSTGRES_URL for Vercel/local.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();

    if (!body.type_name) {
      return NextResponse.json(
        { success: false, error: 'Type name is required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO goods_types (type_name, description, status)
      VALUES (${body.type_name}, ${body.description || ''}, 'active')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating goods type', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
