import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
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
      SELECT
        fuel_entries.*,
        vehicles.vehicle_no,
        drivers.driver_name,
        (
          fuel_entries.odometer_reading - LAG(fuel_entries.odometer_reading) OVER (
            PARTITION BY fuel_entries.vehicle_id ORDER BY fuel_entries.odometer_reading
          )
        ) / NULLIF(fuel_entries.quantity_liters, 0) AS mileage_kmpl
      FROM fuel_entries
      LEFT JOIN vehicles ON vehicles.id = fuel_entries.vehicle_id
      LEFT JOIN drivers ON drivers.id = fuel_entries.driver_id
      WHERE fuel_entries.transport_id = ${transportId}
      ORDER BY fuel_entries.entry_date DESC, fuel_entries.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching fuel entries', error);
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
    if (!body.vehicle_id || !body.entry_date) {
      return NextResponse.json({ success: false, error: 'Vehicle and entry date are required' }, { status: 400 });
    }

    const vehicleId = (
      await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`
    ).rows[0]?.id;
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 400 });
    }
    const driverId = body.driver_id
      ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const quantity = Number(body.quantity_liters) || 0;
    const rate = Number(body.rate_per_liter) || 0;

    const { rows } = await sql`
      INSERT INTO fuel_entries (
        transport_id, vehicle_id, driver_id, entry_date, quantity_liters, rate_per_liter, amount,
        odometer_reading, fuel_station, payment_mode, remarks, created_by
      )
      VALUES (
        ${transportId},
        ${vehicleId},
        ${driverId},
        ${String(body.entry_date).trim()},
        ${quantity},
        ${rate},
        ${quantity * rate},
        ${Number(body.odometer_reading) || 0},
        ${String(body.fuel_station || '').trim()},
        ${String(body.payment_mode || 'cash').trim()},
        ${String(body.remarks || '').trim()},
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating fuel entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
