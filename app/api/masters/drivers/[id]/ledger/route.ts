import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const ENTRY_TYPES = ['advance', 'rent', 'deduction'] as const;

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

async function requireLogisticsAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'logistics')) {
    return { ok: false as const, error: 'Your role does not permit managing driver records', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId, userName: `${user.firstName} ${user.lastName}`.trim() };
}

function computeBalance(entries: { entry_type: string; amount: number }[]) {
  return entries.reduce((balance, entry) => {
    if (entry.entry_type === 'rent') return balance + Number(entry.amount);
    return balance - Number(entry.amount);
  }, 0);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireLogisticsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const driverId = parseId(rawId);
    if (driverId === null) {
      return NextResponse.json({ success: false, error: 'Invalid driver id' }, { status: 400 });
    }

    const { rows: driverRows } = await sql`
      SELECT id FROM drivers WHERE id = ${driverId} AND transport_id = ${auth.transportId}
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
    }

    const { rows: entries } = await sql`
      SELECT * FROM driver_ledger_entries
      WHERE driver_id = ${driverId} AND transport_id = ${auth.transportId}
      ORDER BY entry_date DESC, id DESC
    `;

    return NextResponse.json(
      { entries, balance: computeBalance(entries) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching driver ledger', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireLogisticsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const driverId = parseId(rawId);
    if (driverId === null) {
      return NextResponse.json({ success: false, error: 'Invalid driver id' }, { status: 400 });
    }

    const { rows: driverRows } = await sql`
      SELECT id FROM drivers WHERE id = ${driverId} AND transport_id = ${auth.transportId}
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
    }

    const body = await request.json();
    const entryType = String(body.entry_type || '');
    const amount = Number(body.amount);
    const entryDate = String(body.entry_date || '').trim();

    if (!ENTRY_TYPES.includes(entryType as (typeof ENTRY_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: `entry_type must be one of ${ENTRY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!entryDate) {
      return NextResponse.json({ success: false, error: 'Entry date is required' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO driver_ledger_entries (transport_id, driver_id, entry_type, amount, entry_date, remarks, created_by)
      VALUES (
        ${auth.transportId},
        ${driverId},
        ${entryType},
        ${amount},
        ${entryDate},
        ${String(body.remarks || '').trim()},
        ${auth.userName}
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error adding driver ledger entry', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
