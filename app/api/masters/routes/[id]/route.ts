import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
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
      return NextResponse.json({ success: false, error: 'Invalid route id' }, { status: 400 });
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM routes WHERE id = ${id}`;
    if (!existingRows.length) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    const routeName = body.route_name === undefined
      ? existing.route_name
      : String(body.route_name || '').trim();

    const cities = Array.isArray(body.cities) ? body.cities : (existing.cities || []);
    const fromCity = String(body.from_city !== undefined ? body.from_city : (existing.from_city || cities[0] || '')).trim();
    const toCity = String(body.to_city !== undefined ? body.to_city : (existing.to_city || cities[cities.length - 1] || '')).trim();

    const { rows } = await sql`
      UPDATE routes
      SET
        route_name = ${routeName},
        from_city = ${fromCity},
        to_city = ${toCity},
        cities = ${JSON.stringify(cities)},
        consignor_id = ${body.consignor_id === undefined || body.consignor_id === '' ? existing.consignor_id : Number(body.consignor_id)},
        consignee_id = ${body.consignee_id === undefined || body.consignee_id === '' ? existing.consignee_id : Number(body.consignee_id)},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating route', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Invalid route id' }, { status: 400 });
    }

    const { rows } = await sql`DELETE FROM routes WHERE id = ${id} RETURNING id`;
    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting route', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
