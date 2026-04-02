import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

const DRIVER_TOKEN_PREFIX = 'driver-token:';
const DRIVER_AUTH_SECRET = process.env.DRIVER_AUTH_SECRET || 'trimurti-driver-secret';

function signDriverToken(payload: string) {
  return createHash('sha256')
    .update(`${payload}:${DRIVER_AUTH_SECRET}`)
    .digest('hex');
}

export function hashDriverPassword(password: string) {
  return createHash('sha256').update(password.trim()).digest('hex');
}

export function createDriverToken(driver: { id: number; username: string; password_hash: string }) {
  const payload = Buffer.from(
    JSON.stringify({
      id: driver.id,
      username: driver.username,
      signature: signDriverToken(`${driver.id}:${driver.username}:${driver.password_hash}`),
    })
  ).toString('base64url');

  return `${DRIVER_TOKEN_PREFIX}${payload}`;
}

function readDriverToken(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.startsWith(DRIVER_TOKEN_PREFIX) ? token : null;
}

export async function verifyDriverToken(token: string) {
  await ensureSchema();

  if (!token.startsWith(DRIVER_TOKEN_PREFIX)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.slice(DRIVER_TOKEN_PREFIX.length), 'base64url').toString('utf8')
    ) as { id?: number; username?: string; signature?: string };

    if (!payload.id || !payload.username || !payload.signature) return null;

    const { rows } = await sql`
      SELECT *
      FROM drivers
      WHERE id = ${payload.id}
        AND LOWER(username) = LOWER(${payload.username})
        AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const driver = rows[0];
    const expectedSignature = signDriverToken(
      `${driver.id}:${driver.username}:${driver.password_hash}`
    );

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(payload.signature, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }

    return driver;
  } catch {
    return null;
  }
}

export async function requireDriver(request: Request) {
  const token = readDriverToken(request);
  if (!token) {
    return {
      driver: null,
      response: NextResponse.json(
        { success: false, error: 'Driver login required' },
        { status: 401 }
      ),
    };
  }

  const driver = await verifyDriverToken(token);
  if (!driver) {
    return {
      driver: null,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired driver session' },
        { status: 401 }
      ),
    };
  }

  return { driver, response: null };
}
