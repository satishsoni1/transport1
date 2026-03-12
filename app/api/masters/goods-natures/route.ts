import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM goods_natures ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching goods natures', error);
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
    const natureName = String(body.nature_name || '').trim();
    if (!natureName) {
      return NextResponse.json(
        { success: false, error: 'Nature name is required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM goods_natures WHERE LOWER(nature_name) = LOWER(${natureName}) LIMIT 1
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(existingRows[0], { status: 200 });
    }

    const { rows } = await sql`
      INSERT INTO goods_natures (nature_name, description, status)
      VALUES (${natureName}, ${body.description || ''}, 'active')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating goods nature', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
