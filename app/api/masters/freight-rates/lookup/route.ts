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

    const { searchParams } = new URL(request.url);
    const consignorId = Number(searchParams.get('consignor_id') || 0);
    const cityName = String(searchParams.get('city_name') || '').trim();

    if (!consignorId) {
      return NextResponse.json(null, { status: 200 });
    }

    if (cityName) {
      const { rows } = await sql`
        SELECT city_name, rate_10kg, rate_20kg, rate_30kg, rate_40kg, rate_50kg, rate_above_50kg
        FROM freight_rates
        WHERE transport_id = ${transportId}
          AND consignor_id = ${consignorId}
          AND LOWER(city_name) = LOWER(${cityName})
        LIMIT 1
      `;
      if (rows.length === 0) return NextResponse.json(null, { status: 200 });
      return NextResponse.json({
        rate_10kg: Number(rows[0].rate_10kg) || 0,
        rate_20kg: Number(rows[0].rate_20kg) || 0,
        rate_30kg: Number(rows[0].rate_30kg) || 0,
        rate_40kg: Number(rows[0].rate_40kg) || 0,
        rate_50kg: Number(rows[0].rate_50kg) || 0,
        rate_above_50kg: Number(rows[0].rate_above_50kg) || 0,
      }, { status: 200 });
    }

    const { rows: allRows } = await sql`
      SELECT city_name, rate_10kg, rate_20kg, rate_30kg, rate_40kg, rate_50kg, rate_above_50kg
      FROM freight_rates
      WHERE transport_id = ${transportId}
        AND consignor_id = ${consignorId}
        AND city_name <> ''
    `;
    const map: Record<string, { rate_10kg: number; rate_20kg: number; rate_30kg: number; rate_40kg: number; rate_50kg: number; rate_above_50kg: number }> = {};
    for (const r of allRows) {
      map[String(r.city_name).toLowerCase()] = {
        rate_10kg: Number(r.rate_10kg) || 0,
        rate_20kg: Number(r.rate_20kg) || 0,
        rate_30kg: Number(r.rate_30kg) || 0,
        rate_40kg: Number(r.rate_40kg) || 0,
        rate_50kg: Number(r.rate_50kg) || 0,
        rate_above_50kg: Number(r.rate_above_50kg) || 0,
      };
    }
    return NextResponse.json(map, { status: 200 });
  } catch (error) {
    console.error('Error looking up freight rate', error);
    return NextResponse.json(null, { status: 200 });
  }
}
