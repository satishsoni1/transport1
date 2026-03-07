import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema, parseJsonField } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

function toResponseRow(row: any) {
  return {
    ...row,
    goods_items: parseJsonField(row.goods_items, []),
  };
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
        { success: false, error: 'Invalid LR entry id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM lr_entries WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LR entry not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const freight = body.freight === undefined ? existing.freight : Number(body.freight) || 0;
    const advance = body.advance === undefined ? existing.advance : Number(body.advance) || 0;
    const statusValue =
      body.status === 'paid' || body.status === 'tbb' || body.status === 'to_pay'
        ? body.status
        : existing.status;

    const { rows } = await sql`
      UPDATE lr_entries
      SET
        consignor_id = ${body.consignor_id === undefined ? existing.consignor_id : Number(body.consignor_id)},
        consignee_id = ${body.consignee_id === undefined ? existing.consignee_id : Number(body.consignee_id)},
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        delivery_address = ${body.delivery_address ?? existing.delivery_address},
        freight = ${freight},
        hamali = ${body.hamali === undefined ? existing.hamali : Number(body.hamali) || 0},
        lr_charge = ${body.lr_charge === undefined ? existing.lr_charge : Number(body.lr_charge) || 0},
        advance = ${advance},
        balance = ${freight - advance},
        invoice_no = ${body.invoice_no ?? existing.invoice_no},
        invoice_date = ${body.invoice_date ?? existing.invoice_date},
        truck_no = ${body.truck_no ?? existing.truck_no},
        driver_name = ${body.driver_name ?? existing.driver_name},
        driver_mobile = ${body.driver_mobile ?? existing.driver_mobile},
        eway_no = ${body.eway_no ?? existing.eway_no},
        remarks = ${body.remarks ?? existing.remarks},
        goods_items = ${JSON.stringify(
          body.goods_items === undefined ? parseJsonField(existing.goods_items, []) : body.goods_items
        )}::jsonb,
        status = ${statusValue}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating LR entry', error);
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
        { success: false, error: 'Invalid LR entry id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM lr_entries WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LR entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting LR entry', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
