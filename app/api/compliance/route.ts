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

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

    const { rows } = await sql`
      WITH vehicle_docs AS (
        SELECT id, vehicle_no AS name, 'RC' AS doc_type, rc_expiry AS expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Insurance', insurance_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Fitness', fitness_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Permit', permit_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'National Permit', national_permit_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'PUC', puc_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Road Tax', road_tax_expiry FROM vehicles WHERE transport_id = ${transportId}
      ),
      driver_docs AS (
        SELECT id, driver_name AS name, 'License' AS doc_type, license_valid_to AS expiry
        FROM drivers WHERE transport_id = ${transportId}
      )
      SELECT 'vehicle' AS entity_type, id AS entity_id, name, doc_type,
        expiry::date AS expiry_date, (expiry::date - CURRENT_DATE) AS days_remaining
      FROM vehicle_docs
      WHERE expiry <> '' AND expiry::date <= CURRENT_DATE + ${days}::int
      UNION ALL
      SELECT 'driver' AS entity_type, id AS entity_id, name, doc_type,
        expiry::date AS expiry_date, (expiry::date - CURRENT_DATE) AS days_remaining
      FROM driver_docs
      WHERE expiry <> '' AND expiry::date <= CURRENT_DATE + ${days}::int
      ORDER BY days_remaining ASC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching compliance report', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
