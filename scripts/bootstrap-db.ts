import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { closePool, ensureSchema, sql } from '@/lib/db';

const DEFAULT_SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
const DEFAULT_SUPER_ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
const DEFAULT_SUPER_ADMIN_FIRST_NAME =
  process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
const DEFAULT_SUPER_ADMIN_LAST_NAME =
  process.env.SUPER_ADMIN_LAST_NAME || 'Admin';
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const DEFAULT_ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';
const DEFAULT_ADMIN_ROLE = process.env.ADMIN_ROLE || 'Admin';
const DEFAULT_TRANSPORT_NAME = process.env.DEFAULT_TRANSPORT_NAME || 'Transport Company';
const DEFAULT_SUBSCRIPTION_PLAN = process.env.DEFAULT_SUBSCRIPTION_PLAN || 'standard';
const DEFAULT_SUBSCRIPTION_WARNING_DAYS = Number(
  process.env.DEFAULT_SUBSCRIPTION_WARNING_DAYS || 7
);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'transport-company';
}

export async function ensureDefaultTransport() {
  const slug = slugify(DEFAULT_TRANSPORT_NAME);
  const { rows } = await sql<{ id: number }>`
    INSERT INTO transports (
      company_name,
      slug,
      contact_email,
      status,
      subscription_plan,
      subscription_start_date,
      subscription_end_date,
      subscription_warning_days
    )
    VALUES (
      ${DEFAULT_TRANSPORT_NAME},
      ${slug},
      ${DEFAULT_ADMIN_EMAIL},
      'active',
      ${DEFAULT_SUBSCRIPTION_PLAN},
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      ${Number.isFinite(DEFAULT_SUBSCRIPTION_WARNING_DAYS) ? DEFAULT_SUBSCRIPTION_WARNING_DAYS : 7}
    )
    ON CONFLICT (slug) DO UPDATE
    SET
      company_name = EXCLUDED.company_name,
      contact_email = EXCLUDED.contact_email,
      subscription_plan = EXCLUDED.subscription_plan,
      subscription_warning_days = EXCLUDED.subscription_warning_days,
      updated_at = NOW()
    RETURNING id
  `;

  return Number(rows[0].id);
}

export async function ensureSuperAdminUser() {
  const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 10);

  await sql`
    INSERT INTO users (
      email,
      password_hash,
      first_name,
      last_name,
      role,
      platform_role,
      transport_id,
      status
    )
    VALUES (
      ${DEFAULT_SUPER_ADMIN_EMAIL},
      ${passwordHash},
      ${DEFAULT_SUPER_ADMIN_FIRST_NAME},
      ${DEFAULT_SUPER_ADMIN_LAST_NAME},
      'Super Admin',
      'super_admin',
      NULL,
      'active'
    )
    ON CONFLICT (email) DO UPDATE
    SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      platform_role = EXCLUDED.platform_role,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}

export async function ensureDefaultAdminUser() {
  const transportId = await ensureDefaultTransport();
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await sql`
    INSERT INTO users (
      email,
      password_hash,
      first_name,
      last_name,
      role,
      platform_role,
      transport_id,
      status
    )
    VALUES (
      ${DEFAULT_ADMIN_EMAIL},
      ${passwordHash},
      ${DEFAULT_ADMIN_FIRST_NAME},
      ${DEFAULT_ADMIN_LAST_NAME},
      ${DEFAULT_ADMIN_ROLE},
      'transport_admin',
      ${transportId},
      'active'
    )
    ON CONFLICT (email) DO UPDATE
    SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      platform_role = EXCLUDED.platform_role,
      transport_id = EXCLUDED.transport_id,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}

export async function bootstrapDatabase() {
  await ensureSchema();
  await ensureSuperAdminUser();
  await ensureDefaultAdminUser();
}

async function main() {
  try {
    await bootstrapDatabase();
    console.log(`Database bootstrap complete. Default admin: ${DEFAULT_ADMIN_EMAIL}`);
  } catch (error) {
    console.error('Database bootstrap failed:', error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

void main();
