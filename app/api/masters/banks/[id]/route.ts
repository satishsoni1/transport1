import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

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
    const id = Number(rawId);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bank id' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM banks WHERE id = ${id} AND transport_id = ${transportId}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const { rows } = await sql`
      UPDATE banks
      SET
        bank_name = ${body.bank_name ?? existing.bank_name},
        branch = ${body.branch ?? existing.branch},
        ifsc_code = ${body.ifsc_code ?? existing.ifsc_code},
        account_no = ${body.account_no ?? existing.account_no},
        account_holder = ${body.account_holder ?? existing.account_holder}
      WHERE id = ${id} AND transport_id = ${transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating bank', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
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
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bank id' },
        { status: 400 }
      );
    }
    const { rows } = await sql`DELETE FROM banks WHERE id = ${id} AND transport_id = ${transportId} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bank not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting bank', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
