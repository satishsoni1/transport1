import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAppToken, getUserByEmail, toAuthenticatedUser } from '@/lib/app-auth';
import { ensureSchema } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(String(email).trim());
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This login is inactive. Contact support.' },
        { status: 403 }
      );
    }
    if (user.transport_id && user.transport_status && user.transport_status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This transport account is inactive. Contact support.' },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = createAppToken(user);

    return NextResponse.json(
      {
        success: true,
        token,
        user: toAuthenticatedUser(user),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
