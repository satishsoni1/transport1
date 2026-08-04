import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { createVendorToken, hashVendorPassword } from '@/lib/vendor-auth';

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
      FROM vendors
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

    const vendor = rows[0];
    if (!vendor.password_hash || vendor.password_hash !== hashVendorPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = createVendorToken(vendor);

    return NextResponse.json(
      {
        success: true,
        token,
        vendor: {
          id: vendor.id,
          vendor_name: vendor.vendor_name,
          username: vendor.username,
          mobile: vendor.mobile,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Vendor login error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
