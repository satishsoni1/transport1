import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { hashVendorPassword } from '@/lib/vendor-auth';

const VENDOR_TYPES = new Set(['owner', 'broker', 'fuel', 'workshop', 'toll']);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid vendor id' }, { status: 400 });
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM vendors WHERE id = ${id} AND transport_id = ${transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }
    const existing = existingRows[0];

    const body = await request.json();
    const vendorName = body.vendor_name === undefined ? existing.vendor_name : String(body.vendor_name).trim();
    if (!vendorName) {
      return NextResponse.json({ success: false, error: 'Vendor name is required' }, { status: 400 });
    }
    const vendorType = VENDOR_TYPES.has(body.vendor_type) ? body.vendor_type : existing.vendor_type;

    const nextUsername = String(body.username ?? existing.username ?? '').trim();
    const submittedPassword = body.password === undefined ? undefined : String(body.password).trim();
    if (!nextUsername && submittedPassword) {
      return NextResponse.json(
        { success: false, error: 'Provide both username and password, or leave both blank' },
        { status: 400 }
      );
    }
    if (nextUsername) {
      const { rows: duplicateRows } = await sql`
        SELECT id FROM vendors WHERE id <> ${id} AND transport_id = ${transportId} AND LOWER(username) = LOWER(${nextUsername}) LIMIT 1
      `;
      if (duplicateRows.length > 0) {
        return NextResponse.json({ success: false, error: 'Vendor username already exists' }, { status: 400 });
      }
    }
    const passwordHash = !nextUsername
      ? ''
      : submittedPassword
      ? hashVendorPassword(submittedPassword)
      : String(existing.password_hash || '');

    const { rows } = await sql`
      UPDATE vendors
      SET
        vendor_name = ${vendorName},
        vendor_type = ${vendorType},
        contact_person = ${body.contact_person ?? existing.contact_person},
        mobile = ${body.mobile ?? existing.mobile},
        email = ${body.email ?? existing.email},
        address = ${body.address ?? existing.address},
        gst_no = ${body.gst_no ?? existing.gst_no},
        bank_name = ${body.bank_name ?? existing.bank_name},
        account_no = ${body.account_no ?? existing.account_no},
        username = ${nextUsername},
        password_hash = ${passwordHash},
        status = ${body.status ?? existing.status}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating vendor', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid vendor id' }, { status: 400 });
    }

    const { rows } = await sql`
      DELETE FROM vendors WHERE id = ${id} AND transport_id = ${transportId} RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting vendor', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
