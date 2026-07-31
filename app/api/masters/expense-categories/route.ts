import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

const DEFAULT_CATEGORIES: Array<{ name: string; category_type: 'expense' | 'income' }> = [
  { name: 'Fuel', category_type: 'expense' },
  { name: 'Toll / Parking', category_type: 'expense' },
  { name: 'Repair & Maintenance', category_type: 'expense' },
  { name: 'Insurance', category_type: 'expense' },
  { name: 'RTO / Tax', category_type: 'expense' },
  { name: 'Office Expense', category_type: 'expense' },
  { name: 'Other', category_type: 'expense' },
  { name: 'Freight Income', category_type: 'income' },
  { name: 'Vehicle Rent Income', category_type: 'income' },
  { name: 'Other', category_type: 'income' },
];

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

export async function GET(request: NextRequest) {
  const auth = await requireAccountsAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();

    const { rows: existing } = await sql`
      SELECT * FROM expense_income_categories WHERE transport_id = ${auth.transportId}
    `;

    if (existing.length === 0) {
      for (const category of DEFAULT_CATEGORIES) {
        await sql`
          INSERT INTO expense_income_categories (transport_id, name, category_type)
          VALUES (${auth.transportId}, ${category.name}, ${category.category_type})
        `;
      }
      const { rows: seeded } = await sql`
        SELECT * FROM expense_income_categories WHERE transport_id = ${auth.transportId}
        ORDER BY category_type, name
      `;
      return NextResponse.json(seeded, { status: 200 });
    }

    return NextResponse.json(
      existing.sort((a, b) => a.category_type.localeCompare(b.category_type) || a.name.localeCompare(b.name)),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expense categories', error);
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
    const name = String(body.name || '').trim();
    const categoryType = body.category_type === 'income' ? 'income' : 'expense';

    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const { rows: duplicateRows } = await sql`
      SELECT id FROM expense_income_categories
      WHERE transport_id = ${auth.transportId} AND category_type = ${categoryType} AND LOWER(name) = LOWER(${name})
      LIMIT 1
    `;
    if (duplicateRows.length > 0) {
      return NextResponse.json({ success: false, error: 'This category already exists' }, { status: 409 });
    }

    const { rows } = await sql`
      INSERT INTO expense_income_categories (transport_id, name, category_type, status)
      VALUES (${auth.transportId}, ${name}, ${categoryType}, ${body.status === 'inactive' ? 'inactive' : 'active'})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating expense category', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
