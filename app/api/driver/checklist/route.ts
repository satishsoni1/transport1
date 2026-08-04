import { NextResponse } from 'next/server';
import { ensureSchema, sql, parseJsonField } from '@/lib/db';
import { requireDriver } from '@/lib/driver-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const { rows } = await sql`
      SELECT vehicle_checklists.*, vehicles.vehicle_no
      FROM vehicle_checklists
      LEFT JOIN vehicles ON vehicles.id = vehicle_checklists.vehicle_id
      WHERE vehicle_checklists.driver_id = ${driver.id}
      ORDER BY vehicle_checklists.id DESC
      LIMIT 30
    `;
    return NextResponse.json(
      rows.map((row) => ({ ...row, items: parseJsonField(row.items, []) })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching driver checklists', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const body = await request.json();
    const checklistDate = String(body.checklist_date || '').trim() || new Date().toISOString().slice(0, 10);
    const items = Array.isArray(body.items) ? body.items : [];

    let vehicleId: number | null = null;
    if (body.vehicle_id) {
      vehicleId = Number(body.vehicle_id);
    } else if (driver.vehicle_id) {
      vehicleId = Number(driver.vehicle_id);
    }

    const { rows } = await sql`
      INSERT INTO vehicle_checklists (transport_id, vehicle_id, driver_id, trip_id, checklist_date, items, remarks)
      VALUES (
        ${driver.transport_id},
        ${vehicleId},
        ${driver.id},
        ${body.trip_id ? Number(body.trip_id) : null},
        ${checklistDate},
        ${JSON.stringify(items)}::jsonb,
        ${String(body.remarks || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle checklist', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
