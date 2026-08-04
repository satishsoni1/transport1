import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

async function requireHrAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'manage-users')) {
    return { ok: false as const, error: 'Your role does not permit managing HR records', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

export async function GET(request: NextRequest) {
  const auth = await requireHrAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT staff_leave_requests.*, users.first_name, users.last_name
      FROM staff_leave_requests
      JOIN users ON users.id = staff_leave_requests.user_id
      WHERE staff_leave_requests.transport_id = ${auth.transportId}
      ORDER BY staff_leave_requests.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching leave requests', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireHrAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const userId = Number(body.user_id);
    const fromDate = String(body.from_date || '').trim();
    const toDate = String(body.to_date || '').trim();

    if (!userId || !fromDate || !toDate) {
      return NextResponse.json({ success: false, error: 'Staff member, from date, and to date are required' }, { status: 400 });
    }

    const { rows: userRows } = await sql`SELECT id FROM users WHERE id = ${userId} AND transport_id = ${auth.transportId}`;
    if (userRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    const { rows } = await sql`
      INSERT INTO staff_leave_requests (transport_id, user_id, leave_type, from_date, to_date, reason, status)
      VALUES (
        ${auth.transportId}, ${userId}, ${String(body.leave_type || 'casual').trim()},
        ${fromDate}, ${toDate}, ${String(body.reason || '').trim()}, 'pending'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating leave request', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
