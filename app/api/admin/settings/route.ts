import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';

async function getTransportIdFromRequest(request: NextRequest): Promise<number | null> {
  const user = await getAuthenticatedUser(request);
  if (user?.platformRole === 'transport_admin' && user.transportId) {
    return user.transportId;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const transportId = await getTransportIdFromRequest(request);

    if (transportId !== null) {
      // Return this transport's own settings only — never expose another tenant's data
      const { rows: transportRows } = await sql`
        SELECT * FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
      `;
      if (transportRows.length > 0) {
        return NextResponse.json(transportRows[0], { status: 200 });
      }
      // No settings yet for this transport — return safe empty defaults
      return NextResponse.json({
        transport_id: transportId,
        company_name: '', company_tagline: '', app_title: '', support_email: '',
        company_email: '', company_phone: '', address: '', gst_no: '',
        logo_url: '', signature_url: '', transporter_qr_url: '',
        transporter_name_font: 'Arial', lr_prefix: '', invoice_prefix: '',
        lr_print_format: 'classic', invoice_print_format: 'classic',
        lr_print_instructions: '', default_lr_charge: 0, default_gst_rate: 18,
        financial_year_start: '04-01', timezone: 'Asia/Kolkata',
      }, { status: 200 });
    }

    // Super admin or unauthenticated: return global settings (id=1, transport_id=null)
    const { rows } = await sql`SELECT * FROM app_settings WHERE transport_id IS NULL LIMIT 1`;
    return NextResponse.json(rows[0] || null, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin settings', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const transportId = await getTransportIdFromRequest(request);

    if (transportId !== null) {
      // Upsert per-transport settings
      const { rows: existingRows } = await sql`
        SELECT * FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
      `;

      let existing: any;
      if (existingRows.length > 0) {
        existing = existingRows[0];
      } else {
        // Seed from global defaults
        const { rows: globalRows } = await sql`SELECT * FROM app_settings WHERE id = 1 LIMIT 1`;
        existing = globalRows[0] || {};
      }

      const { rows } = await sql`
        INSERT INTO app_settings (
          transport_id, company_name, company_tagline, app_title, support_email, company_email,
          company_phone, address, gst_no, logo_url, signature_url, transporter_qr_url,
          transporter_name_font, lr_prefix, invoice_prefix, lr_print_format, invoice_print_format,
          lr_print_instructions, default_lr_charge, default_gst_rate, financial_year_start,
          timezone, updated_at
        )
        VALUES (
          ${transportId},
          ${body.company_name ?? existing.company_name ?? ''},
          ${body.company_tagline ?? existing.company_tagline ?? ''},
          ${body.app_title ?? existing.app_title ?? ''},
          ${body.support_email ?? existing.support_email ?? ''},
          ${body.company_email ?? existing.company_email ?? ''},
          ${body.company_phone ?? existing.company_phone ?? ''},
          ${body.address ?? existing.address ?? ''},
          ${body.gst_no ?? existing.gst_no ?? ''},
          ${body.logo_url ?? existing.logo_url ?? ''},
          ${body.signature_url ?? existing.signature_url ?? ''},
          ${body.transporter_qr_url ?? existing.transporter_qr_url ?? ''},
          ${body.transporter_name_font ?? existing.transporter_name_font ?? 'Arial'},
          ${body.lr_prefix ?? existing.lr_prefix ?? ''},
          ${body.invoice_prefix ?? existing.invoice_prefix ?? ''},
          ${body.lr_print_format ?? existing.lr_print_format ?? 'classic'},
          ${body.invoice_print_format ?? existing.invoice_print_format ?? 'classic'},
          ${body.lr_print_instructions ?? existing.lr_print_instructions ?? ''},
          ${body.default_lr_charge === undefined ? (existing.default_lr_charge ?? 0) : Number(body.default_lr_charge) || 0},
          ${body.default_gst_rate === undefined ? (existing.default_gst_rate ?? 18) : Number(body.default_gst_rate) || 0},
          ${body.financial_year_start ?? existing.financial_year_start ?? '04-01'},
          ${body.timezone ?? existing.timezone ?? 'Asia/Kolkata'},
          NOW()
        )
        ON CONFLICT (transport_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          company_tagline = EXCLUDED.company_tagline,
          app_title = EXCLUDED.app_title,
          support_email = EXCLUDED.support_email,
          company_email = EXCLUDED.company_email,
          company_phone = EXCLUDED.company_phone,
          address = EXCLUDED.address,
          gst_no = EXCLUDED.gst_no,
          logo_url = EXCLUDED.logo_url,
          signature_url = EXCLUDED.signature_url,
          transporter_qr_url = EXCLUDED.transporter_qr_url,
          transporter_name_font = EXCLUDED.transporter_name_font,
          lr_prefix = EXCLUDED.lr_prefix,
          invoice_prefix = EXCLUDED.invoice_prefix,
          lr_print_format = EXCLUDED.lr_print_format,
          invoice_print_format = EXCLUDED.invoice_print_format,
          lr_print_instructions = EXCLUDED.lr_print_instructions,
          default_lr_charge = EXCLUDED.default_lr_charge,
          default_gst_rate = EXCLUDED.default_gst_rate,
          financial_year_start = EXCLUDED.financial_year_start,
          timezone = EXCLUDED.timezone,
          updated_at = NOW()
        RETURNING *
      `;

      await sql`
        INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
        VALUES ('UPDATE', 'app_settings', ${String(transportId)}, 'Updated transport settings', ${String(body.updated_by || 'system')})
      `;

      return NextResponse.json(rows[0], { status: 200 });
    }

    // Super admin: update global settings (transport_id IS NULL row)
    const { rows: existingRows } = await sql`SELECT * FROM app_settings WHERE transport_id IS NULL LIMIT 1`;
    const existing = existingRows[0];

    const { rows } = await sql`
      UPDATE app_settings
      SET
        company_name = ${body.company_name ?? existing.company_name},
        company_tagline = ${body.company_tagline ?? existing.company_tagline},
        app_title = ${body.app_title ?? existing.app_title},
        support_email = ${body.support_email ?? existing.support_email},
        company_email = ${body.company_email ?? existing.company_email},
        company_phone = ${body.company_phone ?? existing.company_phone},
        address = ${body.address ?? existing.address},
        gst_no = ${body.gst_no ?? existing.gst_no},
        logo_url = ${body.logo_url ?? existing.logo_url},
        signature_url = ${body.signature_url ?? existing.signature_url},
        transporter_qr_url = ${body.transporter_qr_url ?? existing.transporter_qr_url},
        transporter_name_font = ${body.transporter_name_font ?? existing.transporter_name_font},
        lr_prefix = ${body.lr_prefix ?? existing.lr_prefix},
        invoice_prefix = ${body.invoice_prefix ?? existing.invoice_prefix},
        lr_print_format = ${body.lr_print_format ?? existing.lr_print_format},
        invoice_print_format = ${body.invoice_print_format ?? existing.invoice_print_format},
        lr_print_instructions = ${body.lr_print_instructions ?? existing.lr_print_instructions},
        default_lr_charge = ${body.default_lr_charge === undefined ? existing.default_lr_charge : Number(body.default_lr_charge) || 0},
        default_gst_rate = ${body.default_gst_rate === undefined ? existing.default_gst_rate : Number(body.default_gst_rate) || 0},
        financial_year_start = ${body.financial_year_start ?? existing.financial_year_start},
        timezone = ${body.timezone ?? existing.timezone},
        updated_at = NOW()
      WHERE transport_id IS NULL
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES ('UPDATE', 'app_settings', '0', 'Updated global settings', ${String(body.updated_by || 'system')})
    `;

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating admin settings', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
