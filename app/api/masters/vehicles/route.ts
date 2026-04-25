import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function normalizeVehicleNo(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM vehicles WHERE transport_id = ${transportId} ORDER BY vehicle_no ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vehicles', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
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
    const vehicleNo = normalizeVehicleNo(body.vehicle_no);
    if (!vehicleNo) {
      return NextResponse.json(
        { success: false, error: 'Vehicle number is required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM vehicles WHERE transport_id = ${transportId} AND LOWER(vehicle_no) = LOWER(${vehicleNo})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      INSERT INTO vehicles (transport_id, vehicle_no, owner_name, vehicle_type, status)
      VALUES (
        ${transportId},
        ${vehicleNo},
        ${String(body.owner_name || '').trim()},
        ${String(body.vehicle_type || '').trim()},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
