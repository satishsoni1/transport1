import { NextResponse } from 'next/server';
import { requireAppUser } from '@/lib/app-auth';
import { ensureSchema, sql } from '@/lib/db';

export async function POST(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response) return response;

  try {
    await ensureSchema();
    await sql`UPDATE users SET totp_enabled = FALSE, totp_secret = '' WHERE id = ${user.id}`;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error disabling 2FA', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
