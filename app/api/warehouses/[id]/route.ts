import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid warehouse id' }, { status: 400 });
    }
    const { rows: existingRows } = await sql`SELECT * FROM warehouses WHERE id = ${id} AND transport_id = ${auth.transportId}`;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const body = await request.json();
    const warehouseName = body.warehouse_name === undefined ? existing.warehouse_name : String(body.warehouse_name).trim();
    if (!warehouseName) {
      return NextResponse.json({ success: false, error: 'Warehouse name is required' }, { status: 400 });
    }
    const { rows } = await sql`
      UPDATE warehouses
      SET warehouse_name = ${warehouseName}, address = ${body.address ?? existing.address},
        city = ${body.city ?? existing.city},
        capacity_sqft = ${body.capacity_sqft !== undefined ? Number(body.capacity_sqft) || 0 : existing.capacity_sqft},
        status = ${body.status ?? existing.status}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating warehouse', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid warehouse id' }, { status: 400 });
    }
    const { rows } = await sql`DELETE FROM warehouses WHERE id = ${id} AND transport_id = ${auth.transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting warehouse', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
