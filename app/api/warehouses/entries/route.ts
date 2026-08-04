import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const ENTRY_TYPES = new Set(['inward', 'outward']);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { rows } = await sql`
      SELECT warehouse_entries.*, warehouses.warehouse_name
      FROM warehouse_entries
      JOIN warehouses ON warehouses.id = warehouse_entries.warehouse_id
      WHERE warehouse_entries.transport_id = ${auth.transportId}
      ORDER BY warehouse_entries.entry_date DESC, warehouse_entries.id DESC
      LIMIT 200
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching warehouse entries', error);
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
    const warehouseId = Number(body.warehouse_id);
    const entryType = String(body.entry_type || '');
    const entryDate = String(body.entry_date || '').trim();

    if (!warehouseId || !entryDate) {
      return NextResponse.json({ success: false, error: 'Warehouse and entry date are required' }, { status: 400 });
    }
    if (!ENTRY_TYPES.has(entryType)) {
      return NextResponse.json({ success: false, error: `entry_type must be one of ${[...ENTRY_TYPES].join(', ')}` }, { status: 400 });
    }

    const { rows: warehouseRows } = await sql`
      SELECT id FROM warehouses WHERE id = ${warehouseId} AND transport_id = ${auth.transportId}
    `;
    if (warehouseRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    const { rows } = await sql`
      INSERT INTO warehouse_entries (
        transport_id, warehouse_id, entry_type, lr_no, item_description, quantity, unit, entry_date, remarks, created_by
      )
      VALUES (
        ${auth.transportId}, ${warehouseId}, ${entryType}, ${String(body.lr_no || '').trim()},
        ${String(body.item_description || '').trim()}, ${Number(body.quantity) || 0}, ${String(body.unit || 'pcs').trim()},
        ${entryDate}, ${String(body.remarks || '').trim()}, ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
