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
  return getPool().query<T>(text, values);
}

let schemaReady = false;

export async function ensureSchema() {
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
      address TEXT NOT NULL,
      city TEXT NOT NULL,
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
      goods_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'to_pay',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

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
      lr_list JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_freight DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_to_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

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
