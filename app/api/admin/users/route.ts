import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/app-auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { email, username, password, firstName, lastName, role = 'Operator', transportId } = await request.json();
    const cleanUsername = String(username || '').trim();

    if (!email || !cleanUsername || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, first name and last name are required' },
        { status: 400 }
      );
    }

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

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sql`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role, transport_id)
      VALUES (${email}, ${cleanUsername}, ${passwordHash}, ${firstName}, ${lastName}, ${role}, ${transportId || null})
      RETURNING id, email, username, first_name, last_name, role, transport_id, created_at
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
          transportId: newUser.transport_id,
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

export async function GET(request: Request) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const transportIdParam = searchParams.get('transport_id');
    const transportId = transportIdParam ? Number(transportIdParam) : null;

    const { rows } = await sql`
      SELECT
        users.id,
        users.email,
        users.username,
        users.first_name,
        users.last_name,
        users.role,
        users.platform_role,
        users.status,
        users.transport_id,
        transports.company_name AS transport_name,
        users.created_at,
        users.updated_at
      FROM users
      LEFT JOIN transports ON transports.id = users.transport_id
      WHERE (${transportId}::integer IS NULL OR users.transport_id = ${transportId})
      ORDER BY transports.company_name NULLS LAST, users.created_at DESC
    `;

    const users = rows.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      platformRole: user.platform_role,
      status: user.status,
      transportId: user.transport_id,
      transportName: user.transport_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('Get users API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
