import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

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
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;
    
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
        SELECT lr_entries.*, consignees.name AS consignee_name
        FROM lr_entries
        LEFT JOIN consignees ON consignees.id = lr_entries.consignee_id
        WHERE lr_entries.transport_id = ${transportId}
        ORDER BY lr_entries.id DESC
      `;
      return NextResponse.json(rows.map(toResponseRow), { status: 200 });
    }

    const likeSearch = `%${search}%`;

    const { rows } = await sql`
      SELECT lr_entries.*, consignees.name AS consignee_name
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
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;
    
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

    // Get next LR number. lr_no has a GLOBAL unique constraint (all transports share one
    // namespace), so we check the global max across every row — including legacy rows
    // where transport_id is NULL. The upsert on the sequence row serialises concurrent
    // requests so two callers always get different numbers.
    const { rows: lrSeqRows } = await sql`
      WITH max_lr AS (
        SELECT COALESCE(
          MAX(NULLIF(regexp_replace(lr_no, '[^0-9]', '', 'g'), '')::INTEGER),
          0
        ) AS n
        FROM lr_entries
      )
      INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix, updated_at)
      VALUES (${transportId}, (SELECT n + 2 FROM max_lr), '', NOW())
      ON CONFLICT (id) DO UPDATE
        SET next_lr_number = GREATEST(transport_lr_sequences.next_lr_number, (SELECT n + 1 FROM max_lr)) + 1,
            updated_at     = NOW()
      RETURNING next_lr_number - 1 AS seq_no, COALESCE(lr_prefix, '') AS prefix
    `;
    const seqNo    = Number(lrSeqRows[0]?.seq_no) || 1;
    const lrPrefix = String(lrSeqRows[0]?.prefix || '');
    const lrNo     = lrPrefix + String(seqNo).padStart(5, '0');

    const { rows } = await sql`
      INSERT INTO lr_entries (
        lr_no, lr_date, transport_id, consignor_id, consignee_id, from_city, to_city, delivery_address,
        freight, hamali, lr_charge, advance, balance, invoice_no, invoice_date, truck_no,
        driver_name, driver_mobile, eway_no, remarks, return_status, return_remark, pod_received, goods_items, status, created_by
      )
      VALUES (
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
