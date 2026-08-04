import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT * FROM consignees
      WHERE transport_id = ${transportId}
      ORDER BY id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignees', error);
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

    if (!body.name || !body.address || !body.city) {
      return NextResponse.json(
        { success: false, error: 'Name, address, and city are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO consignees (transport_id, name, name_mr, address, city, city_mr, gst_no, pincode, contact_person, mobile, email, status)
      VALUES (
        ${transportId},
        ${body.name},
        ${body.name_mr || ''},
        ${body.address},
        ${body.city},
        ${body.city_mr || ''},
        ${body.gst_no || ''},
        ${body.pincode || ''},
        ${body.contact_person || ''},
        ${body.mobile || ''},
        ${body.email || ''},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating consignee', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
