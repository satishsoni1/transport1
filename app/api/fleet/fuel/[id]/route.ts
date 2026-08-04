import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function DELETE(
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
      return NextResponse.json({ success: false, error: 'Invalid fuel entry id' }, { status: 400 });
    }

    const { rows } = await sql`
      DELETE FROM fuel_entries WHERE id = ${id} AND transport_id = ${transportId} RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fuel entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fuel entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
