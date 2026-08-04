import { NextResponse } from 'next/server';
import { sql, ensureSchema, parseJsonField } from '@/lib/db';
import { requireVendor } from '@/lib/vendor-auth';

export async function GET(request: Request) {
  await ensureSchema();
  const { vendor, response } = await requireVendor(request);
  if (response) return response;

  try {
    const { rows } = await sql`
      SELECT trips.*, vehicles.vehicle_no, drivers.driver_name
      FROM trips
      JOIN vehicles ON vehicles.id = trips.vehicle_id
      LEFT JOIN drivers ON drivers.id = trips.driver_id
      WHERE vehicles.vendor_id = ${vendor.id}
      ORDER BY trips.id DESC
    `;
    return NextResponse.json(
      rows.map((row) => ({ ...row, lr_ids: parseJsonField(row.lr_ids, []) })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching vendor trips', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
