import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { createHash } from 'crypto';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid consignor id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM consignors WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Consignor not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const nextUsername = String(body.username ?? existing.username ?? '').trim();
    const submittedPassword = body.password === undefined ? undefined : String(body.password).trim();
    if (!nextUsername && submittedPassword && submittedPassword !== '') {
      return NextResponse.json(
        { success: false, error: 'Provide both username and password, or leave both blank' },
        { status: 400 }
      );
    }

    if (nextUsername) {
      const { rows: duplicateRows } = await sql`
        SELECT id
        FROM consignors
        WHERE id <> ${id}
          AND LOWER(username) = LOWER(${nextUsername})
        LIMIT 1
      `;

      if (duplicateRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Consignor username already exists' },
          { status: 400 }
        );
      }
    }

    const clearLogin = !nextUsername;
    const passwordHash = clearLogin
      ? ''
      : submittedPassword && submittedPassword !== ''
        ? createHash('sha256').update(submittedPassword).digest('hex')
        : String(existing.password_hash || '');

    const { rows } = await sql`
      UPDATE consignors
      SET
        name = ${body.name ?? existing.name},
        name_mr = ${body.name_mr ?? existing.name_mr},
        username = ${nextUsername},
        password = '',
        password_hash = ${passwordHash},
        address = ${body.address ?? existing.address},
        city = ${body.city ?? existing.city},
        gst_no = ${body.gst_no ?? existing.gst_no},
        contact_person = ${body.contact_person ?? existing.contact_person},
        mobile = ${body.mobile ?? existing.mobile},
        bank_name = ${body.bank_name ?? existing.bank_name},
        account_no = ${body.account_no ?? existing.account_no},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING id, name, name_mr, username, address, city, gst_no, contact_person, mobile, bank_name, account_no, status, created_at
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating consignor', error);
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
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid consignor id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM consignors WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Consignor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting consignor', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
