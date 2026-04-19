import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, username, password, firstName, lastName, role = 'User' } = await request.json();
    const cleanUsername = String(username || '').trim();

    if (!email || !cleanUsername || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, first name and last name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users
      WHERE LOWER(email) = LOWER(${email})
         OR LOWER(username) = LOWER(${cleanUsername})
    `;

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await sql`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role)
      VALUES (${email}, ${cleanUsername}, ${passwordHash}, ${firstName}, ${lastName}, ${role})
      RETURNING id, email, username, first_name, last_name, role, created_at
    `;

    const newUser = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await sql`
      SELECT id, email, username, first_name, last_name, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return NextResponse.json(
      { success: true, users },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
