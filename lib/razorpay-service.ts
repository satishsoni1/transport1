import { createHmac, timingSafeEqual } from 'crypto';
import { sql } from '@/lib/db';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export async function resolveRazorpayConfig(transportId: number): Promise<RazorpayConfig | null> {
  const { rows } = await sql`
    SELECT * FROM payment_gateway_settings WHERE transport_id = ${transportId} LIMIT 1
  `;
  const settings = rows[0];
  if (!settings?.enabled || !settings.key_id || !settings.key_secret) return null;
  return {
    keyId: settings.key_id,
    keySecret: settings.key_secret,
    webhookSecret: settings.webhook_secret || '',
  };
}

export type CreateOrderResult =
  | { ok: true; orderId: string; amountPaise: number; currency: string }
  | { ok: false; reason: string };

/**
 * Creates a Razorpay Order via the REST API (Basic Auth with key_id:key_secret — no SDK
 * dependency needed, Razorpay's API is plain REST). `receipt` is our own invoice_no, used
 * as Razorpay's idempotency/reference field, not a real HTTP receipt.
 */
export async function createRazorpayOrder(input: {
  transportId: number;
  amountRupees: number;
  receipt: string;
}): Promise<CreateOrderResult> {
  const config = await resolveRazorpayConfig(input.transportId);
  if (!config) {
    return { ok: false, reason: 'Razorpay is not configured or not enabled for this transport' };
  }
  if (!(input.amountRupees > 0)) {
    return { ok: false, reason: 'Amount must be greater than zero' };
  }

  const amountPaise = Math.round(input.amountRupees * 100);
  const basicAuth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: input.receipt,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.id) {
      const reason = data?.error?.description || `Razorpay API returned ${response.status}`;
      console.error('Error creating Razorpay order', reason);
      return { ok: false, reason };
    }

    return { ok: true, orderId: data.id, amountPaise, currency: 'INR' };
  } catch (error) {
    console.error('Error creating Razorpay order', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown Razorpay error' };
  }
}

/** Verifies the signature returned by Razorpay Checkout after a successful client-side payment. */
export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = createHmac('sha256', input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(input.signature || '', 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export type FetchPaymentResult =
  | { ok: true; amountPaise: number; status: string; orderId: string }
  | { ok: false; reason: string };

/**
 * Fetches the authoritative payment record from Razorpay's server-to-server API. The Checkout
 * signature only covers order_id|payment_id, not the amount — so both the client-verify and
 * webhook flows must re-fetch the real captured amount here rather than trusting anything the
 * browser sent, otherwise a tampered client could under-report the amount paid.
 */
export async function fetchRazorpayPayment(paymentId: string, config: RazorpayConfig): Promise<FetchPaymentResult> {
  const basicAuth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.id) {
      return { ok: false, reason: data?.error?.description || `Razorpay API returned ${response.status}` };
    }
    return { ok: true, amountPaise: Number(data.amount) || 0, status: String(data.status || ''), orderId: String(data.order_id || '') };
  } catch (error) {
    console.error('Error fetching Razorpay payment', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown Razorpay error' };
  }
}

/** Verifies the X-Razorpay-Signature header on incoming webhook calls against the raw request body. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret) return false;
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature || '', 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Records a captured Razorpay payment against an invoice: creates a matching receipt for the
 * accounting ledger and flags the invoice as paid. Idempotent on `payment_id` — both the
 * client-verify endpoint and the webhook call this, and either one may arrive first.
 */
export async function recordInvoicePayment(input: {
  invoiceId: number;
  transportId: number;
  consignorId: number;
  consignorName: string;
  invoiceNo: string;
  paymentId: string;
  amountRupees: number;
  source: 'client' | 'webhook';
}) {
  const { rows: existing } = await sql`
    SELECT id FROM invoices WHERE id = ${input.invoiceId} AND razorpay_payment_id = ${input.paymentId} AND online_payment_status = 'paid'
  `;
  if (existing.length > 0) return { alreadyRecorded: true };

  const { rows: seqRows } = await sql`SELECT get_next_doc_number(${input.transportId}, 'receipt') AS seq`;
  const receiptNo = `RCP${String(Number(seqRows[0].seq)).padStart(5, '0')}`;

  await sql`
    INSERT INTO receipts (
      transport_id, receipt_no, receipt_date, party_name, consignor_id, mode, remarks,
      items, total_amount, received_amount, receipt_type, status, created_by
    )
    VALUES (
      ${input.transportId},
      ${receiptNo},
      ${new Date().toISOString().slice(0, 10)},
      ${input.consignorName},
      ${input.consignorId},
      'online',
      ${`Razorpay payment ${input.paymentId} (recorded via ${input.source})`},
      ${JSON.stringify([{ invoice_no: input.invoiceNo, amount_received: input.amountRupees }])}::jsonb,
      ${input.amountRupees},
      ${input.amountRupees},
      'invoice',
      'confirmed',
      'Online Payment (Razorpay)'
    )
  `;

  await sql`
    UPDATE invoices SET razorpay_payment_id = ${input.paymentId}, online_payment_status = 'paid'
    WHERE id = ${input.invoiceId}
  `;

  return { alreadyRecorded: false };
}
