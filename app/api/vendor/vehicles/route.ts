import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { requireVendor } from '@/lib/vendor-auth';

export async function GET(request: Request) {
  await ensureSchema();
  const { vendor, response } = await requireVendor(request);
  if (response) return response;

  try {
    const { rows } = await sql`
      SELECT id, vehicle_no, vehicle_type, rc_expiry, insurance_expiry, fitness_expiry,
        permit_expiry, national_permit_expiry, puc_expiry, road_tax_expiry, status
      FROM vehicles
      WHERE vendor_id = ${vendor.id}
      ORDER BY vehicle_no ASC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendor vehicles', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
