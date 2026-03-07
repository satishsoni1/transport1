import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

function normalizeVehicleNo(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM vehicles WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const vehicleNo =
      body.vehicle_no === undefined
        ? existing.vehicle_no
        : normalizeVehicleNo(body.vehicle_no);
    if (!vehicleNo) {
      return NextResponse.json(
        { success: false, error: 'Vehicle number is required' },
        { status: 400 }
      );
    }

    const { rows: dupRows } = await sql`
      SELECT id FROM vehicles
      WHERE LOWER(vehicle_no) = LOWER(${vehicleNo}) AND id <> ${id}
    `;
    if (dupRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      UPDATE vehicles
      SET
        vehicle_no = ${vehicleNo},
        owner_name = ${body.owner_name ?? existing.owner_name},
        vehicle_type = ${body.vehicle_type ?? existing.vehicle_type},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating vehicle', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM vehicles WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting vehicle', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
