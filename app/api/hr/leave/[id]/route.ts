import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const STATUSES = new Set(['pending', 'approved', 'rejected']);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return NextResponse.json({ success: false, error: 'Access denied: transport admin account required' }, { status: 403 });
  }
  if (!can(user, 'manage-users')) {
    return NextResponse.json({ success: false, error: 'Your role does not permit managing HR records' }, { status: 403 });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid leave request id' }, { status: 400 });
    }

    const body = await request.json();
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ success: false, error: `status must be one of ${[...STATUSES].join(', ')}` }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE staff_leave_requests SET status = ${body.status}
      WHERE id = ${id} AND transport_id = ${user.transportId}
      RETURNING *
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating leave request', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
