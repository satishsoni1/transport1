import { NextResponse } from 'next/server';

import { verifyAppToken } from '@/lib/app-auth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid token' },
      { status: 401 }
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const user = await verifyAppToken(token);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      user,
    },
    { status: 200 }
  );
}
