import { randomBytes, createHash } from 'crypto';
import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { getUserByEmail } from '@/lib/app-auth';
import { sendEmail } from '@/lib/email-service';

const GENERIC_MESSAGE = 'If an account exists for that email, a reset link has been sent.';
const TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const email = String(body.email || '').trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (user && user.status === 'active') {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `;

      const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;
      const result = await sendEmail({
        transportId: user.transport_id,
        to: user.email,
        subject: 'Reset your password',
        html: `
          <p>Hello ${user.first_name || ''},</p>
          <p>We received a request to reset your password. This link expires in 30 minutes.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      if (!result.sent) {
        console.error('Password reset email not sent:', result.reason);
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error('Error processing forgot-password request', error);
    // Still return the generic message — never leak whether the account exists via errors either.
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { status: 200 });
  }
}
