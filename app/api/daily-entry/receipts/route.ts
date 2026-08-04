import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { notifyDocumentCreated } from '@/lib/notify';

function toResponseRow(row: any) {
  return {
    ...row,
    items: parseJsonField(row.items, []),
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM receipts WHERE transport_id = ${transportId} ORDER BY id DESC`;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching receipts', error);
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

    if (!body.party_name || !body.consignor_id || !body.receipt_date) {
      return NextResponse.json(
        { success: false, error: 'Party name, consignor, and receipt date are required' },
        { status: 400 }
      );
    }

    // Per-transport atomic receipt numbering
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${transportId}, 'receipt') AS seq`;
    const seq = Number(seqRows[0].seq);
    const receiptNo = `RCP${String(seq).padStart(5, '0')}`;

    const { rows } = await sql`
      INSERT INTO receipts (
        transport_id, receipt_no, receipt_date, party_name, consignor_id, mode, cheque_no, cheque_date,
        bank_name, remarks, items, total_amount, tds_amount, deduction_amount, received_amount, photo_url, receipt_type, status, created_by
      )
      VALUES (
        ${transportId},
        ${receiptNo},
        ${body.receipt_date},
        ${body.party_name},
        ${Number(body.consignor_id)},
        ${body.mode || 'cash'},
        ${body.cheque_no || ''},
        ${body.cheque_date || ''},
        ${body.bank_name || ''},
        ${body.remarks || ''},
        ${JSON.stringify(items)}::jsonb,
        ${Number(body.total_amount) || 0},
        ${Number(body.tds_amount) || 0},
        ${Number(body.deduction_amount) || 0},
        ${Number(body.received_amount) || Number(body.total_amount) || 0},
        ${body.photo_url || ''},
        ${body.receipt_type === 'on_account' ? 'on_account' : 'invoice'},
        'pending',
        ${String(body.created_by || '').trim()}
      )
      RETURNING *
    `;

    const [{ email: consignorEmail, mobile: consignorMobile } = { email: null, mobile: null }] = (
      await sql`SELECT email, mobile FROM consignors WHERE id = ${Number(body.consignor_id)}`
    ).rows;
    await notifyDocumentCreated({
      transportId,
      docType: 'receipt',
      consignorEmail,
      consignorMobile,
      subject: `New Receipt Created: ${receiptNo}`,
      html: `<p>A new receipt <strong>${receiptNo}</strong> has been created for ${body.party_name}.</p>`,
      text: `New receipt ${receiptNo} recorded for ${body.party_name}.`,
    });

    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating receipt', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
