import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function toResponseRow(row: any) {
  return { ...row, items: parseJsonField(row.items, []) };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM monthly_bills WHERE transport_id = ${transportId} ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching monthly bills', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!body.party_name || !body.consignor_id || !body.period_from || !body.period_to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Party name, consignor, period from, and period to are required',
        },
        { status: 400 }
      );
    }

    // Per-transport atomic monthly bill numbering
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${transportId}, 'monthly_bill') AS seq`;
    const seq = Number(seqRows[0].seq);
    const billNo = `MB${String(seq).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO monthly_bills (
        transport_id, bill_no, bill_date, party_name, consignor_id, period_from, period_to,
        tds_percentage, remarks, items, total_invoices, total_amount, tds_amount, net_amount, status
      )
      VALUES (
        ${transportId},
        ${billNo},
        NOW(),
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${body.period_from},
        ${body.period_to},
        ${Number(body.tds_percentage) || 0},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${items.length},
        ${Number(body.total_amount) || 0},
        ${Number(body.tds_amount) || 0},
        ${Number(body.net_amount) || 0},
        'draft'
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating monthly bill', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
