import { NextResponse } from 'next/server';
import { requireAppUser } from '@/lib/app-auth';
import { generateOtpAuthUrl, generateTotpSecret } from '@/lib/totp';
import { ensureSchema, sql } from '@/lib/db';

/** Generates a new secret (not yet enabled — enabled only after /enable verifies a code). */
export async function POST(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response) return response;

  try {
    await ensureSchema();
    const secret = generateTotpSecret();
    await sql`UPDATE users SET totp_secret = ${secret}, totp_enabled = FALSE WHERE id = ${user.id}`;

    const otpauthUrl = generateOtpAuthUrl(secret, user.email);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return NextResponse.json({ secret, otpauth_url: otpauthUrl, qr_image_url: qrImageUrl }, { status: 200 });
  } catch (error) {
    console.error('Error setting up 2FA', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
