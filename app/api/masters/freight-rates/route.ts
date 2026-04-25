import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM freight_rates WHERE transport_id = ${transportId} ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching freight rates', error);
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

    if (
      !body.from_city ||
      !body.to_city ||
      body.rate_per_kg === undefined ||
      body.min_rate === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'From city, to city, rate per kg, and min rate are required',
        },
        { status: 400 }
      );
    }

    const ratePerKg = Number(body.rate_per_kg);
    const minRate = Number(body.min_rate);
    if (Number.isNaN(ratePerKg) || Number.isNaN(minRate)) {
      return NextResponse.json(
        { success: false, error: 'Rate values must be valid numbers' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO freight_rates (transport_id, from_city, to_city, rate_per_kg, min_rate, vehicle_type, status)
      VALUES (
        ${transportId},
        ${body.from_city},
        ${body.to_city},
        ${ratePerKg},
        ${minRate},
        ${body.vehicle_type || ''},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating freight rate', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
