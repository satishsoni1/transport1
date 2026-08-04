import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { recordInvoicePayment, verifyRazorpayWebhookSignature } from '@/lib/razorpay-service';

/**
 * Server-to-server Razorpay webhook — the reliability backstop for /api/payments/verify, which
 * depends on the browser staying open long enough to call back after Checkout succeeds. Register
 * this URL + the `payment.captured` event in the Razorpay Dashboard, using the same webhook
 * secret stored in payment_gateway_settings.
 *
 * The webhook secret is per-transport, but we don't know which transport a payload belongs to
 * until we look at it — so we read the (untrusted) order_id first purely to find which
 * transport's secret to verify against, then verify the raw body against that secret before
 * trusting anything else in the payload or taking any action.
 */
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    if (payload?.event !== 'payment.captured') {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 });
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderId = String(paymentEntity?.order_id || '');
    const paymentId = String(paymentEntity?.id || '');
    if (!orderId || !paymentId) {
      return NextResponse.json({ success: false, error: 'Missing order/payment id' }, { status: 400 });
    }

    const { rows: invoiceRows } = await sql`
      SELECT invoices.*, consignors.name AS consignor_name
      FROM invoices
      JOIN consignors ON consignors.id = invoices.consignor_id
      WHERE invoices.razorpay_order_id = ${orderId}
      LIMIT 1
    `;
    if (invoiceRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching invoice for this order' }, { status: 404 });
    }
    const invoice = invoiceRows[0];

    const { rows: settingsRows } = await sql`
      SELECT webhook_secret FROM payment_gateway_settings WHERE transport_id = ${invoice.transport_id} LIMIT 1
    `;
    const webhookSecret = settingsRows[0]?.webhook_secret || '';
    if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
    }

    const amountPaise = Number(paymentEntity.amount) || 0;
    await recordInvoicePayment({
      invoiceId: invoice.id,
      transportId: invoice.transport_id,
      consignorId: invoice.consignor_id,
      consignorName: invoice.consignor_name,
      invoiceNo: invoice.invoice_no,
      paymentId,
      amountRupees: amountPaise / 100,
      source: 'webhook',
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling Razorpay webhook', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
