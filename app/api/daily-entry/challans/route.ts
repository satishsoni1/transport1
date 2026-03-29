import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function toResponseRow(row: any) {
  return { ...row, lr_list: parseJsonField(row.lr_list, []) };
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM challans ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching challans', error);
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

    if (!body.from_city || !body.to_city) {
      return NextResponse.json(
        { success: false, error: 'From city and to city are required' },
        { status: 400 }
      );
    }

    const lrList = Array.isArray(body.lr_list) ? body.lr_list : [];
    if (lrList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one LR is required' },
        { status: 400 }
      );
    }

    const totalFreight = lrList.reduce(
      (sum: number, item: any) => sum + (Number(item.freight) || 0),
      0
    );
    const totalToPay = lrList
      .filter((item: any) => item.status === 'to_pay')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const totalPaid = lrList
      .filter((item: any) => item.status === 'paid')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const shortReading = Number(body.short_reading) || 0;
    const ratePerKm = Number(body.rate_per_km) || 0;
    const readingTotal =
      body.reading_total === undefined
        ? shortReading * ratePerKm
        : Number(body.reading_total) || 0;

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('challans','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const challanNo = `CH${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO challans (
        id, challan_no, challan_date, from_city, to_city, truck_no, driver_name, driver_mobile,
        owner_name, eway_no, remarks, engine_reading, short_reading, rate_per_km, reading_total,
        hamali, advance, lr_list, total_freight, total_to_pay, total_paid, status
      )
      VALUES (
        ${id},
        ${challanNo},
        NOW(),
        ${body.from_city},
        ${body.to_city},
        ${body.truck_no || ''},
        ${body.driver_name || ''},
        ${body.driver_mobile || ''},
        ${body.owner_name || ''},
        ${body.eway_no || ''},
        ${body.remarks || ''},
        ${Number(body.engine_reading) || 0},
        ${shortReading},
        ${ratePerKm},
        ${readingTotal},
        ${Number(body.hamali) || 0},
        ${Number(body.advance) || 0},
        ${JSON.stringify(lrList)}::jsonb,
        ${totalFreight},
        ${totalToPay},
        ${totalPaid},
        'open'
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating challan', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
