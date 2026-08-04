import { sql } from '@/lib/db';

export interface SendWhatsAppInput {
  transportId: number;
  to: string;
  message: string;
}

export type SendWhatsAppResult = { sent: true } | { sent: false; reason: string };

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

async function resolveWhatsAppConfig(transportId: number): Promise<WhatsAppConfig | null> {
  const { rows } = await sql`
    SELECT * FROM notification_settings WHERE transport_id = ${transportId} LIMIT 1
  `;
  const settings = rows[0];
  if (!settings?.whatsapp_enabled || !settings.whatsapp_phone_number_id || !settings.whatsapp_access_token) {
    return null;
  }
  return {
    phoneNumberId: settings.whatsapp_phone_number_id,
    accessToken: settings.whatsapp_access_token,
  };
}

/** Normalizes to E.164-ish digits-only with country code, defaulting to India (91) for 10-digit numbers. */
function normalizeWhatsAppNumber(raw: string) {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Sends a WhatsApp text message via the Meta (WhatsApp Business) Cloud API, using the
 * per-transport phone_number_id/access_token stored in notification_settings. Mirrors
 * lib/email-service.ts: never throws, always resolves to a {sent, reason?} result so
 * callers (lib/notify.ts, the test-send endpoint) can degrade gracefully.
 */
export async function sendWhatsAppMessage(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const config = await resolveWhatsAppConfig(input.transportId);
  if (!config) {
    return { sent: false, reason: 'WhatsApp is not configured or not enabled for this transport' };
  }

  const to = normalizeWhatsAppNumber(input.to);
  if (!to) {
    return { sent: false, reason: 'Recipient has no usable mobile number' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: input.message },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const reason = errorBody?.error?.message || `WhatsApp API returned ${response.status}`;
      console.error('Error sending WhatsApp message', reason);
      return { sent: false, reason };
    }

    return { sent: true };
  } catch (error) {
    console.error('Error sending WhatsApp message', error);
    return { sent: false, reason: error instanceof Error ? error.message : 'Unknown WhatsApp error' };
  }
}
