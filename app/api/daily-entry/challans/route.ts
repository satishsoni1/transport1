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
    const totalToPay = lrList.filter((item: any) => item.status === 'to_pay').length;
    const totalPaid = lrList.filter((item: any) => item.status === 'paid').length;

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('challans','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const challanNo = `CH${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO challans (
        id, challan_no, challan_date, from_city, to_city, truck_no, driver_name, driver_mobile,
        owner_name, eway_no, remarks, lr_list, total_freight, total_to_pay, total_paid, status
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
