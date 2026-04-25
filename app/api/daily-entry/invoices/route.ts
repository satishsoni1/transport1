import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function toResponseRow(row: any) {
  return {
    ...row,
    items: parseJsonField(row.items, []),
    additional_charges: parseJsonField(row.additional_charges, []),
  };
}

async function findConflictingInvoiceLr(
  transportId: number,
  lrNos: string[],
  excludeId?: number
) {
  const { rows } = await sql`SELECT id, invoice_no, items FROM invoices WHERE transport_id = ${transportId}`;

  for (const row of rows) {
    if (excludeId !== undefined && Number(row.id) === excludeId) continue;
    const items = parseJsonField<any[]>(row.items, []);
    const match = items.find((item) => lrNos.includes(String(item?.lr_no || '').trim()));
    if (match) {
      return {
        invoice_no: String(row.invoice_no || ''),
        lr_no: String(match.lr_no || ''),
      };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM invoices WHERE transport_id = ${transportId} ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching invoices', error);
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
    const additionalCharges = Array.isArray(body.additional_charges) ? body.additional_charges : [];

    if (!body.party_name || !body.consignor_id || !body.invoice_date) {
      return NextResponse.json(
        { success: false, error: 'Party name, consignor, and invoice date are required' },
        { status: 400 }
      );
    }

    const lrNos = items
      .map((item: any) => String(item?.lr_no || '').trim())
      .filter(Boolean);
    const conflictingLr = await findConflictingInvoiceLr(transportId, lrNos);
    if (conflictingLr) {
      return NextResponse.json(
        {
          success: false,
          error: `L.R. ${conflictingLr.lr_no} is already used in invoice ${conflictingLr.invoice_no}`,
        },
        { status: 400 }
      );
    }

    // Per-transport atomic invoice numbering
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${transportId}, 'invoice') AS seq`;
    const seq = Number(seqRows[0].seq);
    const { rows: settingsRows } = await sql`
      SELECT COALESCE(NULLIF(TRIM(invoice_prefix), ''), 'INV') AS invoice_prefix
      FROM app_settings
      WHERE transport_id = ${transportId}
      LIMIT 1
    `;
    const invoicePrefix = String(settingsRows[0]?.invoice_prefix || 'INV');
    const invoiceNo = `${invoicePrefix}${String(seq).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO invoices (
        transport_id, invoice_no, invoice_date, party_name, consignor_id, gst_percentage, remarks,
        items, additional_charges, total_amount, gst_amount, net_amount, status, created_by
      )
      VALUES (
        ${transportId},
        ${invoiceNo},
        ${body.invoice_date},
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${Number(body.gst_percentage) || 0},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${JSON.stringify(additionalCharges)}::jsonb,
        ${Number(body.total_amount) || 0},
        ${Number(body.gst_amount) || 0},
        ${Number(body.net_amount) || 0},
        'draft',
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating invoice', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
