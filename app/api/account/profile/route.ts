import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import {
  createAppToken,
  getUserByEmail,
  getUserById,
  requireAppUser,
  toAuthenticatedUser,
} from '@/lib/app-auth';
import { ensureSchema, sql } from '@/lib/db';

export async function GET(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response || !user) return response;

  try {
    await ensureSchema();
    const row = await getUserById(user.id);
    if (!row) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        platform_role: row.platform_role,
        status: row.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const { user, response } = await requireAppUser(request);
  if (response || !user) return response;

  try {
    await ensureSchema();
    const body = await request.json();
    const existing = await getUserById(user.id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const email = String(body.email ?? existing.email).trim().toLowerCase();
    const firstName = String(body.first_name ?? existing.first_name).trim();
    const lastName = String(body.last_name ?? existing.last_name).trim();
    const currentPassword = String(body.current_password ?? '');
    const newPassword = String(body.new_password ?? '');
    const confirmPassword = String(body.confirm_password ?? '');

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'First name, last name and username are required' },
        { status: 400 }
      );
    }

    if (email !== existing.email.toLowerCase()) {
      const duplicate = await getUserByEmail(email);
      if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
        return NextResponse.json(
          { success: false, error: 'This username is already in use' },
          { status: 409 }
        );
      }
    }

    const changingPassword = Boolean(newPassword || confirmPassword);
    if (changingPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }
      const passwordMatches = await bcrypt.compare(currentPassword, existing.password_hash);
      if (!passwordMatches) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'New password and confirm password do not match' },
          { status: 400 }
        );
      }
    }

    const nextPasswordHash = changingPassword
      ? await bcrypt.hash(newPassword, 10)
      : existing.password_hash;

    const { rows } = await sql`
      UPDATE users
      SET
        email = ${email},
        first_name = ${firstName},
        last_name = ${lastName},
        password_hash = ${nextPasswordHash},
        updated_at = NOW()
      WHERE id = ${existing.id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const updated = await getUserById(existing.id);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Updated profile not found' },
        { status: 500 }
      );
    }

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'UPDATE',
        'profile',
        ${String(existing.id)},
        ${`Updated profile for ${updated.email}`},
        ${`${updated.first_name} ${updated.last_name}`.trim()}
      )
    `;

    const token = createAppToken(updated);
    return NextResponse.json(
      {
        success: true,
        token,
        user: toAuthenticatedUser(updated),
        message: changingPassword ? 'Profile and password updated successfully' : 'Profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
