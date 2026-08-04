import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireDriver } from '@/lib/driver-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const { rows } = await sql`
      SELECT incident_reports.*, vehicles.vehicle_no
      FROM incident_reports
      LEFT JOIN vehicles ON vehicles.id = incident_reports.vehicle_id
      WHERE incident_reports.driver_id = ${driver.id}
      ORDER BY incident_reports.id DESC
      LIMIT 30
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching driver incidents', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const body = await request.json();
    const description = String(body.description || '').trim();
    if (!description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    let vehicleId: number | null = null;
    if (body.vehicle_id) {
      vehicleId = Number(body.vehicle_id);
    } else if (driver.vehicle_id) {
      vehicleId = Number(driver.vehicle_id);
    }

    const { rows } = await sql`
      INSERT INTO incident_reports (
        transport_id, vehicle_id, driver_id, trip_id, incident_date, description, photo_url, status
      )
      VALUES (
        ${driver.transport_id},
        ${vehicleId},
        ${driver.id},
        ${body.trip_id ? Number(body.trip_id) : null},
        ${String(body.incident_date || '').trim() || new Date().toISOString().slice(0, 10)},
        ${description},
        ${String(body.photo_url || '').trim()},
        'open'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating incident report', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
