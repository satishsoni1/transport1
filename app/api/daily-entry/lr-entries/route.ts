import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { requireTransportAuth } from '@/lib/transport-auth';

function toResponseRow(row: any) {
  return {
    ...row,
    goods_items: parseJsonField(row.goods_items, []),
  };
}

const LR_STATUSES = new Set(['to_pay', 'paid', 'tbb']);
const POD_FILTERS = new Set(['received', 'pending', 'godown', 'transit']);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    
    // Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim();
    const dateFrom = String(searchParams.get('date_from') || '').trim();
    const dateTo = String(searchParams.get('date_to') || '').trim();
    const consignorIdRaw = String(searchParams.get('consignor_id') || '').trim();
    const consigneeIdRaw = String(searchParams.get('consignee_id') || '').trim();
    const status = String(searchParams.get('status') || '').trim();
    const pod = String(searchParams.get('pod') || '').trim();

    const consignorIdNum = consignorIdRaw ? Number(consignorIdRaw) : NaN;
    const consigneeIdNum = consigneeIdRaw ? Number(consigneeIdRaw) : NaN;
    const hasConsignorFilter = Number.isFinite(consignorIdNum) && consignorIdNum > 0;
    const hasConsigneeFilter = Number.isFinite(consigneeIdNum) && consigneeIdNum > 0;
    /** Never bind NaN to PG (breaks integer compare); use 0 when the filter is off. */
    const consignorIdForQuery = hasConsignorFilter ? consignorIdNum : 0;
    const consigneeIdForQuery = hasConsigneeFilter ? consigneeIdNum : 0;
    const hasStatusFilter = status !== '' && LR_STATUSES.has(status);
    const hasPodFilter = pod !== '' && POD_FILTERS.has(pod);

    const hasFilters =
      search !== '' ||
      dateFrom !== '' ||
      dateTo !== '' ||
      hasConsignorFilter ||
      hasConsigneeFilter ||
      hasStatusFilter ||
      hasPodFilter;

    if (!hasFilters) {
      const { rows } = await sql`
        SELECT * FROM lr_entries 
        WHERE transport_id = ${transportId}
        ORDER BY id DESC
      `;
      return NextResponse.json(rows.map(toResponseRow), { status: 200 });
    }

    const likeSearch = `%${search}%`;

    const { rows } = await sql`
      SELECT lr_entries.*
      FROM lr_entries
      LEFT JOIN consignors ON consignors.id = lr_entries.consignor_id
      LEFT JOIN consignees ON consignees.id = lr_entries.consignee_id
      WHERE
        lr_entries.transport_id = ${transportId}
        AND (
          ${search} = ''
          OR lr_entries.lr_no ILIKE ${likeSearch}
          OR lr_entries.invoice_no ILIKE ${likeSearch}
          OR consignors.name ILIKE ${likeSearch}
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
          ${hasConsignorFilter ? 0 : 1} = 1
          OR lr_entries.consignor_id = ${consignorIdForQuery}
        )
        AND (
          ${hasConsigneeFilter ? 0 : 1} = 1
          OR lr_entries.consignee_id = ${consigneeIdForQuery}
        )
        AND (
          ${hasStatusFilter ? 0 : 1} = 1
          OR lr_entries.status = ${status}
        )
        AND (
          ${hasPodFilter ? 0 : 1} = 1
          OR (${pod} = 'received' AND lr_entries.pod_received = TRUE)
          OR (${pod} = 'pending' AND lr_entries.pod_received = FALSE)
          OR (
            ${pod} = 'transit'
            AND lr_entries.pod_received = FALSE
            AND EXISTS (
              SELECT 1
              FROM challans
              WHERE challans.transport_id = ${transportId}
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(challans.lr_list) AS lr_item
                WHERE UPPER(BTRIM(COALESCE(lr_item->>'lr_no', ''))) = UPPER(BTRIM(lr_entries.lr_no))
              )
            )
          )
          OR (
            ${pod} = 'godown'
            AND lr_entries.pod_received = FALSE
            AND NOT EXISTS (
              SELECT 1
              FROM challans
              WHERE challans.transport_id = ${transportId}
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(challans.lr_list) AS lr_item
                WHERE UPPER(BTRIM(COALESCE(lr_item->>'lr_no', ''))) = UPPER(BTRIM(lr_entries.lr_no))
              )
            )
          )
        )
      ORDER BY lr_entries.lr_date DESC, lr_entries.id DESC
      LIMIT 200
    `;

    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching LR entries', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    
    // Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    const body = await request.json();
    const invoiceNo = String(body.invoice_no || '').trim();

    if (!body.consignor_id || !body.consignee_id) {
      return NextResponse.json(
        { success: false, error: 'Consignor and consignee are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.goods_items) || body.goods_items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one goods detail row is required' },
        { status: 400 }
      );
    }

    if (body.goods_items.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Only 5 goods rows are allowed in one LR' },
        { status: 400 }
      );
    }

    if (invoiceNo) {
      const { rows: duplicateRows } = await sql`
        SELECT id
        FROM lr_entries
        WHERE transport_id = ${transportId}
        AND LOWER(BTRIM(invoice_no)) = LOWER(BTRIM(${invoiceNo}))
        LIMIT 1
      `;
      if (duplicateRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This invoice no is already in use' },
          { status: 400 }
        );
      }
    }

    const freight = Number(body.freight) || 0;
    const hamali = Number(body.hamali) || 0;
    const lrCharge = Number(body.lr_charge) || 0;
    const advance = Number(body.advance) || 0;
    const balance = freight + hamali + lrCharge - advance;

    // Get next LR number using per-transport sequence
    const { rows: lrNumberRows } = await sql`
      SELECT get_next_lr_number_for_transport(${transportId}) AS lr_no
    `;
    const lrNo = String(lrNumberRows[0]?.lr_no || '');

    // Generate a unique ID for internal use (still needed for referencing)
    const { rows: idRows } = await sql`
      SELECT COALESCE(MAX(id) + 1, 1) as next_id 
      FROM lr_entries 
      WHERE transport_id = ${transportId}
    `;
    const lrId = Number(idRows[0]?.next_id || 1);

    const { rows } = await sql`
      INSERT INTO lr_entries (
        id, lr_no, lr_date, transport_id, consignor_id, consignee_id, from_city, to_city, delivery_address,
        freight, hamali, lr_charge, advance, balance, invoice_no, invoice_date, truck_no,
        driver_name, driver_mobile, eway_no, remarks, return_status, return_remark, pod_received, goods_items, status, created_by
      )
      VALUES (
        ${lrId},
        ${lrNo},
        NOW(),
        ${transportId},
        ${Number(body.consignor_id)},
        ${Number(body.consignee_id)},
        ${body.from_city || ''},
        ${body.to_city || ''},
        ${body.delivery_address || ''},
        ${freight},
        ${hamali},
        ${lrCharge},
        ${advance},
        ${balance},
        ${invoiceNo},
        ${body.invoice_date || ''},
        ${body.truck_no || ''},
        ${body.driver_name || ''},
        ${body.driver_mobile || ''},
        ${body.eway_no || ''},
        ${body.remarks || ''},
        ${body.return_status === 'returned' ? 'returned' : 'normal'},
        ${body.return_remark || ''},
        ${Boolean(body.pod_received)},
        ${JSON.stringify(Array.isArray(body.goods_items) ? body.goods_items : [])}::jsonb,
        ${body.status === 'paid' || body.status === 'tbb' ? body.status : 'to_pay'},
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;

    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating LR entry', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
