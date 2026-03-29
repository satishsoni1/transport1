import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

function toResponseRow(row: any) {
  return { ...row, lr_list: parseJsonField(row.lr_list, []) };
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
        { success: false, error: 'Invalid challan id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM challans WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Challan not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const lrList =
      body.lr_list === undefined ? parseJsonField(existing.lr_list, []) : body.lr_list;
    const safeList = Array.isArray(lrList) ? lrList : [];
    const totalFreight = safeList.reduce(
      (sum: number, item: any) => sum + (Number(item.freight) || 0),
      0
    );
    const totalToPay = safeList
      .filter((item: any) => item.status === 'to_pay')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const totalPaid = safeList
      .filter((item: any) => item.status === 'paid')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const shortReading =
      body.short_reading === undefined
        ? Number(existing.short_reading) || 0
        : Number(body.short_reading) || 0;
    const ratePerKm =
      body.rate_per_km === undefined
        ? Number(existing.rate_per_km) || 0
        : Number(body.rate_per_km) || 0;
    const readingTotal =
      body.reading_total === undefined
        ? shortReading * ratePerKm
        : Number(body.reading_total) || 0;

    const { rows } = await sql`
      UPDATE challans
      SET
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        truck_no = ${body.truck_no ?? existing.truck_no},
        driver_name = ${body.driver_name ?? existing.driver_name},
        driver_mobile = ${body.driver_mobile ?? existing.driver_mobile},
        owner_name = ${body.owner_name ?? existing.owner_name},
        eway_no = ${body.eway_no ?? existing.eway_no},
        remarks = ${body.remarks ?? existing.remarks},
        engine_reading = ${body.engine_reading ?? existing.engine_reading},
        short_reading = ${shortReading},
        rate_per_km = ${ratePerKm},
        reading_total = ${readingTotal},
        hamali = ${body.hamali ?? existing.hamali},
        advance = ${body.advance ?? existing.advance},
        lr_list = ${JSON.stringify(safeList)}::jsonb,
        total_freight = ${totalFreight},
        total_to_pay = ${totalToPay},
        total_paid = ${totalPaid},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 200 });
  } catch (error) {
    console.error('Error updating challan', error);
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
        { success: false, error: 'Invalid challan id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM challans WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Challan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting challan', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
