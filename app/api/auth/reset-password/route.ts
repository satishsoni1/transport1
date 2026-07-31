import { createHash } from 'crypto';
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const token = String(body.token || '').trim();
    const password = String(body.password || '').trim();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: 'Token and new password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { rows } = await sql`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > NOW()
      LIMIT 1
    `;
    const resetToken = rows[0];
    if (!resetToken) {
      return NextResponse.json({ success: false, error: 'This reset link is invalid or has expired' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${resetToken.user_id}`;
    await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${resetToken.id}`;

    return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error resetting password', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
