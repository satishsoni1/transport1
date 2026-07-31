import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const ENTRY_TYPES = ['expense', 'income'] as const;
const PAYMENT_MODES = ['cash', 'bank', 'cheque'] as const;

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

async function requireAccountsAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'accounts')) {
    return { ok: false as const, error: 'Your role does not permit managing accounts', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccountsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid entry id' }, { status: 400 });
    }

    const { rows: existingRows } = await sql`
      SELECT * FROM expense_income_entries WHERE id = ${id} AND transport_id = ${auth.transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    const existing = existingRows[0];

    const body = await request.json();
    const entryType = body.entry_type === undefined ? existing.entry_type : String(body.entry_type);
    const paymentMode = body.payment_mode === undefined ? existing.payment_mode : String(body.payment_mode);
    const amount = body.amount === undefined ? existing.amount : Number(body.amount);

    if (!ENTRY_TYPES.includes(entryType as (typeof ENTRY_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: `entry_type must be one of ${ENTRY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!PAYMENT_MODES.includes(paymentMode as (typeof PAYMENT_MODES)[number])) {
      return NextResponse.json(
        { success: false, error: `payment_mode must be one of ${PAYMENT_MODES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 });
    }

    const categoryId =
      body.category_id === undefined
        ? existing.category_id
        : body.category_id
          ? (await sql`SELECT id FROM expense_income_categories WHERE id = ${Number(body.category_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
          : null;
    const vehicleId =
      body.vehicle_id === undefined
        ? existing.vehicle_id
        : body.vehicle_id
          ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
          : null;
    const driverId =
      body.driver_id === undefined
        ? existing.driver_id
        : body.driver_id
          ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
          : null;

    const { rows } = await sql`
      UPDATE expense_income_entries
      SET
        entry_type = ${entryType},
        category_id = ${categoryId},
        amount = ${amount},
        entry_date = ${body.entry_date ?? existing.entry_date},
        payment_mode = ${paymentMode},
        cheque_no = ${body.cheque_no ?? existing.cheque_no},
        cheque_date = ${body.cheque_date ?? existing.cheque_date},
        bank_name = ${body.bank_name ?? existing.bank_name},
        vehicle_id = ${vehicleId},
        driver_id = ${driverId},
        remarks = ${body.remarks ?? existing.remarks},
        attachment_url = ${body.attachment_url ?? existing.attachment_url}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating accounts entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccountsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid entry id' }, { status: 400 });
    }

    const { rows } = await sql`
      DELETE FROM expense_income_entries WHERE id = ${id} AND transport_id = ${auth.transportId} RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting accounts entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
