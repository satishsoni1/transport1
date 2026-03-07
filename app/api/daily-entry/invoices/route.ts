import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function toResponseRow(row: any) {
  return { ...row, items: parseJsonField(row.items, []) };
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM invoices ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching invoices', error);
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

    if (!body.party_name || !body.consignor_id || !body.invoice_date) {
      return NextResponse.json(
        { success: false, error: 'Party name, consignor, and invoice date are required' },
        { status: 400 }
      );
    }

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('invoices','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const invoiceNo = `INV${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO invoices (
        id, invoice_no, invoice_date, party_name, consignor_id, gst_percentage, remarks,
        items, total_amount, gst_amount, net_amount, status
      )
      VALUES (
        ${id},
        ${invoiceNo},
        ${body.invoice_date},
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${Number(body.gst_percentage) || 0},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${Number(body.total_amount) || 0},
        ${Number(body.gst_amount) || 0},
        ${Number(body.net_amount) || 0},
        'draft'
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating invoice', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
