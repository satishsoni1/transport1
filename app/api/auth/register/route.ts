import { NextResponse } from 'next/server';

// This is a stubbed implementation just to satisfy the frontend.
// It always "succeeds" and echoes back a fake user.

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, role } = await request.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = {
      id: Date.now(),
      email,
      firstName,
      lastName,
      role,
    };

    const token = 'demo-token';

    return NextResponse.json(
      {
        success: true,
        token,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

