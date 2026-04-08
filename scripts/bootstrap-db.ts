import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { closePool, ensureSchema, sql } from '@/lib/db';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const DEFAULT_ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';
const DEFAULT_ADMIN_ROLE = process.env.ADMIN_ROLE || 'Admin';

export async function ensureDefaultAdminUser() {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (
      ${DEFAULT_ADMIN_EMAIL},
      ${passwordHash},
      ${DEFAULT_ADMIN_FIRST_NAME},
      ${DEFAULT_ADMIN_LAST_NAME},
      ${DEFAULT_ADMIN_ROLE}
    )
    ON CONFLICT (email) DO NOTHING
  `;
}

export async function bootstrapDatabase() {
  await ensureSchema();
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
