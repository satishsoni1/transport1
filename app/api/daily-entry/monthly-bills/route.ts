import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function toResponseRow(row: any) {
  return { ...row, items: parseJsonField(row.items, []) };
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM monthly_bills ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching monthly bills', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!body.party_name || !body.consignor_id || !body.period_from || !body.period_to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Party name, consignor, period from, and period to are required',
        },
        { status: 400 }
      );
    }

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('monthly_bills','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const billNo = `MB${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO monthly_bills (
        id, bill_no, bill_date, party_name, consignor_id, period_from, period_to,
        tds_percentage, remarks, items, total_invoices, total_amount, tds_amount, net_amount, status
      )
      VALUES (
        ${id},
        ${billNo},
        NOW(),
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${body.period_from},
        ${body.period_to},
        ${Number(body.tds_percentage) || 0},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${items.length},
        ${Number(body.total_amount) || 0},
        ${Number(body.tds_amount) || 0},
        ${Number(body.net_amount) || 0},
        'draft'
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating monthly bill', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
