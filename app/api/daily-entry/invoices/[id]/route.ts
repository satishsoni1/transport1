import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema, parseJsonField } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

function toResponseRow(row: any) {
  return { ...row, items: parseJsonField(row.items, []) };
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid invoice id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM invoices WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const items = body.items === undefined ? parseJsonField(existing.items, []) : body.items;

    const { rows } = await sql`
      UPDATE invoices
      SET
        invoice_date = ${body.invoice_date ?? existing.invoice_date},
        party_name = ${body.party_name ?? existing.party_name},
        consignor_id = ${body.consignor_id === undefined ? existing.consignor_id : Number(body.consignor_id)},
        gst_percentage = ${body.gst_percentage === undefined ? existing.gst_percentage : Number(body.gst_percentage) || 0},
        remarks = ${body.remarks ?? existing.remarks},
        items = ${JSON.stringify(Array.isArray(items) ? items : [])}::jsonb,
        total_amount = ${body.total_amount === undefined ? existing.total_amount : Number(body.total_amount) || 0},
        gst_amount = ${body.gst_amount === undefined ? existing.gst_amount : Number(body.gst_amount) || 0},
        net_amount = ${body.net_amount === undefined ? existing.net_amount : Number(body.net_amount) || 0},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating invoice', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid invoice id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM invoices WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting invoice', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
