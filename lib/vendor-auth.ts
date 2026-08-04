import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

const VENDOR_TOKEN_PREFIX = 'vendor-token:';
const VENDOR_AUTH_SECRET = process.env.VENDOR_AUTH_SECRET || 'vendor-auth-secret';

function signVendorToken(payload: string) {
  return createHash('sha256').update(`${payload}:${VENDOR_AUTH_SECRET}`).digest('hex');
}

export function hashVendorPassword(password: string) {
  return createHash('sha256').update(password.trim()).digest('hex');
}

export function createVendorToken(vendor: { id: number; username: string; password_hash: string }) {
  const payload = Buffer.from(
    JSON.stringify({
      id: vendor.id,
      username: vendor.username,
      signature: signVendorToken(`${vendor.id}:${vendor.username}:${vendor.password_hash}`),
    })
  ).toString('base64url');

  return `${VENDOR_TOKEN_PREFIX}${payload}`;
}

function readVendorToken(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.startsWith(VENDOR_TOKEN_PREFIX) ? token : null;
}

export async function verifyVendorToken(token: string) {
  await ensureSchema();

  if (!token.startsWith(VENDOR_TOKEN_PREFIX)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(VENDOR_TOKEN_PREFIX.length), 'base64url').toString('utf8')
    ) as { id?: number; username?: string; signature?: string };

    if (!payload.id || !payload.username || !payload.signature) return null;

    const { rows } = await sql`
      SELECT *
      FROM vendors
      WHERE id = ${payload.id}
        AND LOWER(username) = LOWER(${payload.username})
        AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const vendor = rows[0];
    const expectedSignature = signVendorToken(`${vendor.id}:${vendor.username}:${vendor.password_hash}`);

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(payload.signature, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }

    return vendor;
  } catch {
    return null;
  }
}

export async function requireVendor(request: Request) {
  const token = readVendorToken(request);
  if (!token) {
    return {
      vendor: null,
      response: NextResponse.json({ success: false, error: 'Vendor login required' }, { status: 401 }),
    };
  }

  const vendor = await verifyVendorToken(token);
  if (!vendor) {
    return {
      vendor: null,
      response: NextResponse.json({ success: false, error: 'Invalid or expired vendor session' }, { status: 401 }),
    };
  }

  return { vendor, response: null };
}
