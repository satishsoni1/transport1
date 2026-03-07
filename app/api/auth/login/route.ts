import { NextResponse } from 'next/server';

// Very simple in-memory demo user.
// In a real app, you would verify against a database.
const DEMO_USER = {
  id: 1,
  email: 'admin@trimurti.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'Admin',
};

const DEMO_PASSWORD = 'admin123';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (email !== DEMO_USER.email || password !== DEMO_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // For demo purposes we return a fake token string.
    const token = 'demo-token';

    return NextResponse.json(
      {
        success: true,
        token,
        user: DEMO_USER,
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

