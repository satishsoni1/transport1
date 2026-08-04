import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { requireVendor } from '@/lib/vendor-auth';

export async function GET(request: Request) {
  await ensureSchema();
  const { vendor, response } = await requireVendor(request);
  if (response) return response;

  try {
    const { rows } = await sql`
      SELECT expense_income_entries.id, expense_income_entries.entry_date, expense_income_entries.amount,
        expense_income_entries.payment_mode, expense_income_entries.remarks, vehicles.vehicle_no,
        expense_income_categories.name AS category_name
      FROM expense_income_entries
      JOIN vehicles ON vehicles.id = expense_income_entries.vehicle_id
      LEFT JOIN expense_income_categories ON expense_income_categories.id = expense_income_entries.category_id
      WHERE vehicles.vendor_id = ${vendor.id} AND expense_income_entries.entry_type = 'expense'
      ORDER BY expense_income_entries.entry_date DESC, expense_income_entries.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendor payments', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
