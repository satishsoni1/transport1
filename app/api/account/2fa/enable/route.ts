import { NextResponse } from 'next/server';
import { requireAppUser } from '@/lib/app-auth';
import { verifyTotpToken } from '@/lib/totp';
import { ensureSchema, sql } from '@/lib/db';

export async function POST(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { code } = await request.json();

    const { rows } = await sql`SELECT totp_secret FROM users WHERE id = ${user.id}`;
    const secret = rows[0]?.totp_secret;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Start 2FA setup first' }, { status: 400 });
    }
    if (!verifyTotpToken(secret, String(code || ''))) {
      return NextResponse.json({ success: false, error: 'Invalid code — check your authenticator app and try again' }, { status: 400 });
    }

    await sql`UPDATE users SET totp_enabled = TRUE WHERE id = ${user.id}`;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error enabling 2FA', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
