import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const transportId = consignor.transport_id;
    if (!transportId) {
      return NextResponse.json(null, { status: 200 });
    }

    const { rows } = await sql`
      SELECT * FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
    `;

    return NextResponse.json(rows[0] || null, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignor settings', error);
    return NextResponse.json(null, { status: 500 });
  }
}
