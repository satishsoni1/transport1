import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/app-auth';

export async function GET(request: Request) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();

    const { rows: transportRows } = await sql`
      SELECT
        id,
        company_name,
        slug,
        status,
        subscription_plan,
        subscription_end_date::text,
        subscription_warning_days,
        created_at
      FROM transports
      ORDER BY created_at DESC
    `;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let active = 0;
    let nearExpiry = 0;
    let expired = 0;

    for (const t of transportRows) {
      if (!t.subscription_end_date) {
        active += 1;
        continue;
      }
      const end = new Date(t.subscription_end_date);
      const daysRemaining = Math.ceil(
        (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() -
          startOfToday.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const warningDays = Number(t.subscription_warning_days || 7);
      if (daysRemaining < 0) expired += 1;
      else if (daysRemaining <= warningDays) nearExpiry += 1;
      else active += 1;
    }

    const [{ rows: lrCountRows }, { rows: invoiceRows }, { rows: receiptRows }, { rows: userCountRows }] =
      await Promise.all([
        sql`SELECT COUNT(*)::int AS count FROM lr_entries`,
        sql`SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM invoices`,
        sql`SELECT COALESCE(SUM(received_amount), 0)::numeric AS total FROM receipts`,
        sql`SELECT COUNT(*)::int AS count FROM users WHERE platform_role = 'transport_admin'`,
      ]);

    const { rows: perTransportRows } = await sql`
      SELECT
        transports.id,
        transports.company_name,
        transports.status,
        COUNT(DISTINCT lr_entries.id)::int AS lr_count
      FROM transports
      LEFT JOIN lr_entries ON lr_entries.transport_id = transports.id
      GROUP BY transports.id, transports.company_name, transports.status
      ORDER BY lr_count DESC
      LIMIT 10
    `;

    return NextResponse.json(
      {
        transports: {
          total: transportRows.length,
          active,
          nearExpiry,
          expired,
          recent: transportRows.slice(0, 5),
        },
        totals: {
          lrCount: Number(lrCountRows[0]?.count || 0),
          invoicedAmount: Number(invoiceRows[0]?.total || 0),
          receivedAmount: Number(receiptRows[0]?.total || 0),
          transportAdminCount: Number(userCountRows[0]?.count || 0),
        },
        topTransportsByVolume: perTransportRows.map((r) => ({
          id: r.id,
          companyName: r.company_name,
          status: r.status,
          lrCount: r.lr_count,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error building admin dashboard', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
