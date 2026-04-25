import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { hashDriverPassword } from '@/lib/driver-auth';
import { resolveTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM drivers WHERE transport_id = ${transportId} ORDER BY driver_name ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching drivers', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const body = await request.json();
    const driverName = String(body.driver_name || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!driverName) {
      return NextResponse.json(
        { success: false, error: 'Driver name is required' },
        { status: 400 }
      );
    }

    if ((username && !password) || (!username && password)) {
      return NextResponse.json(
        { success: false, error: 'Provide both username and password, or leave both blank' },
        { status: 400 }
      );
    }

    if (username) {
      const { rows: duplicateRows } = await sql`
        SELECT id FROM drivers
        WHERE transport_id = ${transportId} AND LOWER(username) = LOWER(${username})
        LIMIT 1
      `;
      if (duplicateRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Driver username already exists' },
          { status: 400 }
        );
      }
    }

    const passwordHash = password ? hashDriverPassword(password) : '';

    const { rows } = await sql`
      INSERT INTO drivers (
        transport_id, driver_name, username, password, password_hash, mobile, license_no, address, vehicle_no,
        license_valid_from, license_valid_to, renewal_date, passport_photo_url, thumb_image_url, status
      )
      VALUES (
        ${transportId},
        ${driverName},
        ${username},
        '',
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
        ${body.status === 'inactive' ? 'inactive' : 'active'}
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
