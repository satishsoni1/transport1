import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM drivers ORDER BY driver_name ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching drivers', error);
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
    const driverName = String(body.driver_name || '').trim();

    if (!driverName) {
      return NextResponse.json(
        { success: false, error: 'Driver name is required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO drivers (driver_name, mobile, license_no, status)
      VALUES (
        ${driverName},
        ${String(body.mobile || '').trim()},
        ${String(body.license_no || '').trim()},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating driver', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
