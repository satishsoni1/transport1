import nodemailer from 'nodemailer';
import { sql } from '@/lib/db';

export interface SendEmailInput {
  transportId: number | null;
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult = { sent: true } | { sent: false; reason: string };

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

function platformFallbackConfig(): SmtpConfig | null {
  const host = process.env.PLATFORM_SMTP_HOST || '';
  const fromEmail = process.env.PLATFORM_SMTP_FROM_EMAIL || '';
  if (!host || !fromEmail) return null;
  return {
    host,
    port: Number(process.env.PLATFORM_SMTP_PORT || 587),
    username: process.env.PLATFORM_SMTP_USERNAME || '',
    password: process.env.PLATFORM_SMTP_PASSWORD || '',
    fromEmail,
    fromName: process.env.PLATFORM_SMTP_FROM_NAME || 'Trimurti TMS',
  };
}

async function resolveSmtpConfig(transportId: number | null): Promise<SmtpConfig | null> {
  if (transportId) {
    const { rows } = await sql`
      SELECT * FROM notification_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const settings = rows[0];
    if (settings?.email_enabled && settings.smtp_host && settings.smtp_from_email) {
      return {
        host: settings.smtp_host,
        port: Number(settings.smtp_port) || 587,
        username: settings.smtp_username || '',
        password: settings.smtp_password || '',
        fromEmail: settings.smtp_from_email,
        fromName: settings.smtp_from_name || '',
      };
    }
  }
  return platformFallbackConfig();
}

/**
 * Sends via the transport's own SMTP config if configured and enabled, otherwise falls
 * back to platform-level SMTP env vars (so forgot-password works before a tenant sets up
 * their own email, and for the super admin who has no transport). Never throws — callers
 * (password reset now, document-notification triggers later) should degrade gracefully.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = await resolveSmtpConfig(input.transportId);
  if (!config) {
    return { sent: false, reason: 'No email configuration available for this transport' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.username ? { user: config.username, pass: config.password } : undefined,
    });

    await transporter.sendMail({
      from: config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    return { sent: true };
  } catch (error) {
    console.error('Error sending email', error);
    return { sent: false, reason: error instanceof Error ? error.message : 'Unknown email error' };
  }
}
