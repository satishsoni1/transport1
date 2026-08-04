import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const TRIP_STATUSES = new Set(['planned', 'ongoing', 'completed', 'cancelled']);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

function toResponseRow(row: any) {
  return {
    ...row,
    lr_ids: parseJsonField(row.lr_ids, []),
  };
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
      return NextResponse.json({ success: false, error: 'Invalid trip id' }, { status: 400 });
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM trips WHERE id = ${id} AND transport_id = ${transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }
    const existing = existingRows[0];

    const body = await request.json();
    const vehicleId =
      body.vehicle_id === undefined
        ? existing.vehicle_id
        : body.vehicle_id
        ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
        : null;
    const driverId =
      body.driver_id === undefined
        ? existing.driver_id
        : body.driver_id
        ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
        : null;
    const status = TRIP_STATUSES.has(body.status) ? body.status : existing.status;

    const { rows } = await sql`
      UPDATE trips
      SET
        vehicle_id = ${vehicleId},
        driver_id = ${driverId},
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        start_date = ${body.start_date ?? existing.start_date},
        end_date = ${body.end_date ?? existing.end_date},
        status = ${status},
        lr_ids = ${JSON.stringify(
          Array.isArray(body.lr_ids) ? body.lr_ids : parseJsonField(existing.lr_ids, [])
        )}::jsonb,
        total_revenue = ${body.total_revenue !== undefined ? Number(body.total_revenue) || 0 : existing.total_revenue},
        total_expense = ${body.total_expense !== undefined ? Number(body.total_expense) || 0 : existing.total_expense},
        remarks = ${body.remarks ?? existing.remarks}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating trip', error);
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
      return NextResponse.json({ success: false, error: 'Invalid trip id' }, { status: 400 });
    }

    const { rows } = await sql`DELETE FROM trips WHERE id = ${id} AND transport_id = ${transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trip', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
