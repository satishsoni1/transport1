import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const STATUSES = new Set(['present', 'absent', 'half_day', 'leave']);

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
    const { searchParams } = new URL(request.url);
    const date = String(searchParams.get('date') || '').trim() || new Date().toISOString().slice(0, 10);

    const { rows } = await sql`
      SELECT users.id AS user_id, users.first_name, users.last_name, users.role,
        staff_attendance.id AS attendance_id, staff_attendance.status, staff_attendance.remarks
      FROM users
      LEFT JOIN staff_attendance ON staff_attendance.user_id = users.id AND staff_attendance.attendance_date = ${date}
      WHERE users.transport_id = ${auth.transportId} AND users.status = 'active'
      ORDER BY users.first_name ASC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance', error);
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
    const attendanceDate = String(body.attendance_date || '').trim();
    const status = String(body.status || '');

    if (!userId || !attendanceDate) {
      return NextResponse.json({ success: false, error: 'user_id and attendance_date are required' }, { status: 400 });
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: `status must be one of ${[...STATUSES].join(', ')}` }, { status: 400 });
    }

    const { rows: userRows } = await sql`SELECT id FROM users WHERE id = ${userId} AND transport_id = ${auth.transportId}`;
    if (userRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    const { rows } = await sql`
      INSERT INTO staff_attendance (transport_id, user_id, attendance_date, status, remarks)
      VALUES (${auth.transportId}, ${userId}, ${attendanceDate}, ${status}, ${String(body.remarks || '').trim()})
      ON CONFLICT (user_id, attendance_date) DO UPDATE
        SET status = EXCLUDED.status, remarks = EXCLUDED.remarks
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error saving attendance', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
