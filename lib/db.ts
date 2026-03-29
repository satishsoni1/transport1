import { Pool } from '@neondatabase/serverless';

type QueryResult<T = any> = {
  rows: T[];
};

let pool: Pool | null = null;

function getConnectionString() {
  const fromUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (fromUrl) return fromUrl;

  const host = process.env.PGHOST_UNPOOLED || process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  if (!host || !user || !password || !database) {
    throw new Error(
      'Database connection is not configured. Set DATABASE_URL (recommended for Neon).'
    );
  }

  const port = process.env.PGPORT || '5432';
  const sslmode = process.env.PGSSLMODE || 'require';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${database}?sslmode=${sslmode}`;
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getConnectionString() });
  }
  return pool;
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
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      driver_name TEXT NOT NULL,
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

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      company_name TEXT NOT NULL DEFAULT '',
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
      default_gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18,
      financial_year_start TEXT NOT NULL DEFAULT '04-01',
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS name_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignees ADD COLUMN IF NOT EXISTS city_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS name_mr TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE consignors ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`;
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

  await sql`
    INSERT INTO app_settings (
      id, company_name, company_email, company_phone, address, gst_no,
      logo_url, signature_url, transporter_qr_url, transporter_name_font, lr_prefix, invoice_prefix, lr_print_format, invoice_print_format,
      default_gst_rate, financial_year_start, timezone
    )
    VALUES (1, '', '', '', '', '', '', '', '', 'Arial', '', '', 'classic', 'classic', 18, '04-01', 'Asia/Kolkata')
    ON CONFLICT (id) DO NOTHING
  `;

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT 'normal'`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS return_remark TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lr_entries ADD COLUMN IF NOT EXISTS pod_received BOOLEAN NOT NULL DEFAULT FALSE`;

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS engine_reading DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS short_reading DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS rate_per_km DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS reading_total DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS hamali DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE challans ADD COLUMN IF NOT EXISTS advance DOUBLE PRECISION NOT NULL DEFAULT 0`;

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
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

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
      status TEXT NOT NULL DEFAULT 'pending',
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
