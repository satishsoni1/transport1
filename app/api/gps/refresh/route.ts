import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { fetchVehicleLocation, resolveGpsConfig } from '@/lib/mappls-service';

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const config = await resolveGpsConfig(transportId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'GPS tracking is not configured or not enabled for this transport' },
        { status: 400 }
      );
    }

    const { rows: vehicles } = await sql`
      SELECT id, gps_device_id FROM vehicles
      WHERE transport_id = ${transportId} AND gps_device_id <> '' AND status = 'active'
    `;

    let updated = 0;
    const errors: string[] = [];
    for (const vehicle of vehicles) {
      const result = await fetchVehicleLocation(vehicle.gps_device_id, config);
      if (!result.ok) {
        errors.push(`Vehicle #${vehicle.id}: ${result.reason}`);
        continue;
      }
      await sql`
        INSERT INTO vehicle_locations (vehicle_id, transport_id, latitude, longitude, speed_kmph, heading, recorded_at)
        VALUES (${vehicle.id}, ${transportId}, ${result.latitude}, ${result.longitude}, ${result.speedKmph}, ${result.heading}, ${result.recordedAt})
        ON CONFLICT (vehicle_id) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          speed_kmph = EXCLUDED.speed_kmph,
          heading = EXCLUDED.heading,
          recorded_at = EXCLUDED.recorded_at
      `;
      updated += 1;
    }

    return NextResponse.json(
      { success: true, updated, total: vehicles.length, errors: errors.slice(0, 5) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error refreshing GPS locations', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
