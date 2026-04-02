import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { createDriverToken, hashDriverPassword } from '@/lib/driver-auth';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      SELECT *
      FROM drivers
      WHERE LOWER(username) = LOWER(${username})
        AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const driver = rows[0];
    if (driver.password_hash !== hashDriverPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = createDriverToken(driver);

    return NextResponse.json(
      {
        success: true,
        token,
        driver: {
          id: driver.id,
          driver_name: driver.driver_name,
          username: driver.username,
          mobile: driver.mobile,
          vehicle_no: driver.vehicle_no,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Driver login error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
