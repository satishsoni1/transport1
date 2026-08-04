import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { generateEInvoice } from '@/lib/gst-service';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ success: false, error: 'Invalid invoice id' }, { status: 400 });
    }

    const { rows: invoiceRows } = await sql`
      SELECT invoices.*, consignors.name AS consignor_name, consignors.gst_no AS consignor_gst
      FROM invoices
      LEFT JOIN consignors ON consignors.id = invoices.consignor_id
      WHERE invoices.id = ${id} AND invoices.transport_id = ${transportId}
    `;
    if (invoiceRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceRows[0];

    if (invoice.irn) {
      return NextResponse.json({ success: false, error: 'This invoice already has an IRN' }, { status: 400 });
    }
    if (!invoice.consignor_gst) {
      return NextResponse.json(
        { success: false, error: 'Consignor needs a GST number on file before generating an e-invoice' },
        { status: 400 }
      );
    }

    const { rows: settingsRows } = await sql`
      SELECT company_name, gst_no FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const sellerTradeName = settingsRows[0]?.company_name || '';
    const sellerGstin = settingsRows[0]?.gst_no || '';
    if (!sellerGstin) {
      return NextResponse.json(
        { success: false, error: 'Set your own company GST number in App Settings before generating e-invoices' },
        { status: 400 }
      );
    }

    const totalValue = Number(invoice.net_amount) || 0;
    const gstAmount = Number(invoice.gst_amount) || 0;
    const taxableValue = Number(invoice.total_amount) || totalValue - gstAmount;

    const result = await generateEInvoice({
      transportId,
      invoiceNo: invoice.invoice_no,
      invoiceDate: invoice.invoice_date,
      sellerGstin,
      sellerTradeName,
      buyerGstin: invoice.consignor_gst,
      buyerTradeName: invoice.consignor_name,
      totalValue,
      taxableValue,
      gstAmount,
      itemDescription: 'Freight Services',
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 502 });
    }

    await sql`
      UPDATE invoices
      SET irn = ${result.irn}, irn_ack_no = ${result.ackNo}, irn_ack_date = ${result.ackDate}, irn_qr_code = ${result.qrCode}
      WHERE id = ${id} AND transport_id = ${transportId}
    `;

    return NextResponse.json({ success: true, irn: result.irn, ack_no: result.ackNo }, { status: 200 });
  } catch (error) {
    console.error('Error generating e-invoice', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
