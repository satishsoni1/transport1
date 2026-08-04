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
      SELECT incident_reports.*, vehicles.vehicle_no, drivers.driver_name
      FROM incident_reports
      LEFT JOIN vehicles ON vehicles.id = incident_reports.vehicle_id
      LEFT JOIN drivers ON drivers.id = incident_reports.driver_id
      WHERE incident_reports.transport_id = ${transportId}
      ORDER BY incident_reports.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching incidents', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
