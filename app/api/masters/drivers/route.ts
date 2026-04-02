import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { hashDriverPassword } from '@/lib/driver-auth';

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
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!driverName || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Driver name, username, and password are required' },
        { status: 400 }
      );
    }

    const { rows: duplicateRows } = await sql`
      SELECT id
      FROM drivers
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Driver username already exists' },
        { status: 400 }
      );
    }

    const passwordHash = hashDriverPassword(password);

    const { rows } = await sql`
      INSERT INTO drivers (
        driver_name, username, password, password_hash, mobile, license_no, address, vehicle_no, license_valid_from,
        license_valid_to, renewal_date, passport_photo_url, thumb_image_url, status
      )
      VALUES (
        ${driverName},
        ${username},
        ${password},
        ${passwordHash},
        ${String(body.mobile || '').trim()},
        ${String(body.license_no || '').trim()},
        ${String(body.address || '').trim()},
        ${String(body.vehicle_no || '').trim().toUpperCase()},
        ${String(body.license_valid_from || '').trim()},
        ${String(body.license_valid_to || '').trim()},
        ${String(body.renewal_date || '').trim()},
        ${String(body.passport_photo_url || '').trim()},
        ${String(body.thumb_image_url || '').trim()},
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
