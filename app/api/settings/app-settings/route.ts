import { NextResponse } from 'next/server';

import { ensureSchema, sql } from '@/lib/db';

const SETTING_COLUMN_MAP: Record<string, string> = {
  app_title: 'app_title',
  company_email: 'company_email',
  company_name: 'company_name',
  company_phone: 'company_phone',
  company_tagline: 'company_tagline',
  support_email: 'support_email',
};

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        company_name,
        company_tagline,
        app_title,
        support_email,
        company_email,
        company_phone
      FROM app_settings
      WHERE id = 1
      LIMIT 1
    `;

    const row = rows[0] || {};
    return NextResponse.json(
      {
        success: true,
        settings: {
          company_name: String(row.company_name || ''),
          company_tagline: String(row.company_tagline || ''),
          app_title: String(row.app_title || ''),
          support_email: String(row.support_email || row.company_email || ''),
          company_email: String(row.company_email || ''),
          company_phone: String(row.company_phone || ''),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get app settings error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { setting_key, setting_value } = await request.json();

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { success: false, error: 'setting_key and setting_value are required' },
        { status: 400 }
      );
    }

    const column = SETTING_COLUMN_MAP[String(setting_key)];
    if (!column) {
      return NextResponse.json(
        { success: false, error: `Unsupported setting key: ${String(setting_key)}` },
        { status: 400 }
      );
    }

    const nextValue = String(setting_value);
    const { rows } = await sql`
      UPDATE app_settings
      SET
        company_name = CASE WHEN ${column} = 'company_name' THEN ${nextValue} ELSE company_name END,
        company_tagline = CASE WHEN ${column} = 'company_tagline' THEN ${nextValue} ELSE company_tagline END,
        app_title = CASE WHEN ${column} = 'app_title' THEN ${nextValue} ELSE app_title END,
        support_email = CASE WHEN ${column} = 'support_email' THEN ${nextValue} ELSE support_email END,
        company_email = CASE WHEN ${column} = 'company_email' THEN ${nextValue} ELSE company_email END,
        company_phone = CASE WHEN ${column} = 'company_phone' THEN ${nextValue} ELSE company_phone END,
        updated_at = NOW()
      WHERE id = 1
      RETURNING company_name, company_tagline, app_title, support_email, company_email, company_phone
    `;

    return NextResponse.json(
      {
        success: true,
        setting: {
          setting_key: String(setting_key),
          setting_value: nextValue,
        },
        settings: rows[0] || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update app settings error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
