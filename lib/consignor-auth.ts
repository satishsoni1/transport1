import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

const CONSIGNOR_TOKEN_PREFIX = 'consignor-token:';
const CONSIGNOR_AUTH_SECRET =
  process.env.CONSIGNOR_AUTH_SECRET || 'consignor-auth-secret';

function signConsignorToken(payload: string) {
  return createHash('sha256')
    .update(`${payload}:${CONSIGNOR_AUTH_SECRET}`)
    .digest('hex');
}

export function hashConsignorPassword(password: string) {
  return createHash('sha256').update(password.trim()).digest('hex');
}

export function createConsignorToken(consignor: {
  id: number;
  username: string;
  password_hash: string;
}) {
  const payload = Buffer.from(
    JSON.stringify({
      id: consignor.id,
      username: consignor.username,
      signature: signConsignorToken(
        `${consignor.id}:${consignor.username}:${consignor.password_hash}`
      ),
    })
  ).toString('base64url');

  return `${CONSIGNOR_TOKEN_PREFIX}${payload}`;
}

function readConsignorToken(request: Request) {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.startsWith(CONSIGNOR_TOKEN_PREFIX) ? token : null;
}

export async function verifyConsignorToken(token: string) {
  await ensureSchema();

  if (!token.startsWith(CONSIGNOR_TOKEN_PREFIX)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(CONSIGNOR_TOKEN_PREFIX.length), 'base64url').toString('utf8')
    ) as { id?: number; username?: string; signature?: string };

    if (!payload.id || !payload.username || !payload.signature) return null;

    const { rows } = await sql`
      SELECT *
      FROM consignors
      WHERE id = ${payload.id}
        AND LOWER(username) = LOWER(${payload.username})
        AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const consignor = rows[0];
    const expectedSignature = signConsignorToken(
      `${consignor.id}:${consignor.username}:${consignor.password_hash}`
    );

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(payload.signature, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }

    return consignor;
  } catch {
    return null;
  }
}

export async function requireConsignor(request: Request) {
  const token = readConsignorToken(request);
  if (!token) {
    return {
      consignor: null,
      response: NextResponse.json(
        { success: false, error: 'Consignor login required' },
        { status: 401 }
      ),
    };
  }

  const consignor = await verifyConsignorToken(token);
  if (!consignor) {
    return {
      consignor: null,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired consignor session' },
        { status: 401 }
      ),
    };
  }

  return { consignor, response: null };
}
