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
        vehicles.id, vehicles.vehicle_no, vehicles.vehicle_type,
        ongoing_trip.trip_no AS current_trip_no,
        ongoing_trip.to_city AS current_destination,
        next_trip.trip_no AS next_trip_no,
        next_trip.start_date AS next_trip_date,
        next_trip.from_city AS next_from_city,
        next_trip.to_city AS next_to_city,
        open_maintenance.service_type AS open_maintenance_type
      FROM vehicles
      LEFT JOIN LATERAL (
        SELECT trip_no, to_city FROM trips
        WHERE trips.vehicle_id = vehicles.id AND trips.status = 'ongoing'
        ORDER BY trips.id DESC LIMIT 1
      ) ongoing_trip ON true
      LEFT JOIN LATERAL (
        SELECT trip_no, start_date, from_city, to_city FROM trips
        WHERE trips.vehicle_id = vehicles.id AND trips.status = 'planned'
        ORDER BY trips.start_date ASC NULLS LAST, trips.id ASC LIMIT 1
      ) next_trip ON true
      LEFT JOIN LATERAL (
        SELECT service_type FROM maintenance_records
        WHERE maintenance_records.vehicle_id = vehicles.id
          AND maintenance_records.is_breakdown = TRUE
          AND maintenance_records.service_date >= (CURRENT_DATE - INTERVAL '2 days')::text
        ORDER BY maintenance_records.id DESC LIMIT 1
      ) open_maintenance ON true
      WHERE vehicles.transport_id = ${transportId} AND vehicles.status = 'active'
      ORDER BY vehicles.vehicle_no ASC
    `;

    const planned = rows.map((row) => {
      let status: 'available' | 'on_trip' | 'maintenance' = 'available';
      if (row.open_maintenance_type) status = 'maintenance';
      else if (row.current_trip_no) status = 'on_trip';
      return { ...row, computed_status: status };
    });

    return NextResponse.json(planned, { status: 200 });
  } catch (error) {
    console.error('Error fetching planning data', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
