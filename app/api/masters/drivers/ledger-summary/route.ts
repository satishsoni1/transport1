import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

// Read-only aggregate consumed by the Reports page — gated by 'reports' rather than
// 'logistics' so an Accountant (who has 'reports'/'accounts' but not 'logistics' per
// lib/roles.ts) can view it like any other report.
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return NextResponse.json(
      { success: false, error: 'Access denied: transport admin account required' },
      { status: 403 }
    );
  }
  if (!can(user, 'reports')) {
    return NextResponse.json(
      { success: false, error: 'Your role does not permit viewing reports' },
      { status: 403 }
    );
  }

  try {
    await ensureSchema();

    const { rows } = await sql`
      SELECT
        drivers.id AS driver_id,
        drivers.driver_name,
        COALESCE(SUM(driver_ledger_entries.amount) FILTER (WHERE driver_ledger_entries.entry_type = 'advance'), 0) AS total_advance,
        COALESCE(SUM(driver_ledger_entries.amount) FILTER (WHERE driver_ledger_entries.entry_type = 'rent'), 0) AS total_rent,
        COALESCE(SUM(driver_ledger_entries.amount) FILTER (WHERE driver_ledger_entries.entry_type = 'deduction'), 0) AS total_deduction
      FROM drivers
      LEFT JOIN driver_ledger_entries
        ON driver_ledger_entries.driver_id = drivers.id
       AND driver_ledger_entries.transport_id = drivers.transport_id
      WHERE drivers.transport_id = ${user.transportId}
      GROUP BY drivers.id, drivers.driver_name
      ORDER BY drivers.driver_name
    `;

    return NextResponse.json(
      rows.map((row) => {
        const totalAdvance = Number(row.total_advance);
        const totalRent = Number(row.total_rent);
        const totalDeduction = Number(row.total_deduction);
        return {
          driverId: row.driver_id,
          driverName: row.driver_name,
          totalAdvance,
          totalRent,
          totalDeduction,
          balance: totalRent - totalAdvance - totalDeduction,
        };
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error building driver ledger summary', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
