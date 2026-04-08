import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM app_settings WHERE id = 1`;
    return NextResponse.json(rows[0] || null, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin settings', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM app_settings WHERE id = 1`;
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
        default_gst_rate = ${
          body.default_gst_rate === undefined
            ? existing.default_gst_rate
            : Number(body.default_gst_rate) || 0
        },
        financial_year_start = ${
          body.financial_year_start ?? existing.financial_year_start
        },
        timezone = ${body.timezone ?? existing.timezone},
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES ('UPDATE', 'app_settings', '1', 'Updated administration settings', ${String(body.updated_by || 'system')})
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
