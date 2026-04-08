import 'server-only';

import { ensureSchema, sql } from '@/lib/db';
import { DEFAULT_APP_SETTINGS, type PublicAppSettings } from '@/lib/app-settings-defaults';

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  try {
    await ensureSchema();
    const { rows } = await sql<Partial<PublicAppSettings>>`
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
    return {
      company_name: String(row.company_name || DEFAULT_APP_SETTINGS.company_name),
      company_tagline: String(row.company_tagline || DEFAULT_APP_SETTINGS.company_tagline),
      app_title: String(row.app_title || row.company_name || DEFAULT_APP_SETTINGS.app_title),
      support_email: String(
        row.support_email || row.company_email || DEFAULT_APP_SETTINGS.support_email
      ),
      company_email: String(row.company_email || ''),
      company_phone: String(row.company_phone || ''),
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}
