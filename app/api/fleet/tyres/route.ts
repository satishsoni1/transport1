import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const TYRE_STATUSES = new Set(['in_use', 'retreaded', 'scrapped']);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT tyres.*, vehicles.vehicle_no
      FROM tyres
      LEFT JOIN vehicles ON vehicles.id = tyres.vehicle_id
      WHERE tyres.transport_id = ${transportId}
      ORDER BY tyres.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching tyres', error);
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
    const vehicleId = body.vehicle_id
      ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO tyres (
        transport_id, tyre_serial_no, brand, vehicle_id, position, purchase_date, purchase_cost, status
      )
      VALUES (
        ${transportId},
        ${String(body.tyre_serial_no || '').trim()},
        ${String(body.brand || '').trim()},
        ${vehicleId},
        ${String(body.position || '').trim()},
        ${String(body.purchase_date || '').trim()},
        ${Number(body.purchase_cost) || 0},
        ${TYRE_STATUSES.has(body.status) ? body.status : 'in_use'}
      )
      RETURNING *
    `;

    if (vehicleId) {
      await sql`
        INSERT INTO tyre_events (transport_id, tyre_id, event_type, event_date, vehicle_id, position, cost)
        VALUES (${transportId}, ${rows[0].id}, 'allocation', ${String(body.purchase_date || '').trim() || new Date().toISOString().slice(0, 10)}, ${vehicleId}, ${String(body.position || '').trim()}, ${Number(body.purchase_cost) || 0})
      `;
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating tyre', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
