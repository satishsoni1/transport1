import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function toResponseRow(row: any) {
  return { ...row, items: parseJsonField(row.items, []) };
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM receipts ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching receipts', error);
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

    if (!body.party_name || !body.consignor_id || !body.receipt_date) {
      return NextResponse.json(
        { success: false, error: 'Party name, consignor, and receipt date are required' },
        { status: 400 }
      );
    }

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('receipts','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const receiptNo = `RCP${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO receipts (
        id, receipt_no, receipt_date, party_name, consignor_id, mode, cheque_no, cheque_date,
        bank_name, remarks, items, total_amount, status
      )
      VALUES (
        ${id},
        ${receiptNo},
        ${body.receipt_date},
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${body.mode || 'cash'},
        ${body.cheque_no || ''},
        ${body.cheque_date || ''},
        ${body.bank_name || ''},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${Number(body.total_amount) || 0},
        'pending'
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating receipt', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
