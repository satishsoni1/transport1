import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

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
      return NextResponse.json({ success: false, error: 'Invalid category id' }, { status: 400 });
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`
      SELECT * FROM expense_income_categories WHERE id = ${id} AND transport_id = ${auth.transportId}
    `;
    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const name = String(body.name ?? existing.name).trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE expense_income_categories
      SET
        name = ${name},
        status = ${body.status ?? existing.status}
      WHERE id = ${id} AND transport_id = ${auth.transportId}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating expense category', error);
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
      return NextResponse.json({ success: false, error: 'Invalid category id' }, { status: 400 });
    }

    const { rows } = await sql`
      DELETE FROM expense_income_categories WHERE id = ${id} AND transport_id = ${auth.transportId} RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expense category', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
