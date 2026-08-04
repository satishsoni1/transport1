import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);

async function requirePartiesAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'parties')) {
    return { ok: false as const, error: 'Your role does not permit managing complaints', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartiesAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid complaint id' }, { status: 400 });
    }

    const body = await request.json();
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ success: false, error: `status must be one of ${[...STATUSES].join(', ')}` }, { status: 400 });
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM complaints WHERE id = ${id} AND transport_id = ${auth.transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Complaint not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const isResolvedNow = body.status === 'resolved' || body.status === 'closed';

    const { rows } = await sql`
      UPDATE complaints
      SET
        status = ${body.status},
        resolution_remarks = ${body.resolution_remarks ?? existing.resolution_remarks},
        resolved_at = ${isResolvedNow ? existing.resolved_at || new Date() : existing.resolved_at}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating complaint', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
