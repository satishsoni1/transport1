import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const MASK = '••••••••';

async function requireIntegrationsAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'app-settings')) {
    return { ok: false as const, error: 'Your role does not permit managing integrations', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

export async function GET(request: NextRequest) {
  const auth = await requireIntegrationsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();

    const [{ rows: paymentRows }, { rows: gstRows }, { rows: gpsRows }, { rows: aiRows }] = await Promise.all([
      sql`SELECT * FROM payment_gateway_settings WHERE transport_id = ${auth.transportId} LIMIT 1`,
      sql`SELECT * FROM gst_integration_settings WHERE transport_id = ${auth.transportId} LIMIT 1`,
      sql`SELECT * FROM gps_integration_settings WHERE transport_id = ${auth.transportId} LIMIT 1`,
      sql`SELECT * FROM ai_settings WHERE transport_id = ${auth.transportId} LIMIT 1`,
    ]);
    const payment = paymentRows[0];
    const gst = gstRows[0];
    const gps = gpsRows[0];
    const ai = aiRows[0];

    return NextResponse.json(
      {
        payment: {
          enabled: payment?.enabled || false,
          key_id: payment?.key_id || '',
          key_secret: payment?.key_secret ? MASK : '',
          webhook_secret: payment?.webhook_secret ? MASK : '',
        },
        gst: {
          environment: gst?.environment || 'sandbox',
          api_base_url: gst?.api_base_url || '',
          client_id: gst?.client_id || '',
          client_secret: gst?.client_secret ? MASK : '',
          gstin: gst?.gstin || '',
          eway_bill_enabled: gst?.eway_bill_enabled || false,
          einvoice_enabled: gst?.einvoice_enabled || false,
        },
        gps: {
          enabled: gps?.enabled || false,
          api_base_url: gps?.api_base_url || '',
          client_id: gps?.client_id || '',
          client_secret: gps?.client_secret ? MASK : '',
        },
        ai: {
          enabled: ai?.enabled || false,
          api_key: ai?.api_key ? MASK : '',
          chat_model: ai?.chat_model || 'llama-3.3-70b-versatile',
          vision_model: ai?.vision_model || 'meta-llama/llama-4-scout-17b-16e-instruct',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching integration settings', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireIntegrationsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const { transportId } = auth;

    // --- Payment gateway (Razorpay) ---
    const { rows: existingPaymentRows } = await sql`
      SELECT * FROM payment_gateway_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const existingPayment = existingPaymentRows[0] || {};
    const paymentKeySecret =
      body.payment?.key_secret === MASK ? existingPayment.key_secret || '' : body.payment?.key_secret ?? existingPayment.key_secret ?? '';
    const paymentWebhookSecret =
      body.payment?.webhook_secret === MASK
        ? existingPayment.webhook_secret || ''
        : body.payment?.webhook_secret ?? existingPayment.webhook_secret ?? '';

    if (existingPaymentRows.length > 0) {
      await sql`
        UPDATE payment_gateway_settings SET
          enabled = ${Boolean(body.payment?.enabled)},
          key_id = ${String(body.payment?.key_id ?? existingPayment.key_id ?? '')},
          key_secret = ${paymentKeySecret},
          webhook_secret = ${paymentWebhookSecret},
          updated_at = NOW()
        WHERE transport_id = ${transportId}
      `;
    } else {
      await sql`
        INSERT INTO payment_gateway_settings (transport_id, enabled, key_id, key_secret, webhook_secret)
        VALUES (${transportId}, ${Boolean(body.payment?.enabled)}, ${String(body.payment?.key_id || '')}, ${paymentKeySecret}, ${paymentWebhookSecret})
      `;
    }

    // --- GST GSP (Masters India) ---
    const { rows: existingGstRows } = await sql`
      SELECT * FROM gst_integration_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const existingGst = existingGstRows[0] || {};
    const gstClientSecret =
      body.gst?.client_secret === MASK ? existingGst.client_secret || '' : body.gst?.client_secret ?? existingGst.client_secret ?? '';

    if (existingGstRows.length > 0) {
      await sql`
        UPDATE gst_integration_settings SET
          environment = ${String(body.gst?.environment ?? existingGst.environment ?? 'sandbox')},
          api_base_url = ${String(body.gst?.api_base_url ?? existingGst.api_base_url ?? '')},
          client_id = ${String(body.gst?.client_id ?? existingGst.client_id ?? '')},
          client_secret = ${gstClientSecret},
          gstin = ${String(body.gst?.gstin ?? existingGst.gstin ?? '')},
          eway_bill_enabled = ${Boolean(body.gst?.eway_bill_enabled)},
          einvoice_enabled = ${Boolean(body.gst?.einvoice_enabled)},
          updated_at = NOW()
        WHERE transport_id = ${transportId}
      `;
    } else {
      await sql`
        INSERT INTO gst_integration_settings (
          transport_id, environment, api_base_url, client_id, client_secret, gstin, eway_bill_enabled, einvoice_enabled
        )
        VALUES (
          ${transportId}, ${String(body.gst?.environment || 'sandbox')}, ${String(body.gst?.api_base_url || '')},
          ${String(body.gst?.client_id || '')}, ${gstClientSecret}, ${String(body.gst?.gstin || '')},
          ${Boolean(body.gst?.eway_bill_enabled)}, ${Boolean(body.gst?.einvoice_enabled)}
        )
      `;
    }

    // --- GPS (Mappls) ---
    const { rows: existingGpsRows } = await sql`
      SELECT * FROM gps_integration_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const existingGps = existingGpsRows[0] || {};
    const gpsClientSecret =
      body.gps?.client_secret === MASK ? existingGps.client_secret || '' : body.gps?.client_secret ?? existingGps.client_secret ?? '';

    if (existingGpsRows.length > 0) {
      await sql`
        UPDATE gps_integration_settings SET
          enabled = ${Boolean(body.gps?.enabled)},
          api_base_url = ${String(body.gps?.api_base_url ?? existingGps.api_base_url ?? '')},
          client_id = ${String(body.gps?.client_id ?? existingGps.client_id ?? '')},
          client_secret = ${gpsClientSecret},
          updated_at = NOW()
        WHERE transport_id = ${transportId}
      `;
    } else {
      await sql`
        INSERT INTO gps_integration_settings (transport_id, enabled, api_base_url, client_id, client_secret)
        VALUES (${transportId}, ${Boolean(body.gps?.enabled)}, ${String(body.gps?.api_base_url || '')}, ${String(body.gps?.client_id || '')}, ${gpsClientSecret})
      `;
    }

    // --- AI Assistant (Groq) ---
    const { rows: existingAiRows } = await sql`
      SELECT * FROM ai_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const existingAi = existingAiRows[0] || {};
    const aiApiKey = body.ai?.api_key === MASK ? existingAi.api_key || '' : body.ai?.api_key ?? existingAi.api_key ?? '';

    if (existingAiRows.length > 0) {
      await sql`
        UPDATE ai_settings SET
          enabled = ${Boolean(body.ai?.enabled)},
          api_key = ${aiApiKey},
          chat_model = ${String(body.ai?.chat_model ?? existingAi.chat_model ?? 'llama-3.3-70b-versatile')},
          vision_model = ${String(body.ai?.vision_model ?? existingAi.vision_model ?? 'meta-llama/llama-4-scout-17b-16e-instruct')},
          updated_at = NOW()
        WHERE transport_id = ${transportId}
      `;
    } else {
      await sql`
        INSERT INTO ai_settings (transport_id, enabled, api_key, chat_model, vision_model)
        VALUES (
          ${transportId}, ${Boolean(body.ai?.enabled)}, ${aiApiKey},
          ${String(body.ai?.chat_model || 'llama-3.3-70b-versatile')}, ${String(body.ai?.vision_model || 'meta-llama/llama-4-scout-17b-16e-instruct')}
        )
      `;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating integration settings', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
