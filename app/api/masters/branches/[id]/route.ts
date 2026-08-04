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
      return NextResponse.json({ success: false, error: 'Invalid branch id' }, { status: 400 });
    }
    const { rows: existingRows } = await sql`SELECT * FROM branches WHERE id = ${id} AND transport_id = ${auth.transportId}`;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const body = await request.json();
    const branchName = body.branch_name === undefined ? existing.branch_name : String(body.branch_name).trim();
    if (!branchName) {
      return NextResponse.json({ success: false, error: 'Branch name is required' }, { status: 400 });
    }
    const { rows } = await sql`
      UPDATE branches
      SET branch_name = ${branchName}, address = ${body.address ?? existing.address},
        city = ${body.city ?? existing.city}, status = ${body.status ?? existing.status}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating branch', error);
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
      return NextResponse.json({ success: false, error: 'Invalid branch id' }, { status: 400 });
    }
    const { rows } = await sql`DELETE FROM branches WHERE id = ${id} AND transport_id = ${auth.transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting branch', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
