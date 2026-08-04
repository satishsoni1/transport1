import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const QUOTATION_STATUSES = new Set(['draft', 'sent', 'approved', 'rejected', 'expired']);

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
      return NextResponse.json({ success: false, error: 'Invalid quotation id' }, { status: 400 });
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM quotations WHERE id = ${id} AND transport_id = ${transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }
    const existing = existingRows[0];

    const body = await request.json();
    const consignorId =
      body.consignor_id === undefined
        ? existing.consignor_id
        : body.consignor_id
        ? (await sql`SELECT id FROM consignors WHERE id = ${Number(body.consignor_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
        : null;
    const status = QUOTATION_STATUSES.has(body.status) ? body.status : existing.status;

    const { rows } = await sql`
      UPDATE quotations
      SET
        consignor_id = ${consignorId},
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        vehicle_type = ${body.vehicle_type ?? existing.vehicle_type},
        rate = ${body.rate !== undefined ? Number(body.rate) || 0 : existing.rate},
        fuel_surcharge_percent = ${body.fuel_surcharge_percent !== undefined ? Number(body.fuel_surcharge_percent) || 0 : existing.fuel_surcharge_percent},
        valid_until = ${body.valid_until ?? existing.valid_until},
        status = ${status},
        remarks = ${body.remarks ?? existing.remarks}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating quotation', error);
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
      return NextResponse.json({ success: false, error: 'Invalid quotation id' }, { status: 400 });
    }

    const { rows } = await sql`DELETE FROM quotations WHERE id = ${id} AND transport_id = ${transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting quotation', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
