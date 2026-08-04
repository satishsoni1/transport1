import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

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
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid cost center id' }, { status: 400 });
    }
    const { rows: existingRows } = await sql`SELECT * FROM cost_centers WHERE id = ${id} AND transport_id = ${auth.transportId}`;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const body = await request.json();
    const name = body.name === undefined ? existing.name : String(body.name).trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const { rows } = await sql`
      UPDATE cost_centers
      SET name = ${name}, description = ${body.description ?? existing.description}, status = ${body.status ?? existing.status}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating cost center', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
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
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid cost center id' }, { status: 400 });
    }
    const { rows } = await sql`DELETE FROM cost_centers WHERE id = ${id} AND transport_id = ${auth.transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cost center', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
