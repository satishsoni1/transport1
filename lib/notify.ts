import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email-service';
import { sendWhatsAppMessage } from '@/lib/whatsapp-service';

type DocumentType = 'lr' | 'invoice' | 'receipt' | 'challan';

const DOC_TOGGLE_COLUMN: Record<DocumentType, string> = {
  lr: 'notify_lr_created',
  invoice: 'notify_invoice_created',
  receipt: 'notify_receipt_created',
  challan: 'notify_challan_created',
};

export interface NotifyDocumentCreatedInput {
  transportId: number;
  docType: DocumentType;
  consignorEmail?: string | null;
  consigneeEmail?: string | null;
  consignorMobile?: string | null;
  consigneeMobile?: string | null;
  subject: string;
  html: string;
  /** Plain-text version used for WhatsApp; falls back to a stripped version of subject if omitted. */
  text?: string;
}

/**
 * Fires the actual email + WhatsApp send for a newly created LR/Invoice/Receipt/Challan, gated
 * by the per-transport notification_settings toggles set up in the notifications settings page.
 * Never throws — a notification failure must never fail the document-creation request.
 */
export async function notifyDocumentCreated(input: NotifyDocumentCreatedInput) {
  try {
    const { rows } = await sql`
      SELECT * FROM notification_settings WHERE transport_id = ${input.transportId} LIMIT 1
    `;
    const settings = rows[0];
    if (!settings) return;
    if (!settings[DOC_TOGGLE_COLUMN[input.docType]]) return;

    const emailRecipients: string[] = [];
    const whatsappRecipients: string[] = [];
    if (settings.notify_consignor) {
      if (input.consignorEmail) emailRecipients.push(input.consignorEmail);
      if (input.consignorMobile) whatsappRecipients.push(input.consignorMobile);
    }
    if (settings.notify_consignee) {
      if (input.consigneeEmail) emailRecipients.push(input.consigneeEmail);
      if (input.consigneeMobile) whatsappRecipients.push(input.consigneeMobile);
    }

    if (settings.email_enabled) {
      for (const to of emailRecipients) {
        await sendEmail({ transportId: input.transportId, to, subject: input.subject, html: input.html });
      }
    }

    if (settings.whatsapp_enabled) {
      const message = input.text || input.subject;
      for (const to of whatsappRecipients) {
        await sendWhatsAppMessage({ transportId: input.transportId, to, message });
      }
    }
  } catch (error) {
    console.error('Error sending document notification', error);
  }
}
