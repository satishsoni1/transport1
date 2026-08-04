import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const DEFAULTS = {
  email_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  whatsapp_enabled: false,
  whatsapp_phone_number_id: '',
  whatsapp_access_token: '',
  notify_lr_created: false,
  notify_invoice_created: false,
  notify_receipt_created: false,
  notify_challan_created: false,
  notify_consignor: true,
  notify_consignee: true,
  notify_compliance_expiry: false,
};

async function requireNotificationSettingsAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'app-settings')) {
    return { ok: false as const, error: 'Your role does not permit managing notification settings', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

export async function GET(request: NextRequest) {
  const auth = await requireNotificationSettingsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT * FROM notification_settings WHERE transport_id = ${auth.transportId} LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ transport_id: auth.transportId, ...DEFAULTS }, { status: 200 });
    }
    // Never send the stored SMTP/WhatsApp secrets back to the client in plaintext for display —
    // the settings form only needs to know whether a value is already set.
    const row = rows[0];
    return NextResponse.json(
      {
        ...row,
        smtp_password: row.smtp_password ? '••••••••' : '',
        whatsapp_access_token: row.whatsapp_access_token ? '••••••••' : '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notification settings', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireNotificationSettingsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const body = await request.json();

    const { rows: existingRows } = await sql`
      SELECT * FROM notification_settings WHERE transport_id = ${auth.transportId} LIMIT 1
    `;
    const existing = existingRows[0] || { ...DEFAULTS };

    // Masked-secret sentinel from the GET response means "leave unchanged" — never overwrite
    // a real stored secret with the placeholder if the form was submitted without editing it.
    const smtpPassword = body.smtp_password === '••••••••' ? existing.smtp_password : body.smtp_password ?? existing.smtp_password;
    const whatsappToken =
      body.whatsapp_access_token === '••••••••' ? existing.whatsapp_access_token : body.whatsapp_access_token ?? existing.whatsapp_access_token;

    const values = {
      email_enabled: Boolean(body.email_enabled),
      smtp_host: String(body.smtp_host ?? existing.smtp_host ?? ''),
      smtp_port: Number(body.smtp_port ?? existing.smtp_port) || 587,
      smtp_username: String(body.smtp_username ?? existing.smtp_username ?? ''),
      smtp_password: String(smtpPassword ?? ''),
      smtp_from_email: String(body.smtp_from_email ?? existing.smtp_from_email ?? ''),
      smtp_from_name: String(body.smtp_from_name ?? existing.smtp_from_name ?? ''),
      whatsapp_enabled: Boolean(body.whatsapp_enabled),
      whatsapp_phone_number_id: String(body.whatsapp_phone_number_id ?? existing.whatsapp_phone_number_id ?? ''),
      whatsapp_access_token: String(whatsappToken ?? ''),
      notify_lr_created: Boolean(body.notify_lr_created),
      notify_invoice_created: Boolean(body.notify_invoice_created),
      notify_receipt_created: Boolean(body.notify_receipt_created),
      notify_challan_created: Boolean(body.notify_challan_created),
      notify_consignor: body.notify_consignor === undefined ? Boolean(existing.notify_consignor ?? true) : Boolean(body.notify_consignor),
      notify_consignee: body.notify_consignee === undefined ? Boolean(existing.notify_consignee ?? true) : Boolean(body.notify_consignee),
      notify_compliance_expiry: Boolean(body.notify_compliance_expiry),
    };

    let rows;
    if (existingRows.length > 0) {
      ({ rows } = await sql`
        UPDATE notification_settings SET
          email_enabled = ${values.email_enabled},
          smtp_host = ${values.smtp_host},
          smtp_port = ${values.smtp_port},
          smtp_username = ${values.smtp_username},
          smtp_password = ${values.smtp_password},
          smtp_from_email = ${values.smtp_from_email},
          smtp_from_name = ${values.smtp_from_name},
          whatsapp_enabled = ${values.whatsapp_enabled},
          whatsapp_phone_number_id = ${values.whatsapp_phone_number_id},
          whatsapp_access_token = ${values.whatsapp_access_token},
          notify_lr_created = ${values.notify_lr_created},
          notify_invoice_created = ${values.notify_invoice_created},
          notify_receipt_created = ${values.notify_receipt_created},
          notify_challan_created = ${values.notify_challan_created},
          notify_consignor = ${values.notify_consignor},
          notify_consignee = ${values.notify_consignee},
          notify_compliance_expiry = ${values.notify_compliance_expiry},
          updated_at = NOW()
        WHERE transport_id = ${auth.transportId}
        RETURNING *
      `);
    } else {
      ({ rows } = await sql`
        INSERT INTO notification_settings (
          transport_id, email_enabled, smtp_host, smtp_port, smtp_username, smtp_password,
          smtp_from_email, smtp_from_name, whatsapp_enabled, whatsapp_phone_number_id, whatsapp_access_token,
          notify_lr_created, notify_invoice_created, notify_receipt_created, notify_challan_created,
          notify_consignor, notify_consignee, notify_compliance_expiry
        )
        VALUES (
          ${auth.transportId}, ${values.email_enabled}, ${values.smtp_host}, ${values.smtp_port},
          ${values.smtp_username}, ${values.smtp_password}, ${values.smtp_from_email}, ${values.smtp_from_name},
          ${values.whatsapp_enabled}, ${values.whatsapp_phone_number_id}, ${values.whatsapp_access_token},
          ${values.notify_lr_created}, ${values.notify_invoice_created}, ${values.notify_receipt_created}, ${values.notify_challan_created},
          ${values.notify_consignor}, ${values.notify_consignee}, ${values.notify_compliance_expiry}
        )
        RETURNING *
      `);
    }

    return NextResponse.json(
      { ...rows[0], smtp_password: rows[0].smtp_password ? '••••••••' : '', whatsapp_access_token: rows[0].whatsapp_access_token ? '••••••••' : '' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating notification settings', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
