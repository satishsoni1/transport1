import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';

function toResponseRow(row: any) {
  return {
    ...row,
    goods_items: parseJsonField(row.goods_items, []),
  };
}

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM lr_entries ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching LR entries', error);
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

    if (!body.consignor_id || !body.consignee_id) {
      return NextResponse.json(
        { success: false, error: 'Consignor and consignee are required' },
        { status: 400 }
      );
    }

    const freight = Number(body.freight) || 0;
    const hamali = Number(body.hamali) || 0;
    const lrCharge = Number(body.lr_charge) || 0;
    const advance = Number(body.advance) || 0;

    const seq = await sql`SELECT nextval(pg_get_serial_sequence('lr_entries','id')) AS id`;
    const id = Number(seq.rows[0].id);
    const { rows: settingsRows } = await sql`
      SELECT COALESCE(NULLIF(TRIM(lr_prefix), ''), 'LR') AS lr_prefix
      FROM app_settings
      WHERE id = 1
    `;
    const lrPrefix = String(settingsRows[0]?.lr_prefix || 'LR');
    const lrNo = `${lrPrefix}${String(id).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO lr_entries (
        id, lr_no, lr_date, consignor_id, consignee_id, from_city, to_city, delivery_address,
        freight, hamali, lr_charge, advance, balance, invoice_no, invoice_date, truck_no,
        driver_name, driver_mobile, eway_no, remarks, goods_items, status
      )
      VALUES (
        ${id},
        ${lrNo},
        NOW(),
        ${Number(body.consignor_id)},
        ${Number(body.consignee_id)},
        ${body.from_city || ''},
        ${body.to_city || ''},
        ${body.delivery_address || ''},
        ${freight},
        ${hamali},
        ${lrCharge},
        ${advance},
        ${freight + hamali + lrCharge},
        ${body.invoice_no || ''},
        ${body.invoice_date || ''},
        ${body.truck_no || ''},
        ${body.driver_name || ''},
        ${body.driver_mobile || ''},
        ${body.eway_no || ''},
        ${body.remarks || ''},
        ${JSON.stringify(Array.isArray(body.goods_items) ? body.goods_items : [])}::jsonb,
        ${body.status === 'paid' || body.status === 'tbb' ? body.status : 'to_pay'}
      )
      RETURNING *
    `;

    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating LR entry', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
