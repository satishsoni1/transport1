import { NextResponse } from 'next/server';

// Very simple token verification for demo purposes.
// Accepts the hardcoded "demo-token" and returns a dummy user.

const DEMO_USER = {
  id: 1,
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'Admin',
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid token' },
      { status: 401 }
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (token !== 'demo-token') {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: DEMO_USER,
    },
    { status: 200 }
  );
}
