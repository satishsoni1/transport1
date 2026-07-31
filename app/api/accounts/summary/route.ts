import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

// Read-only aggregate — visible to any logged-in staff member (same as the revenue
// figures already shown on the dashboard), unlike the entry CRUD routes which require
// the 'accounts' permission.
export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get('from') || '').trim();
    const to = String(searchParams.get('to') || '').trim();

    const { rows: totalsRows } = await sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'income'), 0) AS total_income,
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'expense'), 0) AS total_expense
      FROM expense_income_entries
      WHERE transport_id = ${transportId}
        AND (${from} = '' OR entry_date::date >= NULLIF(${from}, '')::date)
        AND (${to} = '' OR entry_date::date <= NULLIF(${to}, '')::date)
    `;

    const { rows: monthlyRows } = await sql`
      SELECT
        TO_CHAR(entry_date::date, 'YYYY-MM') AS month,
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'income'), 0) AS income,
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'expense'), 0) AS expense
      FROM expense_income_entries
      WHERE transport_id = ${transportId}
        AND entry_date::date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY month
      ORDER BY month
    `;

    const totalIncome = Number(totalsRows[0]?.total_income || 0);
    const totalExpense = Number(totalsRows[0]?.total_expense || 0);

    return NextResponse.json(
      {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        monthly: monthlyRows.map((row) => ({
          month: row.month,
          income: Number(row.income),
          expense: Number(row.expense),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error building accounts summary', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
