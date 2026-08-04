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
      SELECT vehicles.id AS vehicle_id, vehicles.vehicle_no, vehicles.gps_device_id,
        vehicle_locations.latitude, vehicle_locations.longitude, vehicle_locations.speed_kmph,
        vehicle_locations.heading, vehicle_locations.recorded_at
      FROM vehicles
      LEFT JOIN vehicle_locations ON vehicle_locations.vehicle_id = vehicles.id
      WHERE vehicles.transport_id = ${transportId} AND vehicles.gps_device_id <> ''
      ORDER BY vehicles.vehicle_no ASC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vehicle locations', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
