import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
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
      SELECT
        routes.*,
        consignors.name AS consignor_name,
        consignees.name AS consignee_name
      FROM routes
      LEFT JOIN consignors ON consignors.id = routes.consignor_id AND consignors.transport_id = ${transportId}
      LEFT JOIN consignees ON consignees.id = routes.consignee_id AND consignees.transport_id = ${transportId}
      WHERE routes.transport_id = ${transportId}
      ORDER BY routes.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching routes', error);
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
    if (!body.route_name) {
      return NextResponse.json(
        { success: false, error: 'Route name is required' },
        { status: 400 }
      );
    }

    const cities = Array.isArray(body.cities) ? body.cities : [];
    const routeName = String(body.route_name || '').trim();
    const fromCity = String(body.from_city || cities[0] || '').trim();
    const toCity = String(body.to_city || cities[cities.length - 1] || '').trim();

    const { rows } = await sql`
      INSERT INTO routes (transport_id, route_name, from_city, to_city, cities, consignor_id, consignee_id, status)
      VALUES (
        ${transportId},
        ${routeName},
        ${fromCity},
        ${toCity},
        ${JSON.stringify(cities)},
        ${body.consignor_id ? Number(body.consignor_id) : null},
        ${body.consignee_id ? Number(body.consignee_id) : null},
        ${body.status || 'active'}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating route', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
