import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';
import {
  fetchRazorpayPayment,
  recordInvoicePayment,
  resolveRazorpayConfig,
  verifyRazorpayPaymentSignature,
} from '@/lib/razorpay-service';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const body = await request.json();
    const invoiceId = Number(body.invoice_id);
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    if (!invoiceId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ success: false, error: 'Missing payment verification fields' }, { status: 400 });
    }

    const { rows: invoiceRows } = await sql`
      SELECT * FROM invoices WHERE id = ${invoiceId} AND consignor_id = ${consignor.id}
    `;
    if (invoiceRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceRows[0];
    if (invoice.razorpay_order_id !== orderId) {
      return NextResponse.json({ success: false, error: 'Order does not match this invoice' }, { status: 400 });
    }
    // Already processed (e.g. the webhook beat the client callback) — idempotent no-op.
    if (invoice.razorpay_payment_id === paymentId && invoice.online_payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Payment already recorded' }, { status: 200 });
    }

    const config = await resolveRazorpayConfig(consignor.transport_id);
    if (!config) {
      return NextResponse.json({ success: false, error: 'Online payment is not enabled' }, { status: 400 });
    }

    const validSignature = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
      keySecret: config.keySecret,
    });
    if (!validSignature) {
      return NextResponse.json({ success: false, error: 'Payment signature verification failed' }, { status: 400 });
    }

    // Don't trust client-supplied amount — the Checkout signature only covers order_id|payment_id.
    const payment = await fetchRazorpayPayment(paymentId, config);
    if (!payment.ok) {
      return NextResponse.json({ success: false, error: payment.reason }, { status: 502 });
    }
    if (payment.orderId !== orderId || (payment.status !== 'captured' && payment.status !== 'authorized')) {
      return NextResponse.json({ success: false, error: 'Payment is not in a completed state' }, { status: 400 });
    }

    await recordInvoicePayment({
      invoiceId,
      transportId: consignor.transport_id,
      consignorId: consignor.id,
      consignorName: consignor.name,
      invoiceNo: invoice.invoice_no,
      paymentId,
      amountRupees: payment.amountPaise / 100,
      source: 'client',
    });

    return NextResponse.json({ success: true, message: 'Payment recorded successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error verifying payment', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
