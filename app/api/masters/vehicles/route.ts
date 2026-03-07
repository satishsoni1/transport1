import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

function normalizeVehicleNo(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM vehicles ORDER BY vehicle_no ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vehicles', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();

    const vehicleNo = normalizeVehicleNo(body.vehicle_no);
    if (!vehicleNo) {
      return NextResponse.json(
        { success: false, error: 'Vehicle number is required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM vehicles WHERE LOWER(vehicle_no) = LOWER(${vehicleNo})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      INSERT INTO vehicles (vehicle_no, owner_name, vehicle_type, status)
      VALUES (
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
