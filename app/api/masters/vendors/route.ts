import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { hashVendorPassword } from '@/lib/vendor-auth';

const VENDOR_TYPES = new Set(['owner', 'broker', 'fuel', 'workshop', 'toll']);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT * FROM vendors WHERE transport_id = ${transportId} ORDER BY vendor_name ASC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendors', error);
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
    const vendorName = String(body.vendor_name || '').trim();
    const vendorType = VENDOR_TYPES.has(body.vendor_type) ? body.vendor_type : 'owner';

    if (!vendorName) {
      return NextResponse.json({ success: false, error: 'Vendor name is required' }, { status: 400 });
    }

    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if ((username && !password) || (!username && password)) {
      return NextResponse.json(
        { success: false, error: 'Provide both username and password, or leave both blank' },
        { status: 400 }
      );
    }
    if (username) {
      const { rows: duplicateRows } = await sql`
        SELECT id FROM vendors WHERE transport_id = ${transportId} AND LOWER(username) = LOWER(${username}) LIMIT 1
      `;
      if (duplicateRows.length > 0) {
        return NextResponse.json({ success: false, error: 'Vendor username already exists' }, { status: 400 });
      }
    }
    const passwordHash = password ? hashVendorPassword(password) : '';

    const { rows } = await sql`
      INSERT INTO vendors (
        transport_id, vendor_name, vendor_type, contact_person, mobile, email,
        address, gst_no, bank_name, account_no, username, password_hash, status
      )
      VALUES (
        ${transportId},
        ${vendorName},
        ${vendorType},
        ${String(body.contact_person || '').trim()},
        ${String(body.mobile || '').trim()},
        ${String(body.email || '').trim()},
        ${String(body.address || '').trim()},
        ${String(body.gst_no || '').trim()},
        ${String(body.bank_name || '').trim()},
        ${String(body.account_no || '').trim()},
        ${username},
        ${passwordHash},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating vendor', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
