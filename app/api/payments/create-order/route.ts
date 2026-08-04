import { NextResponse } from 'next/server';
import { ensureSchema, parseJsonField, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';
import { createRazorpayOrder, resolveRazorpayConfig } from '@/lib/razorpay-service';

function computeInvoiceBalance(invoice: any, receiptRows: any[]) {
  let received = 0;
  for (const receipt of receiptRows) {
    const items = parseJsonField<Array<{ invoice_no?: string; amount_received?: number }>>(receipt.items, []);
    for (const item of items) {
      if (String(item.invoice_no || '').trim() === String(invoice.invoice_no || '').trim()) {
        received += Number(item.amount_received) || 0;
      }
    }
  }
  return (Number(invoice.net_amount) || 0) - received;
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const body = await request.json();
    const invoiceId = Number(body.invoice_id);
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'invoice_id is required' }, { status: 400 });
    }

    const { rows: invoiceRows } = await sql`
      SELECT * FROM invoices WHERE id = ${invoiceId} AND consignor_id = ${consignor.id}
    `;
    if (invoiceRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceRows[0];

    const { rows: receiptRows } = await sql`
      SELECT items FROM receipts WHERE consignor_id = ${consignor.id}
    `;
    const balance = computeInvoiceBalance(invoice, receiptRows);
    if (balance <= 0.009) {
      return NextResponse.json({ success: false, error: 'This invoice has no outstanding balance' }, { status: 400 });
    }

    const config = await resolveRazorpayConfig(consignor.transport_id);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Online payment is not enabled for this transport yet' },
        { status: 400 }
      );
    }

    const result = await createRazorpayOrder({
      transportId: consignor.transport_id,
      amountRupees: balance,
      receipt: invoice.invoice_no,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 502 });
    }

    await sql`UPDATE invoices SET razorpay_order_id = ${result.orderId} WHERE id = ${invoiceId}`;

    return NextResponse.json(
      {
        order_id: result.orderId,
        amount_paise: result.amountPaise,
        currency: result.currency,
        key_id: config.keyId,
        invoice_no: invoice.invoice_no,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating payment order', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
