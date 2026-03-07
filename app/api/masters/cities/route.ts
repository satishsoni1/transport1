import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM cities ORDER BY city_name ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching cities', error);
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
    const cityName = String(body.city_name || '').trim();

    if (!cityName) {
      return NextResponse.json(
        { success: false, error: 'City name is required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM cities WHERE LOWER(city_name) = LOWER(${cityName})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'City already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      INSERT INTO cities (city_name, status)
      VALUES (${cityName}, 'active')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating city', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
