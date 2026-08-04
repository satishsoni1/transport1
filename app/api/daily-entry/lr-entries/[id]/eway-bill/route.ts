import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { generateEwayBill } from '@/lib/gst-service';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

/** First 2 digits of a GSTIN are the GST state code (e.g. 27 = Maharashtra). */
function stateCodeFromGstin(gstin: string) {
  return (gstin || '').trim().slice(0, 2);
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
      return NextResponse.json({ success: false, error: 'Invalid LR id' }, { status: 400 });
    }

    const { rows: lrRows } = await sql`
      SELECT lr_entries.*, consignors.name AS consignor_name, consignors.gst_no AS consignor_gst,
        consignors.city AS consignor_city, consignors.pincode AS consignor_pincode,
        consignees.name AS consignee_name, consignees.gst_no AS consignee_gst,
        consignees.city AS consignee_city, consignees.pincode AS consignee_pincode
      FROM lr_entries
      LEFT JOIN consignors ON consignors.id = lr_entries.consignor_id
      LEFT JOIN consignees ON consignees.id = lr_entries.consignee_id
      WHERE lr_entries.id = ${id} AND lr_entries.transport_id = ${transportId}
    `;
    if (lrRows.length === 0) {
      return NextResponse.json({ success: false, error: 'LR not found' }, { status: 404 });
    }
    const lr = lrRows[0];

    if (!lr.consignor_gst || !lr.consignee_gst) {
      return NextResponse.json(
        { success: false, error: 'Both consignor and consignee need a GST number on file before generating an e-way bill' },
        { status: 400 }
      );
    }
    if (!lr.consignor_pincode || !lr.consignee_pincode) {
      return NextResponse.json(
        { success: false, error: 'Both consignor and consignee need a pincode on file before generating an e-way bill' },
        { status: 400 }
      );
    }

    const { rows: settingsRows } = await sql`
      SELECT company_name FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const transporterName = settingsRows[0]?.company_name || '';

    const totalValue = (Number(lr.freight) || 0) + (Number(lr.hamali) || 0) + (Number(lr.lr_charge) || 0);

    const result = await generateEwayBill({
      transportId,
      docNo: lr.invoice_no || lr.lr_no,
      docDate: new Date(lr.lr_date).toISOString().slice(0, 10),
      fromGstin: lr.consignor_gst,
      fromTradeName: lr.consignor_name,
      fromPlace: lr.consignor_city || lr.from_city,
      fromPincode: lr.consignor_pincode,
      fromStateCode: stateCodeFromGstin(lr.consignor_gst),
      toGstin: lr.consignee_gst,
      toTradeName: lr.consignee_name,
      toPlace: lr.consignee_city || lr.to_city,
      toPincode: lr.consignee_pincode,
      toStateCode: stateCodeFromGstin(lr.consignee_gst),
      transporterName,
      vehicleNo: lr.truck_no,
      totalValue,
      itemDescription: 'Freight Goods',
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 502 });
    }

    await sql`
      UPDATE lr_entries
      SET eway_no = ${result.ewbNo}, eway_bill_generated_at = ${new Date().toISOString()}, eway_bill_valid_until = ${result.validUpto}
      WHERE id = ${id} AND transport_id = ${transportId}
    `;

    return NextResponse.json({ success: true, eway_no: result.ewbNo, valid_until: result.validUpto }, { status: 200 });
  } catch (error) {
    console.error('Error generating e-way bill', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
