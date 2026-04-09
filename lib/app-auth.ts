import { createHash, timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { ensureSchema, sql } from '@/lib/db';

const APP_TOKEN_PREFIX = 'app-token:';
const APP_AUTH_SECRET = process.env.APP_AUTH_SECRET || 'app-auth-secret';

export type AuthenticatedUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  platformRole: string;
  status: string;
  transportId: number | null;
  transportName: string | null;
  transportSlug: string | null;
  transportStatus: string | null;
  subscription: {
    plan: string | null;
    status: 'none' | 'active' | 'near_expiry' | 'expired';
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    warningDays: number;
    message: string | null;
  };
};

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  platform_role: string;
  status: string;
  transport_id: number | null;
  transport_name: string | null;
  transport_slug: string | null;
  transport_status: string | null;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_warning_days: number | null;
};

function signToken(payload: string) {
  return createHash('sha256')
    .update(`${payload}:${APP_AUTH_SECRET}`)
    .digest('hex');
}

function diffInDays(endDate: Date) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.ceil((end.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function buildSubscription(row: UserRow): AuthenticatedUser['subscription'] {
  if (!row.transport_id) {
    return {
      plan: null,
      status: 'none',
      startDate: null,
      endDate: null,
      daysRemaining: null,
      warningDays: 0,
      message: null,
    };
  }

  const warningDays = Number(row.subscription_warning_days || 7);
  if (!row.subscription_end_date) {
    return {
      plan: row.subscription_plan,
      status: 'active',
      startDate: row.subscription_start_date,
      endDate: null,
      daysRemaining: null,
      warningDays,
      message: null,
    };
  }

  const daysRemaining = diffInDays(new Date(row.subscription_end_date));
  if (daysRemaining < 0) {
    return {
      plan: row.subscription_plan,
      status: 'expired',
      startDate: row.subscription_start_date,
      endDate: row.subscription_end_date,
      daysRemaining,
      warningDays,
      message: `Subscription expired on ${new Date(row.subscription_end_date).toLocaleDateString('en-IN')}.`,
    };
  }

  if (daysRemaining <= warningDays) {
    return {
      plan: row.subscription_plan,
      status: 'near_expiry',
      startDate: row.subscription_start_date,
      endDate: row.subscription_end_date,
      daysRemaining,
      warningDays,
      message: `Subscription will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
    };
  }

  return {
    plan: row.subscription_plan,
    status: 'active',
    startDate: row.subscription_start_date,
    endDate: row.subscription_end_date,
    daysRemaining,
    warningDays,
    message: null,
  };
}

export function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  return {
    id: Number(row.id),
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    platformRole: row.platform_role,
    status: row.status,
    transportId: row.transport_id === null ? null : Number(row.transport_id),
    transportName: row.transport_name,
    transportSlug: row.transport_slug,
    transportStatus: row.transport_status,
    subscription: buildSubscription(row),
  };
}

export async function getUserByEmail(email: string) {
  await ensureSchema();
  const { rows } = await sql<UserRow>`
    SELECT
      users.id,
      users.email,
      users.password_hash,
      users.first_name,
      users.last_name,
      users.role,
      users.platform_role,
      users.status,
      users.transport_id,
      transports.company_name AS transport_name,
      transports.slug AS transport_slug,
      transports.status AS transport_status,
      transports.subscription_plan,
      transports.subscription_start_date::text,
      transports.subscription_end_date::text,
      transports.subscription_warning_days
    FROM users
    LEFT JOIN transports ON transports.id = users.transport_id
    WHERE LOWER(users.email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
}

async function getUserById(id: number) {
  await ensureSchema();
  const { rows } = await sql<UserRow>`
    SELECT
      users.id,
      users.email,
      users.password_hash,
      users.first_name,
      users.last_name,
      users.role,
      users.platform_role,
      users.status,
      users.transport_id,
      transports.company_name AS transport_name,
      transports.slug AS transport_slug,
      transports.status AS transport_status,
      transports.subscription_plan,
      transports.subscription_start_date::text,
      transports.subscription_end_date::text,
      transports.subscription_warning_days
    FROM users
    LEFT JOIN transports ON transports.id = users.transport_id
    WHERE users.id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}

export function createAppToken(user: { id: number; email: string; password_hash: string }) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      signature: signToken(`${user.id}:${user.email}:${user.password_hash}`),
    })
  ).toString('base64url');

  return `${APP_TOKEN_PREFIX}${payload}`;
}

export async function verifyAppToken(token: string) {
  await ensureSchema();

  if (!token.startsWith(APP_TOKEN_PREFIX)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(APP_TOKEN_PREFIX.length), 'base64url').toString('utf8')
    ) as { id?: number; email?: string; signature?: string };

    if (!payload.id || !payload.email || !payload.signature) return null;

    const row = await getUserById(payload.id);
    if (!row) return null;
    if (row.status !== 'active') return null;
    if (row.transport_id && row.transport_status && row.transport_status !== 'active') return null;
    if (row.email.toLowerCase() !== payload.email.toLowerCase()) return null;

    const expectedSignature = signToken(`${row.id}:${row.email}:${row.password_hash}`);
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(payload.signature, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }

    return toAuthenticatedUser(row);
  } catch {
    return null;
  }
}

export function readAppToken(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export async function requireAppUser(request: Request) {
  const token = readAppToken(request);
  if (!token) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Login required' },
        { status: 401 }
      ),
    };
  }

  const user = await verifyAppToken(token);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

export async function requireSuperAdmin(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response) return { user: null, response };
  if (user?.platformRole !== 'super_admin') {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}
