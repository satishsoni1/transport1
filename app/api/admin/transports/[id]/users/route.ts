import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/app-auth';
import { ensureSchema, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { id } = await params;
    const transportId = Number(id);
    if (!Number.isFinite(transportId) || transportId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transport id' }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT id, email, username, first_name, last_name, role, platform_role, status, created_at
      FROM users
      WHERE transport_id = ${transportId}
      ORDER BY platform_role DESC, created_at ASC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching transport users', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: adminUser, response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { id } = await params;
    const transportId = Number(id);
    if (!Number.isFinite(transportId) || transportId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transport id' }, { status: 400 });
    }

    const body = await request.json();
    const userId = Number(body.user_id);
    const newPassword = String(body.new_password || '').trim();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'user_id and new_password are required' },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT id, email FROM users WHERE id = ${userId} AND transport_id = ${transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId} AND transport_id = ${transportId}`;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'UPDATE',
        'user_password',
        ${String(userId)},
        ${`Super admin reset password for ${existingRows[0].email}`},
        ${adminUser?.email || 'system'}
      )
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error resetting password', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
