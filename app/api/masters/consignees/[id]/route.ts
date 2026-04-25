import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

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
      return NextResponse.json(
        { success: false, error: 'Invalid consignee id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`
      SELECT * FROM consignees WHERE id = ${id} AND transport_id = ${transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Consignee not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const { rows } = await sql`
      UPDATE consignees
      SET
        name = ${body.name ?? existing.name},
        name_mr = ${body.name_mr ?? existing.name_mr},
        address = ${body.address ?? existing.address},
        city = ${body.city ?? existing.city},
        city_mr = ${body.city_mr ?? existing.city_mr},
        gst_no = ${body.gst_no ?? existing.gst_no},
        contact_person = ${body.contact_person ?? existing.contact_person},
        mobile = ${body.mobile ?? existing.mobile}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating consignee', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, error: 'Invalid consignee id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      DELETE FROM consignees WHERE id = ${id} AND transport_id = ${transportId} RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Consignee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting consignee', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
