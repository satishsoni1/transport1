import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim();
    const dateFrom = String(searchParams.get('date_from') || '').trim();
    const dateTo = String(searchParams.get('date_to') || '').trim();
    const status = String(searchParams.get('status') || '').trim();
    const city = String(searchParams.get('city') || '').trim();
    const pod = String(searchParams.get('pod') || '').trim();

    const likeSearch = `%${search}%`;

    const { rows } = await sql`
      SELECT
        lr_entries.id,
        lr_entries.lr_no,
        lr_entries.lr_date,
        lr_entries.invoice_no,
        lr_entries.from_city,
        lr_entries.to_city,
        lr_entries.delivery_address,
        lr_entries.freight,
        lr_entries.balance,
        lr_entries.remarks,
        lr_entries.return_status,
        lr_entries.return_remark,
        lr_entries.pod_received,
        lr_entries.pod_image_url,
        lr_entries.pod_received_at,
        lr_entries.pod_received_by_driver_name,
        lr_entries.status,
        consignees.name AS consignee_name
      FROM lr_entries
      LEFT JOIN consignees ON consignees.id = lr_entries.consignee_id
      WHERE lr_entries.consignor_id = ${consignor.id}
        AND (
          ${search} = ''
          OR lr_entries.lr_no ILIKE ${likeSearch}
          OR lr_entries.invoice_no ILIKE ${likeSearch}
          OR consignees.name ILIKE ${likeSearch}
        )
        AND (
          ${dateFrom} = ''
          OR lr_entries.lr_date::date >= NULLIF(${dateFrom}, '')::date
        )
        AND (
          ${dateTo} = ''
          OR lr_entries.lr_date::date <= NULLIF(${dateTo}, '')::date
        )
        AND (
          ${status} = ''
          OR lr_entries.status = ${status}
        )
        AND (
          ${city} = ''
          OR lr_entries.to_city ILIKE ${`%${city}%`}
        )
        AND (
          ${pod} = ''
          OR (${pod} = 'received' AND lr_entries.pod_received = TRUE)
          OR (${pod} = 'pending' AND lr_entries.pod_received = FALSE)
        )
      ORDER BY lr_entries.lr_date DESC, lr_entries.id DESC
      LIMIT 200
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignor LRs', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
