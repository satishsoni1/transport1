import { NextResponse } from 'next/server';
import { createAppToken, toAuthenticatedUser, verifyPending2faToken } from '@/lib/app-auth';
import { verifyTotpToken } from '@/lib/totp';
import { ensureSchema } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { pending_token, code } = await request.json();

    if (!pending_token || !code) {
      return NextResponse.json({ success: false, error: 'Pending token and code are required' }, { status: 400 });
    }

    const user = await verifyPending2faToken(String(pending_token));
    if (!user) {
      return NextResponse.json({ success: false, error: 'Login session expired — please sign in again' }, { status: 401 });
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ success: false, error: '2FA is not enabled for this account' }, { status: 400 });
    }

    if (!verifyTotpToken(user.totp_secret, String(code))) {
      return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 401 });
    }

    const token = createAppToken(user);
    return NextResponse.json({ success: true, token, user: toAuthenticatedUser(user) }, { status: 200 });
  } catch (error) {
    console.error('2FA verify error', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
