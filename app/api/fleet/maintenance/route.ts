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
      SELECT maintenance_records.*, vehicles.vehicle_no, vendors.vendor_name
      FROM maintenance_records
      LEFT JOIN vehicles ON vehicles.id = maintenance_records.vehicle_id
      LEFT JOIN vendors ON vendors.id = maintenance_records.vendor_id
      WHERE maintenance_records.transport_id = ${transportId}
      ORDER BY maintenance_records.service_date DESC, maintenance_records.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching maintenance records', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
    if (!body.vehicle_id || !body.service_date) {
      return NextResponse.json({ success: false, error: 'Vehicle and service date are required' }, { status: 400 });
    }

    const vehicleId = (
      await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`
    ).rows[0]?.id;
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 400 });
    }
    const vendorId = body.vendor_id
      ? (await sql`SELECT id FROM vendors WHERE id = ${Number(body.vendor_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO maintenance_records (
        transport_id, vehicle_id, vendor_id, service_type, service_date, odometer_reading,
        cost, is_breakdown, next_due_date, next_due_odometer, remarks, created_by
      )
      VALUES (
        ${transportId},
        ${vehicleId},
        ${vendorId},
        ${String(body.service_type || '').trim()},
        ${String(body.service_date).trim()},
        ${Number(body.odometer_reading) || 0},
        ${Number(body.cost) || 0},
        ${Boolean(body.is_breakdown)},
        ${String(body.next_due_date || '').trim()},
        ${Number(body.next_due_odometer) || 0},
        ${String(body.remarks || '').trim()},
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance record', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
