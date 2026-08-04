import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const TYRE_STATUSES = new Set(['in_use', 'retreaded', 'scrapped']);

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
      return NextResponse.json({ success: false, error: 'Invalid tyre id' }, { status: 400 });
    }

    const { rows: existingRows } = await sql`SELECT * FROM tyres WHERE id = ${id} AND transport_id = ${transportId}`;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tyre not found' }, { status: 404 });
    }
    const existing = existingRows[0];

    const body = await request.json();
    const vehicleId =
      body.vehicle_id === undefined
        ? existing.vehicle_id
        : body.vehicle_id
        ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
        : null;
    const status = TYRE_STATUSES.has(body.status) ? body.status : existing.status;

    const { rows } = await sql`
      UPDATE tyres
      SET
        tyre_serial_no = ${body.tyre_serial_no ?? existing.tyre_serial_no},
        brand = ${body.brand ?? existing.brand},
        vehicle_id = ${vehicleId},
        position = ${body.position ?? existing.position},
        purchase_date = ${body.purchase_date ?? existing.purchase_date},
        purchase_cost = ${body.purchase_cost !== undefined ? Number(body.purchase_cost) || 0 : existing.purchase_cost},
        status = ${status}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating tyre', error);
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
      return NextResponse.json({ success: false, error: 'Invalid tyre id' }, { status: 400 });
    }

    const { rows } = await sql`DELETE FROM tyres WHERE id = ${id} AND transport_id = ${transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tyre not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tyre', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
