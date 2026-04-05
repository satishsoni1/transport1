import { NextResponse } from 'next/server';
import { ensureSchema, parseJsonField, sql } from '@/lib/db';

function normalizeDate(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const lrNo = String(searchParams.get('lr_no') || '').trim();

    if (!lrNo) {
      return NextResponse.json(
        { success: false, error: 'LR number is required' },
        { status: 400 }
      );
    }

    const { rows: lrRows } = await sql`
      SELECT *
      FROM lr_entries
      WHERE UPPER(BTRIM(lr_no)) = UPPER(BTRIM(${lrNo}))
      LIMIT 1
    `;

    if (!lrRows.length) {
      return NextResponse.json(
        { success: false, error: 'LR not found' },
        { status: 404 }
      );
    }

    const lr = {
      ...lrRows[0],
      goods_items: parseJsonField<any[]>(lrRows[0].goods_items, []),
    };

    const [consignorRes, consigneeRes, challanRes, invoiceRes, receiptRows] = await Promise.all([
      sql`SELECT * FROM consignors WHERE id = ${lr.consignor_id} LIMIT 1`,
      sql`SELECT * FROM consignees WHERE id = ${lr.consignee_id} LIMIT 1`,
      sql`
        SELECT *
        FROM challans
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements(challans.lr_list) AS lr_item
          WHERE UPPER(BTRIM(COALESCE(lr_item->>'lr_no', ''))) = UPPER(BTRIM(${lr.lr_no}))
        )
        ORDER BY id DESC
        LIMIT 1
      `,
      sql`
        SELECT *
        FROM invoices
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements(invoices.items) AS invoice_item
          WHERE UPPER(BTRIM(COALESCE(invoice_item->>'lr_no', ''))) = UPPER(BTRIM(${lr.lr_no}))
        )
        ORDER BY id DESC
        LIMIT 1
      `,
      sql`SELECT * FROM receipts ORDER BY id DESC`,
    ]);

    const consignor = consignorRes.rows[0] || null;
    const consignee = consigneeRes.rows[0] || null;
    const challan = challanRes.rows[0]
      ? { ...challanRes.rows[0], lr_list: parseJsonField<any[]>(challanRes.rows[0].lr_list, []) }
      : null;
    const invoice = invoiceRes.rows[0]
      ? {
          ...invoiceRes.rows[0],
          items: parseJsonField<any[]>(invoiceRes.rows[0].items, []),
          additional_charges: parseJsonField<any[]>(invoiceRes.rows[0].additional_charges, []),
        }
      : null;

    const receiptList = receiptRows.rows
      .map((row) => ({ ...row, items: parseJsonField<any[]>(row.items, []) }))
      .filter((row) =>
        invoice?.invoice_no
          ? row.items.some(
              (item) =>
                String(item?.invoice_no || '').trim().toUpperCase() ===
                String(invoice.invoice_no || '').trim().toUpperCase()
            )
          : false
      );

    const matchedReceipt = receiptList[0] || null;
    const matchedReceiptItem =
      matchedReceipt?.items.find(
        (item) =>
          String(item?.invoice_no || '').trim().toUpperCase() ===
          String(invoice?.invoice_no || '').trim().toUpperCase()
      ) || null;

    const totalCases = (lr.goods_items || []).reduce(
      (sum, item) => sum + (Number(item?.qty) || 0),
      0
    );
    const goodsValue = (lr.goods_items || []).reduce(
      (sum, item) => sum + (Number(item?.amount) || 0),
      0
    );

    return NextResponse.json(
      {
        lr: {
          ...lr,
          lr_date: normalizeDate(lr.lr_date),
          goods_value: goodsValue,
          total_cases: totalCases,
        },
        consignor,
        consignee,
        challan: challan
          ? {
              ...challan,
              challan_date: normalizeDate(challan.challan_date),
            }
          : null,
        invoice: invoice
          ? {
              ...invoice,
              invoice_date: normalizeDate(invoice.invoice_date),
            }
          : null,
        receipt: matchedReceipt
          ? {
              ...matchedReceipt,
              receipt_date: normalizeDate(matchedReceipt.receipt_date),
              cheque_date: normalizeDate(matchedReceipt.cheque_date),
              matched_amount: Number(matchedReceiptItem?.amount_received || 0),
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching LR search details', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
