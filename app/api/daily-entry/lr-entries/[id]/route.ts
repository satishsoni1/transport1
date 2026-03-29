import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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
    const invoiceNo =
      body.invoice_no === undefined ? undefined : String(body.invoice_no || '').trim();
    const { rows: existingRows } = await sql`SELECT * FROM lr_entries WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LR entry not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const freight = body.freight === undefined ? existing.freight : Number(body.freight) || 0;
    const hamali =
      body.hamali === undefined ? Number(existing.hamali) || 0 : Number(body.hamali) || 0;
    const lrCharge =
      body.lr_charge === undefined
        ? Number(existing.lr_charge) || 0
        : Number(body.lr_charge) || 0;
    const advance = body.advance === undefined ? existing.advance : Number(body.advance) || 0;
    const balance = freight + hamali + lrCharge - advance;
    const goodsItems =
      body.goods_items === undefined ? parseJsonField(existing.goods_items, []) : body.goods_items;
    const statusValue =
      body.status === 'paid' || body.status === 'tbb' || body.status === 'to_pay'
        ? body.status
        : existing.status;

    if (!Array.isArray(goodsItems) || goodsItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one goods detail row is required' },
        { status: 400 }
      );
    }

    if (goodsItems.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Only 5 goods rows are allowed in one LR' },
        { status: 400 }
      );
    }

    if (invoiceNo) {
      const { rows: duplicateRows } = await sql`
        SELECT id
        FROM lr_entries
        WHERE id <> ${id}
          AND LOWER(BTRIM(invoice_no)) = LOWER(BTRIM(${invoiceNo}))
        LIMIT 1
      `;
      if (duplicateRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'This invoice no is already in use' },
          { status: 400 }
        );
      }
    }

    const { rows } = await sql`
      UPDATE lr_entries
      SET
        consignor_id = ${body.consignor_id === undefined ? existing.consignor_id : Number(body.consignor_id)},
        consignee_id = ${body.consignee_id === undefined ? existing.consignee_id : Number(body.consignee_id)},
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        delivery_address = ${body.delivery_address ?? existing.delivery_address},
        freight = ${freight},
        hamali = ${hamali},
        lr_charge = ${lrCharge},
        advance = ${advance},
        balance = ${balance},
        invoice_no = ${invoiceNo ?? existing.invoice_no},
        invoice_date = ${body.invoice_date ?? existing.invoice_date},
        truck_no = ${body.truck_no ?? existing.truck_no},
        driver_name = ${body.driver_name ?? existing.driver_name},
        driver_mobile = ${body.driver_mobile ?? existing.driver_mobile},
        eway_no = ${body.eway_no ?? existing.eway_no},
        remarks = ${body.remarks ?? existing.remarks},
        return_status = ${body.return_status ?? existing.return_status},
        return_remark = ${body.return_remark ?? existing.return_remark},
        pod_received = ${body.pod_received ?? existing.pod_received},
        goods_items = ${JSON.stringify(goodsItems)}::jsonb,
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
