import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        cities.*,
        consignors.name AS consignor_name,
        consignees.name AS consignee_name
      FROM cities
      LEFT JOIN consignors ON consignors.id = cities.consignor_id
      LEFT JOIN consignees ON consignees.id = cities.consignee_id
      ORDER BY cities.city_name ASC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching cities', error);
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
    const cityName = String(body.city_name || '').trim();

    if (!cityName) {
      return NextResponse.json(
        { success: false, error: 'City name is required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id FROM cities WHERE LOWER(city_name) = LOWER(${cityName})
    `;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'City already exists' },
        { status: 409 }
      );
    }

    const { rows } = await sql`
      INSERT INTO cities (city_name, city_name_hi, city_name_mr, taluka, district, distance_km, consignor_id, consignee_id, status)
      VALUES (
        ${cityName},
        ${String(body.city_name_hi || '').trim()},
        ${String(body.city_name_mr || '').trim()},
        ${String(body.taluka || '').trim()},
        ${String(body.district || '').trim()},
        ${Number(body.distance_km) || 0},
        ${body.consignor_id ? Number(body.consignor_id) : null},
        ${body.consignee_id ? Number(body.consignee_id) : null},
        ${body.status || 'active'}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating city', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
