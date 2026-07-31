import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const ENTRY_TYPES = ['expense', 'income'] as const;
const PAYMENT_MODES = ['cash', 'bank', 'cheque'] as const;

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
  return { ok: true as const, transportId: user.transportId, userName: `${user.firstName} ${user.lastName}`.trim() };
}

export async function GET(request: NextRequest) {
  const auth = await requireAccountsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get('from') || '').trim();
    const to = String(searchParams.get('to') || '').trim();

    const { rows } = await sql`
      SELECT
        entries.*,
        categories.name AS category_name,
        vehicles.vehicle_no,
        drivers.driver_name
      FROM expense_income_entries entries
      LEFT JOIN expense_income_categories categories ON categories.id = entries.category_id
      LEFT JOIN vehicles ON vehicles.id = entries.vehicle_id
      LEFT JOIN drivers ON drivers.id = entries.driver_id
      WHERE entries.transport_id = ${auth.transportId}
        AND (${from} = '' OR entries.entry_date::date >= NULLIF(${from}, '')::date)
        AND (${to} = '' OR entries.entry_date::date <= NULLIF(${to}, '')::date)
      ORDER BY entries.entry_date DESC, entries.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching accounts entries', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAccountsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const body = await request.json();

    const entryType = String(body.entry_type || '');
    const paymentMode = String(body.payment_mode || 'cash');
    const amount = Number(body.amount);
    const entryDate = String(body.entry_date || '').trim();

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
    if (!entryDate) {
      return NextResponse.json({ success: false, error: 'Entry date is required' }, { status: 400 });
    }

    // category_id/vehicle_id/driver_id are selected from the caller's own tenant lists client-side,
    // not blindly trusted — verify ownership and silently drop rather than reject if they don't resolve.
    const categoryId = body.category_id
      ? (await sql`SELECT id FROM expense_income_categories WHERE id = ${Number(body.category_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
      : null;
    const vehicleId = body.vehicle_id
      ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
      : null;
    const driverId = body.driver_id
      ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${auth.transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO expense_income_entries (
        transport_id, entry_type, category_id, amount, entry_date, payment_mode,
        cheque_no, cheque_date, bank_name, vehicle_id, driver_id, remarks, attachment_url, created_by
      )
      VALUES (
        ${auth.transportId},
        ${entryType},
        ${categoryId},
        ${amount},
        ${entryDate},
        ${paymentMode},
        ${String(body.cheque_no || '').trim()},
        ${String(body.cheque_date || '').trim()},
        ${String(body.bank_name || '').trim()},
        ${vehicleId},
        ${driverId},
        ${String(body.remarks || '').trim()},
        ${String(body.attachment_url || '').trim()},
        ${auth.userName}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating accounts entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
