import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        routes.*,
        consignors.name AS consignor_name,
        consignees.name AS consignee_name
      FROM routes
      LEFT JOIN consignors ON consignors.id = routes.consignor_id
      LEFT JOIN consignees ON consignees.id = routes.consignee_id
      ORDER BY routes.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching routes', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    if (!body.from_city || !body.to_city) {
      return NextResponse.json(
        { success: false, error: 'From city and to city are required' },
        { status: 400 }
      );
    }

    const routeName =
      String(body.route_name || '').trim() || `${String(body.from_city).trim()} - ${String(body.to_city).trim()}`;

    const { rows } = await sql`
      INSERT INTO routes (route_name, from_city, to_city, consignor_id, consignee_id, status)
      VALUES (
        ${routeName},
        ${String(body.from_city || '').trim()},
        ${String(body.to_city || '').trim()},
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
