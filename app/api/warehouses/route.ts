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
    const { rows } = await sql`SELECT * FROM warehouses WHERE transport_id = ${auth.transportId} ORDER BY warehouse_name ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching warehouses', error);
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
    const body = await request.json();
    const warehouseName = String(body.warehouse_name || '').trim();
    if (!warehouseName) {
      return NextResponse.json({ success: false, error: 'Warehouse name is required' }, { status: 400 });
    }
    const { rows } = await sql`
      INSERT INTO warehouses (transport_id, warehouse_name, address, city, capacity_sqft, status)
      VALUES (${auth.transportId}, ${warehouseName}, ${String(body.address || '').trim()}, ${String(body.city || '').trim()}, ${Number(body.capacity_sqft) || 0}, 'active')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
