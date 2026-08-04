import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const TRIP_STATUSES = new Set(['planned', 'ongoing', 'completed', 'cancelled']);

function toResponseRow(row: any) {
  return {
    ...row,
    lr_ids: parseJsonField(row.lr_ids, []),
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT trips.*, vehicles.vehicle_no, drivers.driver_name
      FROM trips
      LEFT JOIN vehicles ON vehicles.id = trips.vehicle_id
      LEFT JOIN drivers ON drivers.id = trips.driver_id
      WHERE trips.transport_id = ${transportId}
      ORDER BY trips.id DESC
    `;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching trips', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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

    const { rows: seqRows } = await sql`
      SELECT get_next_doc_number(${transportId}, 'trip') AS next_number
    `;
    const tripNo = `TR${String(seqRows[0]?.next_number ?? 1).padStart(5, '0')}`;

    const vehicleId = body.vehicle_id
      ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;
    const driverId = body.driver_id
      ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO trips (
        transport_id, trip_no, vehicle_id, driver_id, from_city, to_city,
        start_date, end_date, status, lr_ids, total_revenue, total_expense, remarks, created_by
      )
      VALUES (
        ${transportId},
        ${tripNo},
        ${vehicleId},
        ${driverId},
        ${String(body.from_city || '').trim()},
        ${String(body.to_city || '').trim()},
        ${String(body.start_date || '').trim()},
        ${String(body.end_date || '').trim()},
        ${TRIP_STATUSES.has(body.status) ? body.status : 'planned'},
        ${JSON.stringify(Array.isArray(body.lr_ids) ? body.lr_ids : [])}::jsonb,
        ${Number(body.total_revenue) || 0},
        ${Number(body.total_expense) || 0},
        ${String(body.remarks || '').trim()},
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating trip', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
