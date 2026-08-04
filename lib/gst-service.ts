import { sql } from '@/lib/db';

/**
 * IMPORTANT: Masters India (like most GST Suvidha Providers) wraps the government NIC e-way
 * bill / e-invoice schemas in its own REST API, but the exact endpoint paths and response
 * envelope are only visible from your Masters India developer dashboard after signing up —
 * they aren't publicly documented in a way that can be hard-coded here with certainty. The
 * request payloads below follow the standard NIC EWB01 (e-way bill) and e-invoice v1.1 schemas,
 * which are stable and well-documented, but `api_base_url` and the endpoint paths are
 * deliberately kept configurable in Settings > Integrations so you (or Masters India support)
 * can point them at the exact URLs your account uses. Treat this as a working skeleton to
 * verify against your Masters India docs before relying on it for real filings.
 */

export interface GstConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  gstin: string;
  ewayBillEnabled: boolean;
  einvoiceEnabled: boolean;
}

export async function resolveGstConfig(transportId: number): Promise<GstConfig | null> {
  const { rows } = await sql`
    SELECT * FROM gst_integration_settings WHERE transport_id = ${transportId} LIMIT 1
  `;
  const settings = rows[0];
  if (!settings?.client_id || !settings.client_secret || !settings.gstin) return null;
  return {
    apiBaseUrl: settings.api_base_url || 'https://api.mastersindia.co',
    clientId: settings.client_id,
    clientSecret: settings.client_secret,
    gstin: settings.gstin,
    ewayBillEnabled: Boolean(settings.eway_bill_enabled),
    einvoiceEnabled: Boolean(settings.einvoice_enabled),
  };
}

function authHeaders(config: GstConfig) {
  return {
    'Content-Type': 'application/json',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  };
}

export type EwayBillResult =
  | { ok: true; ewbNo: string; validUpto: string }
  | { ok: false; reason: string };

export interface EwayBillInput {
  transportId: number;
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromTradeName: string;
  fromPlace: string;
  fromPincode: string;
  fromStateCode: string;
  toGstin: string;
  toTradeName: string;
  toPlace: string;
  toPincode: string;
  toStateCode: string;
  transporterName: string;
  vehicleNo: string;
  totalValue: number;
  itemDescription: string;
}

/** Generates an e-way bill. Endpoint path/response shape needs verification against your Masters India account docs. */
export async function generateEwayBill(input: EwayBillInput): Promise<EwayBillResult> {
  const config = await resolveGstConfig(input.transportId);
  if (!config || !config.ewayBillEnabled) {
    return { ok: false, reason: 'E-way bill generation is not configured or not enabled for this transport' };
  }

  // Standard NIC EWB01 payload shape (docType 'INV' = tax invoice, supplyType 'O' = outward).
  const payload = {
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: input.docNo,
    docDate: input.docDate,
    fromGstin: input.fromGstin,
    fromTrdName: input.fromTradeName,
    fromPlace: input.fromPlace,
    fromPincode: input.fromPincode,
    fromStateCode: input.fromStateCode,
    toGstin: input.toGstin,
    toTrdName: input.toTradeName,
    toPlace: input.toPlace,
    toPincode: input.toPincode,
    toStateCode: input.toStateCode,
    transporterName: input.transporterName,
    vehicleNo: input.vehicleNo,
    transMode: '1',
    totalValue: input.totalValue,
    itemList: [{ productName: input.itemDescription || 'Goods', taxableAmount: input.totalValue }],
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/ewaybillapi/v1.03/ewayapi/generate`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ewbNo) {
      return { ok: false, reason: data?.message || data?.error || `GST API returned ${response.status}` };
    }
    return { ok: true, ewbNo: String(data.ewbNo), validUpto: String(data.validUpto || '') };
  } catch (error) {
    console.error('Error generating e-way bill', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown GST API error' };
  }
}

export type EInvoiceResult =
  | { ok: true; irn: string; ackNo: string; ackDate: string; qrCode: string }
  | { ok: false; reason: string };

export interface EInvoiceInput {
  transportId: number;
  invoiceNo: string;
  invoiceDate: string;
  sellerGstin: string;
  sellerTradeName: string;
  buyerGstin: string;
  buyerTradeName: string;
  totalValue: number;
  taxableValue: number;
  gstAmount: number;
  itemDescription: string;
}

/** Generates an e-invoice (IRN). Endpoint path/response shape needs verification against your Masters India account docs. */
export async function generateEInvoice(input: EInvoiceInput): Promise<EInvoiceResult> {
  const config = await resolveGstConfig(input.transportId);
  if (!config || !config.einvoiceEnabled) {
    return { ok: false, reason: 'E-invoice generation is not configured or not enabled for this transport' };
  }

  // Simplified subset of the GSTN e-invoice schema v1.1.
  const payload = {
    Version: '1.1',
    DocDtls: { Typ: 'INV', No: input.invoiceNo, Dt: input.invoiceDate },
    SellerDtls: { Gstin: config.gstin || input.sellerGstin, LglNm: input.sellerTradeName },
    BuyerDtls: { Gstin: input.buyerGstin, LglNm: input.buyerTradeName },
    ItemList: [
      {
        PrdDesc: input.itemDescription || 'Freight Services',
        TaxblAmt: input.taxableValue,
        GstRt: input.taxableValue > 0 ? Math.round((input.gstAmount / input.taxableValue) * 100) : 0,
      },
    ],
    ValDtls: { TotInvVal: input.totalValue },
  };

  try {
    const response = await fetch(`${config.apiBaseUrl}/einvoiceapi/v1.03/Invoice`, {
      method: 'POST',
      headers: authHeaders(config),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.Irn) {
      return { ok: false, reason: data?.message || data?.error || `GST API returned ${response.status}` };
    }
    return {
      ok: true,
      irn: String(data.Irn),
      ackNo: String(data.AckNo || ''),
      ackDate: String(data.AckDt || ''),
      qrCode: String(data.SignedQRCode || ''),
    };
  } catch (error) {
    console.error('Error generating e-invoice', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown GST API error' };
  }
}
