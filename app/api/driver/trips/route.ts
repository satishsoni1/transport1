import { NextResponse } from 'next/server';
import { ensureSchema, sql, parseJsonField } from '@/lib/db';
import { requireDriver } from '@/lib/driver-auth';

const ACCEPTABLE_TRANSITIONS: Record<string, string> = {
  planned: 'ongoing',
  ongoing: 'completed',
};

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const { rows } = await sql`
      SELECT trips.*, vehicles.vehicle_no
      FROM trips
      LEFT JOIN vehicles ON vehicles.id = trips.vehicle_id
      WHERE trips.driver_id = ${driver.id}
      ORDER BY trips.id DESC
    `;
    return NextResponse.json(
      rows.map((row) => ({ ...row, lr_ids: parseJsonField(row.lr_ids, []) })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching driver trips', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const body = await request.json();
    const tripId = Number(body.trip_id);
    if (!tripId) {
      return NextResponse.json({ success: false, error: 'trip_id is required' }, { status: 400 });
    }

    const { rows: tripRows } = await sql`SELECT * FROM trips WHERE id = ${tripId} AND driver_id = ${driver.id}`;
    if (tripRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }
    const trip = tripRows[0];
    const nextStatus = ACCEPTABLE_TRANSITIONS[trip.status];
    if (!nextStatus) {
      return NextResponse.json(
        { success: false, error: `Trip cannot move forward from status '${trip.status}'` },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      UPDATE trips
      SET status = ${nextStatus},
        start_date = ${nextStatus === 'ongoing' && !trip.start_date ? new Date().toISOString().slice(0, 10) : trip.start_date},
        end_date = ${nextStatus === 'completed' ? new Date().toISOString().slice(0, 10) : trip.end_date}
      WHERE id = ${tripId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating driver trip', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
