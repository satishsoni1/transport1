import { NextResponse } from 'next/server';
import { sql, ensureSchema, parseJsonField } from '@/lib/db';

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
        { success: false, error: 'Invalid monthly bill id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM monthly_bills WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Monthly bill not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const items = body.items === undefined ? parseJsonField(existing.items, []) : body.items;
    const safeItems = Array.isArray(items) ? items : [];

    const { rows } = await sql`
      UPDATE monthly_bills
      SET
        party_name = ${body.party_name ?? existing.party_name},
        consignor_id = ${body.consignor_id === undefined ? existing.consignor_id : Number(body.consignor_id)},
        period_from = ${body.period_from ?? existing.period_from},
        period_to = ${body.period_to ?? existing.period_to},
        tds_percentage = ${body.tds_percentage === undefined ? existing.tds_percentage : Number(body.tds_percentage) || 0},
        remarks = ${body.remarks ?? existing.remarks},
        items = ${JSON.stringify(safeItems)}::jsonb,
        total_invoices = ${safeItems.length},
        total_amount = ${body.total_amount === undefined ? existing.total_amount : Number(body.total_amount) || 0},
        tds_amount = ${body.tds_amount === undefined ? existing.tds_amount : Number(body.tds_amount) || 0},
        net_amount = ${body.net_amount === undefined ? existing.net_amount : Number(body.net_amount) || 0},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating monthly bill', error);
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
        { success: false, error: 'Invalid monthly bill id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM monthly_bills WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Monthly bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting monthly bill', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
