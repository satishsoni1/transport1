import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '@/lib/db';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bank id' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM banks WHERE id = ${id}`;
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
      WHERE id = ${id}
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
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bank id' },
        { status: 400 }
      );
    }
    const { rows } = await sql`DELETE FROM banks WHERE id = ${id} RETURNING id`;
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
