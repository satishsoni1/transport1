import { NextResponse } from 'next/server';
import { ensureSchema, parseJsonField, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';

function toResponseRow(row: any) {
  return {
    ...row,
    items: parseJsonField(row.items, []),
    additional_charges: parseJsonField(row.additional_charges, []),
  };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim();
    const status = String(searchParams.get('status') || '').trim();
    const dateFrom = String(searchParams.get('date_from') || '').trim();
    const dateTo = String(searchParams.get('date_to') || '').trim();
    const likeSearch = `%${search}%`;

    const { rows } = await sql`
      SELECT *
      FROM invoices
      WHERE consignor_id = ${consignor.id}
        AND (
          ${search} = ''
          OR invoice_no ILIKE ${likeSearch}
          OR party_name ILIKE ${likeSearch}
        )
        AND (
          ${status} = ''
          OR status = ${status}
        )
        AND (
          ${dateFrom} = ''
          OR invoice_date::date >= ${dateFrom}::date
        )
        AND (
          ${dateTo} = ''
          OR invoice_date::date <= ${dateTo}::date
        )
      ORDER BY invoice_date::date DESC, id DESC
      LIMIT 200
    `;

    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching consignor invoices', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
