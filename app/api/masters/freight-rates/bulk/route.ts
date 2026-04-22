import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

interface RatePayload {
  city_name: string;
  rate_10kg?: number;
  rate_20kg?: number;
  rate_30kg?: number;
  rate_40kg?: number;
  rate_50kg?: number;
  rate_above_50kg?: number;
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const consignorId = Number(body.consignor_id);
    const routeId = Number(body.route_id);
    const rates: RatePayload[] = Array.isArray(body.rates) ? body.rates : [];

    if (!consignorId || !routeId) {
      return NextResponse.json(
        { success: false, error: 'consignor_id and route_id are required' },
        { status: 400 }
      );
    }

    for (const r of rates) {
      const cityName = String(r.city_name || '').trim();
      if (!cityName) continue;
      const r10 = Number(r.rate_10kg) || 0;
      const r20 = Number(r.rate_20kg) || 0;
      const r30 = Number(r.rate_30kg) || 0;
      const r40 = Number(r.rate_40kg) || 0;
      const r50 = Number(r.rate_50kg) || 0;
      const rAbove = Number(r.rate_above_50kg) || 0;

      await sql`
        INSERT INTO freight_rates
          (consignor_id, route_id, city_name, rate_10kg, rate_20kg, rate_30kg, rate_40kg, rate_50kg, rate_above_50kg, from_city, to_city, rate_per_kg, min_rate)
        VALUES
          (${consignorId}, ${routeId}, ${cityName}, ${r10}, ${r20}, ${r30}, ${r40}, ${r50}, ${rAbove}, ${cityName}, ${cityName}, 0, 0)
        ON CONFLICT ON CONSTRAINT freight_rates_consignor_route_city_key
        DO UPDATE SET
          rate_10kg = EXCLUDED.rate_10kg,
          rate_20kg = EXCLUDED.rate_20kg,
          rate_30kg = EXCLUDED.rate_30kg,
          rate_40kg = EXCLUDED.rate_40kg,
          rate_50kg = EXCLUDED.rate_50kg,
          rate_above_50kg = EXCLUDED.rate_above_50kg
      `;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving freight rates bulk', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const consignorId = Number(searchParams.get('consignor_id') || 0);
    const routeId = Number(searchParams.get('route_id') || 0);

    if (!consignorId || !routeId) {
      return NextResponse.json([], { status: 200 });
    }

    const { rows } = await sql`
      SELECT city_name, rate_10kg, rate_20kg, rate_30kg, rate_40kg, rate_50kg, rate_above_50kg
      FROM freight_rates
      WHERE consignor_id = ${consignorId} AND route_id = ${routeId}
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching freight rates bulk', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
