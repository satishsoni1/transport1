import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const QUOTATION_STATUSES = new Set(['draft', 'sent', 'approved', 'rejected', 'expired']);

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT quotations.*, consignors.name AS consignor_name
      FROM quotations
      LEFT JOIN consignors ON consignors.id = quotations.consignor_id
      WHERE quotations.transport_id = ${transportId}
      ORDER BY quotations.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching quotations', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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

    const { rows: seqRows } = await sql`
      SELECT get_next_doc_number(${transportId}, 'quotation') AS next_number
    `;
    const quotationNo = `QT${String(seqRows[0]?.next_number ?? 1).padStart(5, '0')}`;

    const consignorId = body.consignor_id
      ? (await sql`SELECT id FROM consignors WHERE id = ${Number(body.consignor_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO quotations (
        transport_id, quotation_no, consignor_id, from_city, to_city, vehicle_type,
        rate, fuel_surcharge_percent, valid_until, status, remarks, created_by
      )
      VALUES (
        ${transportId},
        ${quotationNo},
        ${consignorId},
        ${String(body.from_city || '').trim()},
        ${String(body.to_city || '').trim()},
        ${String(body.vehicle_type || '').trim()},
        ${Number(body.rate) || 0},
        ${Number(body.fuel_surcharge_percent) || 0},
        ${String(body.valid_until || '').trim()},
        ${QUOTATION_STATUSES.has(body.status) ? body.status : 'draft'},
        ${String(body.remarks || '').trim()},
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating quotation', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
