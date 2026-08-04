import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const STATUSES = new Set(['open', 'reviewed', 'closed']);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid incident id' }, { status: 400 });
    }

    const body = await request.json();
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ success: false, error: `status must be one of ${[...STATUSES].join(', ')}` }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE incident_reports SET status = ${body.status}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating incident', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
