import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

type QueryResult<T = any> = {
  rows: T[];
};

let pool: Pool | null = null;
let envLoaded = false;

function loadRuntimeEnv() {
  if (envLoaded) return;
  envLoaded = true;

  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFiles =
    nodeEnv === 'test'
      ? ['.env.test.local', '.env.test', '.env']
      : [`.env.${nodeEnv}.local`, '.env.local', `.env.${nodeEnv}`, '.env'];

  for (const file of envFiles) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      loadEnv({ path });
    }
  }
}

function isValidUrl(value: string | undefined) {
  if (!value) return false;
  const invalidPlaceholders = [
    'your-neon-database-url-here',
    'your-local-postgres-url-here',
    '<DATABASE_URL>',
  ];
  if (invalidPlaceholders.some(marker => value.includes(marker))) {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getConnectionString() {
  loadRuntimeEnv();

  const candidates = [
    { key: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { key: 'DATABASE_URL_UNPOOLED', value: process.env.DATABASE_URL_UNPOOLED },
    { key: 'POSTGRES_URL', value: process.env.POSTGRES_URL },
    { key: 'POSTGRES_URL_NON_POOLING', value: process.env.POSTGRES_URL_NON_POOLING },
    { key: 'POSTGRES_PRISMA_URL', value: process.env.POSTGRES_PRISMA_URL },
    { key: 'NEON_DATABASE_URL', value: process.env.NEON_DATABASE_URL },
  ];

  const fromUrl = candidates.find(({ value }) => isValidUrl(value))?.value;
  if (fromUrl) return fromUrl;

  const placeholder = candidates.find(
    ({ value }) =>
      value && /your-neon-database-url-here|your-local-postgres-url-here|<DATABASE_URL>/.test(value)
  );
  if (placeholder) {
    throw new Error(
      `Environment variable ${placeholder.key} contains a placeholder value. Replace it with your actual database URL.`
    );
  }

  const host = process.env.PGHOST_UNPOOLED || process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  if (!host || !user || !password || !database) {
    throw new Error(
      'Database connection is not configured. Set DATABASE_URL for local PostgreSQL or provide PGHOST/PGUSER/PGPASSWORD/PGDATABASE.'
    );
  }

  const port = process.env.PGPORT || '5432';
  const sslmode = process.env.PGSSLMODE || 'disable';
  const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${database}`;
  return sslmode ? `${base}?sslmode=${sslmode}` : base;
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getConnectionString() });
  }
  return pool;
}

export async function closePool() {
  if (!pool) return;
  const currentPool = pool;
  pool = null;
  await currentPool.end();
}

async function hasColumn(tableName: string, columnName: string) {
  const { rows } = await sql<{ exists: number }>`
    SELECT 1 AS exists
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(tableName: string) {
  const { rows } = await sql<{ exists: number }>`
    SELECT 1 AS exists
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<QueryResult<T>> {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  const result = await getPool().query(text, values);
  return result as QueryResult<T>;
}

let schemaReady = false;
let schemaInitPromise: Promise<void> | null = null;

export async function ensureSchema() {
  if (schemaReady) return;
  if (schemaInitPromise) {
    await schemaInitPromise;
    return;
  }

  schemaInitPromise = (async () => {
    if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS banks (
      id SERIAL PRIMARY KEY,
      bank_name TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT '',
      ifsc_code TEXT NOT NULL DEFAULT '',
      account_no TEXT NOT NULL,
      account_holder TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS consignees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_mr TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      city_mr TEXT NOT NULL DEFAULT '',
      gst_no TEXT NOT NULL DEFAULT '',
      contact_person TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS consignors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_mr TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      gst_no TEXT NOT NULL DEFAULT '',
      lr_print_instructions TEXT NOT NULL DEFAULT '',
      contact_person TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      account_no TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goods_types (
      id SERIAL PRIMARY KEY,
      type_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS goods_natures (
        id SERIAL PRIMARY KEY,
        nature_name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  } catch (error) {
    const pgErr = error as { code?: string; detail?: string };
    const isConcurrentCreateRace =
      pgErr?.code === '23505' &&
      String(pgErr?.detail || '').toLowerCase().includes('goods_natures');
    if (!isConcurrentCreateRace) throw error;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      city_name TEXT NOT NULL UNIQUE,
      city_name_hi TEXT NOT NULL DEFAULT '',
      city_name_mr TEXT NOT NULL DEFAULT '',
      consignor_id INTEGER,
      consignee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS city_name_hi TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS city_name_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS consignor_id INTEGER`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS consignee_id INTEGER`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS taluka TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      driver_name TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      license_no TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      vehicle_no TEXT NOT NULL DEFAULT '',
      license_valid_from TEXT NOT NULL DEFAULT '',
      license_valid_to TEXT NOT NULL DEFAULT '',
      renewal_date TEXT NOT NULL DEFAULT '',
      passport_photo_url TEXT NOT NULL DEFAULT '',
      thumb_image_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_no TEXT NOT NULL UNIQUE,
      owner_name TEXT NOT NULL DEFAULT '',
      vehicle_type TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transports (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      contact_email TEXT NOT NULL DEFAULT '',
      contact_phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      subscription_plan TEXT NOT NULL DEFAULT 'standard',
      subscription_start_date DATE,
      subscription_end_date DATE,
      subscription_warning_days INTEGER NOT NULL DEFAULT 7,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'User',
      platform_role TEXT NOT NULL DEFAULT 'transport_admin',
      transport_id INTEGER REFERENCES transports(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'transport_admin'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_transport_id_fkey'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_transport_id_fkey
          FOREIGN KEY (transport_id) REFERENCES transports(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;

  // Normalize legacy free-text role values onto the fixed staff-role enum before
  // constraining the column, so existing tenants keep working after upgrade.
  await sql`
    UPDATE users SET role = 'Transport Admin'
    WHERE platform_role = 'transport_admin' AND role IN ('Admin', 'User', '')
  `;
  await sql`
    UPDATE users SET role = 'Operator'
    WHERE platform_role = 'transport_admin'
      AND role NOT IN ('Transport Admin', 'Manager', 'Accountant', 'Operator')
  `;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('Transport Admin', 'Manager', 'Accountant', 'Operator', 'Super Admin'));
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Operator',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      user_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const appSettingsHasLegacyColumns =
    (await hasColumn('app_settings', 'setting_key')) ||
    (await hasColumn('app_settings', 'setting_value'));
  const appSettingsHasCanonicalColumns =
    (await hasColumn('app_settings', 'company_name')) ||
    (await hasColumn('app_settings', 'lr_prefix'));
  const hasLegacyAppSettingsTable = await tableExists('app_settings_legacy');

  if (appSettingsHasLegacyColumns && !appSettingsHasCanonicalColumns && !hasLegacyAppSettingsTable) {
    await sql`ALTER TABLE app_settings RENAME TO app_settings_legacy`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL DEFAULT '',
      company_tagline TEXT NOT NULL DEFAULT '',
      app_title TEXT NOT NULL DEFAULT '',
      support_email TEXT NOT NULL DEFAULT '',
      company_email TEXT NOT NULL DEFAULT '',
      company_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      gst_no TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      signature_url TEXT NOT NULL DEFAULT '',
      transporter_qr_url TEXT NOT NULL DEFAULT '',
      transporter_name_font TEXT NOT NULL DEFAULT 'Arial',
      lr_prefix TEXT NOT NULL DEFAULT '',
      invoice_prefix TEXT NOT NULL DEFAULT '',
      lr_print_format TEXT NOT NULL DEFAULT 'classic',
      invoice_print_format TEXT NOT NULL DEFAULT 'classic',
      lr_print_instructions TEXT NOT NULL DEFAULT '',
      default_lr_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
      default_gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18,
      financial_year_start TEXT NOT NULL DEFAULT '04-01',
      current_financial_year_id INTEGER,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS id INTEGER`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_tagline TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS app_title TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS support_email TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_email TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_phone TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS gst_no TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS name_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS city_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS name_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS default_payment_method TEXT NOT NULL DEFAULT 'to_pay'`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS lr_print_instructions TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_no TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_valid_from TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_valid_to TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS renewal_date TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS passport_photo_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS thumb_image_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS signature_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS transporter_qr_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS transporter_name_font TEXT NOT NULL DEFAULT 'Arial'`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS lr_prefix TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS lr_print_format TEXT NOT NULL DEFAULT 'classic'`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS invoice_print_format TEXT NOT NULL DEFAULT 'classic'`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS lr_print_instructions TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_lr_charge DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS financial_year_start TEXT NOT NULL DEFAULT '04-01'`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS current_financial_year_id INTEGER`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata'`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS lr_copies TEXT NOT NULL DEFAULT 'double'`;

  await sql`
    INSERT INTO app_settings (
      id, company_name, company_tagline, app_title, support_email, company_email, company_phone, address, gst_no,
      logo_url, signature_url, transporter_qr_url, transporter_name_font, lr_prefix, invoice_prefix, lr_print_format, invoice_print_format, lr_print_instructions,
      default_lr_charge, default_gst_rate, financial_year_start, timezone
    )
    VALUES (1, '', '', '', '', '', '', '', '', '', '', '', 'Arial', '', '', 'classic', 'classic', '', 0, 18, '04-01', 'Asia/Kolkata')
    ON CONFLICT (id) DO NOTHING
  `;

  if (await tableExists('app_settings_legacy')) {
    const { rows: legacyRows } = await sql<{ setting_key: string; setting_value: string }>`
      SELECT setting_key, setting_value
      FROM app_settings_legacy
      WHERE setting_key IN (
        'company_name',
        'company_tagline',
        'app_title',
        'support_email',
        'company_email',
        'company_phone',
        'address',
        'gst_no',
        'logo_url',
        'signature_url',
        'transporter_qr_url',
        'transporter_name_font',
        'lr_prefix',
        'invoice_prefix',
        'lr_print_format',
        'invoice_print_format',
        'lr_print_instructions',
        'default_gst_rate',
        'financial_year_start',
        'timezone'
      )
    `;

    const legacySettings = new Map(
      legacyRows.map((row) => [String(row.setting_key || ''), String(row.setting_value || '')])
    );

    if (legacySettings.size > 0) {
      const defaultGstRateValue = Number(legacySettings.get('default_gst_rate'));

      await sql`
        UPDATE app_settings
        SET
          company_name = COALESCE(NULLIF(${legacySettings.get('company_name') || ''}, ''), company_name),
          company_tagline = COALESCE(NULLIF(${legacySettings.get('company_tagline') || ''}, ''), company_tagline),
          app_title = COALESCE(NULLIF(${legacySettings.get('app_title') || ''}, ''), app_title),
          support_email = COALESCE(NULLIF(${legacySettings.get('support_email') || ''}, ''), support_email),
          company_email = COALESCE(NULLIF(${legacySettings.get('company_email') || ''}, ''), company_email),
          company_phone = COALESCE(NULLIF(${legacySettings.get('company_phone') || ''}, ''), company_phone),
          address = COALESCE(NULLIF(${legacySettings.get('address') || ''}, ''), address),
          gst_no = COALESCE(NULLIF(${legacySettings.get('gst_no') || ''}, ''), gst_no),
          logo_url = COALESCE(NULLIF(${legacySettings.get('logo_url') || ''}, ''), logo_url),
          signature_url = COALESCE(NULLIF(${legacySettings.get('signature_url') || ''}, ''), signature_url),
          transporter_qr_url = COALESCE(NULLIF(${legacySettings.get('transporter_qr_url') || ''}, ''), transporter_qr_url),
          transporter_name_font = COALESCE(NULLIF(${legacySettings.get('transporter_name_font') || ''}, ''), transporter_name_font),
          lr_prefix = COALESCE(NULLIF(${legacySettings.get('lr_prefix') || ''}, ''), lr_prefix),
          invoice_prefix = COALESCE(NULLIF(${legacySettings.get('invoice_prefix') || ''}, ''), invoice_prefix),
          lr_print_format = COALESCE(NULLIF(${legacySettings.get('lr_print_format') || ''}, ''), lr_print_format),
          invoice_print_format = COALESCE(NULLIF(${legacySettings.get('invoice_print_format') || ''}, ''), invoice_print_format),
          lr_print_instructions = COALESCE(NULLIF(${legacySettings.get('lr_print_instructions') || ''}, ''), lr_print_instructions),
          default_gst_rate = ${
            Number.isFinite(defaultGstRateValue) ? defaultGstRateValue : 18
          },
          financial_year_start = COALESCE(NULLIF(${legacySettings.get('financial_year_start') || ''}, ''), financial_year_start),
          timezone = COALESCE(NULLIF(${legacySettings.get('timezone') || ''}, ''), timezone),
          updated_at = NOW()
        WHERE id = 1
      `;
    }
  }

  await sql`
    CREATE TABLE IF NOT EXISTS freight_rates (
      id SERIAL PRIMARY KEY,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      rate_per_kg DOUBLE PRECISION NOT NULL,
      min_rate DOUBLE PRECISION NOT NULL,
      vehicle_type TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS consignor_id INTEGER`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS route_id INTEGER`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS city_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_10kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_20kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_30kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_40kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_50kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS rate_above_50kg DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'freight_rates_consignor_route_city_key'
      ) THEN
        ALTER TABLE freight_rates
          ADD CONSTRAINT freight_rates_consignor_route_city_key
          UNIQUE (consignor_id, route_id, city_name);
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      route_name TEXT NOT NULL DEFAULT '',
      from_city TEXT NOT NULL DEFAULT '',
      to_city TEXT NOT NULL DEFAULT '',
      consignor_id INTEGER,
      consignee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE routes ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE routes ADD COLUMN IF NOT EXISTS cities JSONB NOT NULL DEFAULT '[]'`;

  await sql`
    CREATE TABLE IF NOT EXISTS lr_entries (
      id SERIAL PRIMARY KEY,
      lr_no TEXT NOT NULL UNIQUE,
      lr_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      consignor_id INTEGER NOT NULL,
      consignee_id INTEGER NOT NULL,
      from_city TEXT NOT NULL DEFAULT '',
      to_city TEXT NOT NULL DEFAULT '',
      delivery_address TEXT NOT NULL DEFAULT '',
      freight DOUBLE PRECISION NOT NULL DEFAULT 0,
      hamali DOUBLE PRECISION NOT NULL DEFAULT 0,
      lr_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
      advance DOUBLE PRECISION NOT NULL DEFAULT 0,
      balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      invoice_no TEXT NOT NULL DEFAULT '',
      invoice_date TEXT NOT NULL DEFAULT '',
      truck_no TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL DEFAULT '',
      driver_mobile TEXT NOT NULL DEFAULT '',
      eway_no TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      return_status TEXT NOT NULL DEFAULT 'normal',
      return_remark TEXT NOT NULL DEFAULT '',
      pod_received BOOLEAN NOT NULL DEFAULT FALSE,
      goods_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'to_pay',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT 'normal'`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS return_remark TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_received BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_image_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_received_at TIMESTAMPTZ`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_received_by_driver_id INTEGER`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_received_by_driver_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS challans (
      id SERIAL PRIMARY KEY,
      challan_no TEXT NOT NULL UNIQUE,
      challan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      from_city TEXT NOT NULL DEFAULT '',
      to_city TEXT NOT NULL DEFAULT '',
      truck_no TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL DEFAULT '',
      driver_mobile TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      eway_no TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      engine_reading DOUBLE PRECISION NOT NULL DEFAULT 0,
      short_reading DOUBLE PRECISION NOT NULL DEFAULT 0,
      rate_per_km DOUBLE PRECISION NOT NULL DEFAULT 0,
      reading_total DOUBLE PRECISION NOT NULL DEFAULT 0,
      hamali DOUBLE PRECISION NOT NULL DEFAULT 0,
      advance DOUBLE PRECISION NOT NULL DEFAULT 0,
      lr_list JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_freight DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_to_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS engine_reading DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS short_reading DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS rate_per_km DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS reading_total DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS hamali DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS advance DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      party_name TEXT NOT NULL,
      consignor_id INTEGER NOT NULL,
      gst_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
      remarks TEXT NOT NULL DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      additional_charges JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS additional_charges JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id SERIAL PRIMARY KEY,
      receipt_no TEXT NOT NULL UNIQUE,
      receipt_date TEXT NOT NULL,
      party_name TEXT NOT NULL,
      consignor_id INTEGER NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cash',
      cheque_no TEXT NOT NULL DEFAULT '',
      cheque_date TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      tds_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      deduction_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      received_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      photo_url TEXT NOT NULL DEFAULT '',
      receipt_type TEXT NOT NULL DEFAULT 'invoice',
      status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tds_amount DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS deduction_amount DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS received_amount DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receipt_type TEXT NOT NULL DEFAULT 'invoice'`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS financial_years (
      id SERIAL PRIMARY KEY,
      year_label TEXT NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monthly_bills (
      id SERIAL PRIMARY KEY,
      bill_no TEXT NOT NULL UNIQUE,
      bill_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      party_name TEXT NOT NULL,
      consignor_id INTEGER NOT NULL,
      period_from TEXT NOT NULL,
      period_to TEXT NOT NULL,
      tds_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
      remarks TEXT NOT NULL DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_invoices INTEGER NOT NULL DEFAULT 0,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      tds_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE monthly_bills ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  // Per-tenant transport_id for operational master tables
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE routes ADD COLUMN IF NOT EXISTS transport_id INTEGER`;
  await sql`ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS transport_id INTEGER`;

  // Per-transport LR sequence tracking
  await sql`
    CREATE TABLE IF NOT EXISTS transport_lr_sequences (
      id INTEGER PRIMARY KEY,
      next_lr_number INTEGER NOT NULL DEFAULT 1,
      lr_prefix VARCHAR(20) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Atomic function to get the next LR number for a given transport.
  // Always syncs the sequence to be ahead of the highest existing lr_no so that
  // out-of-sync sequences (e.g. after manual inserts or sequence resets) never
  // produce a duplicate key error.
  await sql`
    CREATE OR REPLACE FUNCTION get_next_lr_number_for_transport(p_transport_id INTEGER)
    RETURNS VARCHAR AS $$
    DECLARE
      v_next_number  INTEGER;
      v_lr_prefix    VARCHAR(20);
      v_max_existing INTEGER;
    BEGIN
      -- lr_no has a GLOBAL unique constraint, so check the max across all rows
      -- (legacy rows may have transport_id = NULL and must still be counted).
      SELECT COALESCE(
        MAX(NULLIF(regexp_replace(lr_no, '[^0-9]', '', 'g'), '')::INTEGER),
        0
      )
      INTO v_max_existing
      FROM lr_entries;

      -- Ensure the sequence row exists (insert only if missing)
      INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix, updated_at)
      VALUES (p_transport_id, v_max_existing + 1, '', NOW())
      ON CONFLICT (id) DO NOTHING;

      -- Atomically advance to GREATEST(current, max_existing + 1), then increment.
      -- Row-level locking means concurrent calls serialize here, so no two callers
      -- can receive the same number even under load.
      UPDATE transport_lr_sequences
      SET next_lr_number = GREATEST(next_lr_number, v_max_existing + 1) + 1,
          updated_at = NOW()
      WHERE id = p_transport_id
      RETURNING next_lr_number - 1, lr_prefix INTO v_next_number, v_lr_prefix;

      RETURN COALESCE(v_lr_prefix, '') || LPAD(v_next_number::VARCHAR, 5, '0');
    END;
    $$ LANGUAGE plpgsql
  `;

  // Per-transport document number sequences (invoices, receipts, challans, monthly bills)
  await sql`
    CREATE TABLE IF NOT EXISTS transport_doc_sequences (
      transport_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      next_number BIGINT NOT NULL DEFAULT 1,
      PRIMARY KEY (transport_id, doc_type)
    )
  `;

  await sql`
    CREATE OR REPLACE FUNCTION get_next_doc_number(p_transport_id INTEGER, p_doc_type TEXT)
    RETURNS BIGINT AS $$
    DECLARE v_next BIGINT;
    BEGIN
      INSERT INTO transport_doc_sequences (transport_id, doc_type, next_number)
      VALUES (p_transport_id, p_doc_type, 2)
      ON CONFLICT (transport_id, doc_type) DO UPDATE
        SET next_number = transport_doc_sequences.next_number + 1
      RETURNING next_number - 1 INTO v_next;
      RETURN v_next;
    END;
    $$ LANGUAGE plpgsql
  `;

  // Unique index so each transport has exactly one settings row
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_transport_id
    ON app_settings(transport_id)
    WHERE transport_id IS NOT NULL
  `;

  // --- Phase 2: driver hiring/advance ledger + vehicle-linked LR/challan ---
  // All additive: new nullable columns and a new table only, so existing tenant data is untouched.
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_id INTEGER`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'own'`;
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hire_date TEXT NOT NULL DEFAULT ''`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_vehicle_id_fkey'
      ) THEN
        ALTER TABLE drivers
          ADD CONSTRAINT drivers_vehicle_id_fkey
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_employment_type_check'
      ) THEN
        ALTER TABLE drivers
          ADD CONSTRAINT drivers_employment_type_check
          CHECK (employment_type IN ('own', 'hired'));
      END IF;
    END $$
  `;

  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS vehicle_id INTEGER`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS driver_id INTEGER`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'challans_vehicle_id_fkey'
      ) THEN
        ALTER TABLE challans
          ADD CONSTRAINT challans_vehicle_id_fkey
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'challans_driver_id_fkey'
      ) THEN
        ALTER TABLE challans
          ADD CONSTRAINT challans_driver_id_fkey
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;

  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS vehicle_id INTEGER`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS driver_id INTEGER`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lr_entries_vehicle_id_fkey'
      ) THEN
        ALTER TABLE lr_entries
          ADD CONSTRAINT lr_entries_vehicle_id_fkey
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lr_entries_driver_id_fkey'
      ) THEN
        ALTER TABLE lr_entries
          ADD CONSTRAINT lr_entries_driver_id_fkey
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;

  // Best-effort backfill: link existing free-text truck_no/driver_name to master records
  // wherever they cleanly match within the same tenant. Idempotent (only fills NULLs).
  await sql`
    UPDATE drivers d SET vehicle_id = v.id
    FROM vehicles v
    WHERE d.vehicle_id IS NULL
      AND d.transport_id = v.transport_id
      AND d.vehicle_no <> ''
      AND UPPER(TRIM(d.vehicle_no)) = v.vehicle_no
  `;
  await sql`
    UPDATE challans c SET vehicle_id = v.id
    FROM vehicles v
    WHERE c.vehicle_id IS NULL
      AND c.transport_id = v.transport_id
      AND c.truck_no <> ''
      AND UPPER(TRIM(c.truck_no)) = v.vehicle_no
  `;
  await sql`
    UPDATE challans c SET driver_id = d.id
    FROM drivers d
    WHERE c.driver_id IS NULL
      AND c.transport_id = d.transport_id
      AND c.driver_name <> ''
      AND LOWER(TRIM(c.driver_name)) = LOWER(TRIM(d.driver_name))
  `;
  await sql`
    UPDATE lr_entries l SET vehicle_id = v.id
    FROM vehicles v
    WHERE l.vehicle_id IS NULL
      AND l.transport_id = v.transport_id
      AND l.truck_no <> ''
      AND UPPER(TRIM(l.truck_no)) = v.vehicle_no
  `;
  await sql`
    UPDATE lr_entries l SET driver_id = d.id
    FROM drivers d
    WHERE l.driver_id IS NULL
      AND l.transport_id = d.transport_id
      AND l.driver_name <> ''
      AND LOWER(TRIM(l.driver_name)) = LOWER(TRIM(d.driver_name))
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS driver_ledger_entries (
      id SERIAL PRIMARY KEY,
      transport_id INTEGER,
      driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      entry_type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      entry_date TEXT NOT NULL,
      remarks TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_ledger_entries_type_check'
      ) THEN
        ALTER TABLE driver_ledger_entries
          ADD CONSTRAINT driver_ledger_entries_type_check
          CHECK (entry_type IN ('advance', 'rent', 'deduction'));
      END IF;
    END $$
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_driver_ledger_entries_driver_id
    ON driver_ledger_entries(driver_id)
  `;

  // --- Phase 3: ERP expense/income module ---
  await sql`
    CREATE TABLE IF NOT EXISTS expense_income_categories (
      id SERIAL PRIMARY KEY,
      transport_id INTEGER,
      name TEXT NOT NULL,
      category_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_categories_type_check'
      ) THEN
        ALTER TABLE expense_income_categories
          ADD CONSTRAINT expense_income_categories_type_check
          CHECK (category_type IN ('expense', 'income'));
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS expense_income_entries (
      id SERIAL PRIMARY KEY,
      transport_id INTEGER,
      entry_type TEXT NOT NULL,
      category_id INTEGER,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      entry_date TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      cheque_no TEXT NOT NULL DEFAULT '',
      cheque_date TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      vehicle_id INTEGER,
      driver_id INTEGER,
      remarks TEXT NOT NULL DEFAULT '',
      attachment_url TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_entries_type_check'
      ) THEN
        ALTER TABLE expense_income_entries
          ADD CONSTRAINT expense_income_entries_type_check
          CHECK (entry_type IN ('expense', 'income'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_entries_mode_check'
      ) THEN
        ALTER TABLE expense_income_entries
          ADD CONSTRAINT expense_income_entries_mode_check
          CHECK (payment_mode IN ('cash', 'bank', 'cheque'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_entries_category_id_fkey'
      ) THEN
        ALTER TABLE expense_income_entries
          ADD CONSTRAINT expense_income_entries_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES expense_income_categories(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_entries_vehicle_id_fkey'
      ) THEN
        ALTER TABLE expense_income_entries
          ADD CONSTRAINT expense_income_entries_vehicle_id_fkey
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_income_entries_driver_id_fkey'
      ) THEN
        ALTER TABLE expense_income_entries
          ADD CONSTRAINT expense_income_entries_driver_id_fkey
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_income_entries_transport_date
    ON expense_income_entries(transport_id, entry_date)
  `;

  // --- Login redesign / forgot-password / notification infrastructure ---
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
    ON password_reset_tokens(token_hash)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id SERIAL PRIMARY KEY,
      transport_id INTEGER,
      email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      smtp_host TEXT NOT NULL DEFAULT '',
      smtp_port INTEGER NOT NULL DEFAULT 587,
      smtp_username TEXT NOT NULL DEFAULT '',
      smtp_password TEXT NOT NULL DEFAULT '',
      smtp_from_email TEXT NOT NULL DEFAULT '',
      smtp_from_name TEXT NOT NULL DEFAULT '',
      whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_phone_number_id TEXT NOT NULL DEFAULT '',
      whatsapp_access_token TEXT NOT NULL DEFAULT '',
      notify_lr_created BOOLEAN NOT NULL DEFAULT FALSE,
      notify_invoice_created BOOLEAN NOT NULL DEFAULT FALSE,
      notify_receipt_created BOOLEAN NOT NULL DEFAULT FALSE,
      notify_challan_created BOOLEAN NOT NULL DEFAULT FALSE,
      notify_consignor BOOLEAN NOT NULL DEFAULT TRUE,
      notify_consignee BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_transport_id
    ON notification_settings(transport_id)
    WHERE transport_id IS NOT NULL
  `;

  schemaReady = true;
  })();

  try {
    await schemaInitPromise;
  } finally {
    schemaInitPromise = null;
  }
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
