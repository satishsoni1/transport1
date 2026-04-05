/**
 * Print Service - Handles print templates and exports
 */

export interface CompanyPrintData {
  company_name?: string;
  address?: string;
  company_phone?: string;
  company_email?: string;
  gst_no?: string;
  logo_url?: string;
  signature_url?: string;
  transporter_qr_url?: string;
  transporter_name_font?: string;
  lr_print_format?: LRPrintFormat;
  invoice_print_format?: InvoicePrintFormat;
}

export type LRPrintFormat = 'classic' | 'compact' | 'detailed';
export type InvoicePrintFormat = 'classic' | 'compact' | 'detailed';

export interface LRPrintData {
  lr_no: string;
  lr_date: string;
  consignor: string;
  consignor_name_mr?: string;
  consignee: string;
  delivery_address?: string;
  consignor_address?: string;
  consignor_city?: string;
  consignor_mobile?: string;
  consignor_gst?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_city_mr?: string;
  consignee_name_mr?: string;
  consignee_mobile?: string;
  consignee_gst?: string;
  from_city: string;
  from_city_mr?: string;
  to_city: string;
  to_city_mr?: string;
  goods_items: any[];
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  invoice_no: string;
  remarks: string;
  truck_no?: string;
  driver_name?: string;
  driver_mobile?: string;
  eway_no?: string;
  freight_type?: 'to_pay' | 'paid' | 'tbb';
  format?: LRPrintFormat;
  company?: CompanyPrintData;
}

export interface InvoicePrintData {
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  party_name_mr?: string;
  items: any[];
  additional_charges?: Array<{
    charge_name?: string;
    remark?: string;
    amount?: number;
  }>;
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  gst_percentage: number;
  format?: InvoicePrintFormat;
  company?: CompanyPrintData;
}

export interface ChallanPrintData {
  challan_no: string;
  challan_date: string;
  from_city: string;
  to_city: string;
  truck_no?: string;
  driver_name?: string;
  driver_mobile?: string;
  owner_name?: string;
  eway_no?: string;
  remarks?: string;
  engine_reading?: number;
  short_reading?: number;
  rate_per_km?: number;
  reading_total?: number;
  hamali?: number;
  advance?: number;
  total_freight?: number;
  total_to_pay?: number;
  total_paid?: number;
  lr_list: any[];
  company?: CompanyPrintData;
}

function getPrintStyle(format: 'classic' | 'compact' | 'detailed') {
  const variant =
    format === 'compact'
      ? `
  .title { font-size: 14px; }
  .sub { font-size: 8px; }
  .box { font-size: 8px; padding: 3px; }
  th, td { font-size: 8px; height: 16px; padding: 1.5px; }
`
      : format === 'detailed'
        ? `
  .title { font-size: 16px; }
  .sub { font-size: 9.5px; }
  .box { font-size: 9.5px; padding: 4px; }
  th, td { font-size: 8.8px; height: 19px; padding: 2px; }
`
        : '';

  return `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 0; color: #111; }
  @page { size: A5 portrait; margin: 4mm; }
  .sheet {
    width: 100%;
    min-height: calc(210mm - 8mm);
    border: 1px solid #222;
    padding: 3mm;
    display: flex;
    flex-direction: column;
  }
  .header { display: flex; gap: 8px; border-bottom: 1px solid #222; padding-bottom: 4px; margin-bottom: 4px; min-height: 56px; }
  .logo { width: 48px; height: 48px; object-fit: contain; }
  .title { font-size: 15px; font-weight: 700; line-height: 1.1; }
  .sub { font-size: 9px; line-height: 1.25; }
  .content { flex: 1; min-height: 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .box { border: 1px solid #666; padding: 4px; font-size: 9px; }
  .box h4 { margin: 0 0 4px 0; font-size: 11px; }
  .line { margin: 1px 0; }
  .lbl { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
  th, td { border: 1px solid #666; padding: 2px; font-size: 8.5px; height: 18px; }
  th { background: #f4f4f4; }
  .totals { margin-top: 4px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
  .totals .box { padding: 4px; }
  .footer { margin-top: 4px; display: flex; justify-content: space-between; align-items: end; gap: 8px; min-height: 56px; }
  .sig { text-align: center; min-width: 120px; }
  .sig img { max-height: 36px; max-width: 100px; display: block; margin: 0 auto 2px; }
  .sig-line { border-top: 1px solid #222; font-size: 10px; padding-top: 2px; }
  .qr-row { display: flex; gap: 8px; }
  .qr-box { border: 1px solid #666; padding: 4px; text-align: center; font-size: 9px; }
  .qr-box img { width: 64px; height: 64px; object-fit: contain; }
  ${variant}
`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getLRQr(lrNo: string) {
  const payload = encodeURIComponent(`LR:${lrNo}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${payload}`;
}

function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return '';
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero';
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const toWords = (x: number): string => {
    if (x < 20) return ones[x];
    if (x < 100) return `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ''}`;
    if (x < 1000) return `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${toWords(x % 100)}` : ''}`;
    if (x < 100000) return `${toWords(Math.floor(x / 1000))} Thousand${x % 1000 ? ` ${toWords(x % 1000)}` : ''}`;
    if (x < 10000000) return `${toWords(Math.floor(x / 100000))} Lakh${x % 100000 ? ` ${toWords(x % 100000)}` : ''}`;
    return `${toWords(Math.floor(x / 10000000))} Crore${x % 10000000 ? ` ${toWords(x % 10000000)}` : ''}`;
  };
  return toWords(n);
}

export function generateLRPrintHTML(data: LRPrintData): string {
  const company = data.company || {};
  const resolvedFormat = data.format || company.lr_print_format || 'classic';
  const transporterNameFont = escapeHtml(company.transporter_name_font || '"Trebuchet MS"');
  const isPaid = data.freight_type === 'paid';
  const isTbb = data.freight_type === 'tbb';
  const isToPay = !isPaid && !isTbb;
  const freightTypeLabel =
    isPaid ? 'Paid' : isTbb ? 'TBB' : 'To Pay';
  const paymentColumnLabel = isPaid
    ? 'FREIGHT PAID'
    : isTbb
      ? 'FREIGHT TBB'
      : 'FREIGHT TO PAY';
  const paymentSummaryLabel = isPaid
    ? 'PAID AMOUNT'
    : isTbb
      ? 'TBB AMOUNT'
      : 'GRAND TOTAL';
  const totalQty = (data.goods_items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalWeightKg = (data.goods_items || []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.weight_kg) || 0),
    0
  );
  const totalWeightMt = totalWeightKg / 100;
  const payableAmount = Number(data.freight || 0) + Number(data.hamali || 0) + Number(data.lr_charge || 0);
  const displayAmount = Number(data.balance || payableAmount);
  const amountWords = numberToWords(payableAmount);
  const lrQr = getLRQr(data.lr_no);
  const transporterQr = company.transporter_qr_url || '';

  const cityToMr = data.to_city_mr || data.consignee_city_mr || '';
  const rows = [...(data.goods_items || [])];
  const fillerRowCount = Math.max(0, 4 - rows.length);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>LR ${data.lr_no}</title>
    <style>${getPrintStyle(resolvedFormat)}</style>
    <style>
      body { font-family: Arial, sans-serif; }
      .sheet.lr-sheet {
        min-height: calc(148mm - 8mm);
        height: calc(148mm - 8mm);
        padding: 2mm;
        
      }
        .sheet.lr-sheet{
        
        border:0px;
        border-bottom: 1.4px dotted #222;
        }
      .lr-sheet .header {
        display: grid;
        grid-template-columns: 78px 1fr;
        align-items: stretch;
        gap: 8px;
        min-height: 76px;
        border: 1px solid #222;
        padding: 4px 6px;
        margin-bottom: 0;
      }
      .lr-sheet .jurisdiction-note {
        font-size: 10px;
        line-height: 1.1;
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .lr-sheet .transport-name {
        font-family: ${transporterNameFont}, 'Trebuchet MS', Arial, sans-serif;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 0.96;
        text-align: center;
      }
      .lr-sheet .header-meta {
        font-size: 10px;
        line-height: 1.15;
        text-align: center;
      }
      .lr-sheet .header-gst {
        font-size: 9.8px;
        line-height: 1.15;
        text-align: center;
        font-weight: 700;
      }
      .lr-sheet .header-logo-box {
        border: 1px solid #222;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 64px;
      }
      .lr-sheet .header-logo-box img {
        max-width: 48px;
        max-height: 48px;
        object-fit: contain;
      }
      .lr-sheet .party-section {
        display: grid;
        grid-template-columns: 1fr 1fr 0.66fr;
        border-left: 1px solid #222;
        border-right: 1px solid #222;
      }
      .lr-sheet .party-box,
      .lr-sheet .lr-box {
        min-height: 92px;
        border-bottom: 1px solid #222;
        border-right: 1px solid #222;
        padding: 4px 6px;
      }
      .lr-sheet .party-section > :last-child {
        border-right: 0;
      }
      .lr-sheet .box-label {
        font-size: 9.5px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      .lr-sheet .party-name {
        font-size: 10px;
        font-weight: 700;
        min-height: 18px;
        margin-bottom: 8px;
      }
      .lr-sheet .party-mobile {
        font-size: 9px;
        font-weight: 700;
        min-height: 14px;
        margin-bottom: 18px;
      }
      .lr-sheet .party-mr {
        font-size: 12.8px;
        font-weight: 700;
        line-height: 1.2;
      }
      .lr-sheet .lr-box .kv {
        display: grid;
        grid-template-columns: 44px 8px 1fr;
        font-size: 10px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .lr-sheet .lr-box .kv.lr-number-row {
        grid-template-columns: 44px 8px 1fr 36px;
        align-items: center;
        column-gap: 4px;
      }
      .lr-sheet .lr-box .lr-number-value {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .lr-sheet .lr-box .lr-mini-qr {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lr-sheet .lr-box .lr-mini-qr img {
        width: 32px;
        height: 32px;
        border: 1px solid #222;
        object-fit: contain;
        padding: 1px;
        background: #fff;
      }
      .lr-sheet .route-strip {
        display: grid;
        grid-template-columns: 31% 13% 15% 16% 12% 13%;
        border-left: 1px solid #222;
        border-right: 1px solid #222;
        border-bottom: 1px solid #222;
      }
      .lr-sheet .route-cell {
        padding: 4px 6px;
        border-right: 1px solid #222;
        font-size: 10px;
      }
      .lr-sheet .route-cell.route-main {
        grid-column: span 2;
      }
      .lr-sheet .route-cell.route-city-mr {
        grid-column: span 2;
      }
      .lr-sheet .route-cell.route-delivery {
        grid-column: span 2;
      }
      .lr-sheet .route-strip > :last-child {
        border-right: 0;
      }
      .lr-sheet .route-inline {
        display: flex;
        justify-content: center;
        gap: 14px;
        align-items: baseline;
        font-weight: 700;
      }
      .lr-sheet .route-inline .muted {
        font-weight: 400;
      }
      .lr-sheet .route-mr {
        text-align: center;
        font-size: 12.8px;
        font-weight: 700;
        line-height: 1.2;
      }
      .lr-sheet .to-highlight {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .lr-sheet .goods-table {
        margin-top: 0;
        border-left: 1px solid #222;
        border-right: 1px solid #222;
        border-top: 0;
        border-bottom: 0;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .lr-sheet .goods-table th,
      .lr-sheet .goods-table td {
        border: 1px solid #222;
        font-size: 9.5px;
        height: 20px;
        min-height: 20px;
        text-align: center;
        vertical-align: middle;
        padding: 2px 2px;
        line-height: 1.1;
        overflow: hidden;
      }
      .lr-sheet .goods-table th {
        background: #fff;
        font-weight: 700;
        vertical-align: middle;
      }
      .lr-sheet .goods-table td.desc-cell {
        text-align: left;
        padding-left: 6px;
        font-weight: 700;
        white-space: nowrap;
      }
      .lr-sheet .goods-table tbody tr {
        height: 20px;
      }
      .lr-sheet .goods-table col:nth-child(1) { width: 31%; }
      .lr-sheet .goods-table col:nth-child(2) { width: 13%; }
      .lr-sheet .goods-table col:nth-child(3) { width: 15%; }
      .lr-sheet .goods-table col:nth-child(4) { width: 16%; }
      .lr-sheet .goods-table col:nth-child(5) { width: 12%; }
      .lr-sheet .goods-table col:nth-child(6) { width: 13%; }
      .lr-sheet .goods-table .totals-row td,
      .lr-sheet .goods-table .amount-row td,
      .lr-sheet .goods-table .words-row td,
      .lr-sheet .goods-table .footer-row td {
        font-weight: 700;
        vertical-align: middle;
      }
      .lr-sheet .goods-table .stamp-cell {
        padding: 0;
        vertical-align: top;
      }
      .lr-sheet .goods-table .stamp-wrap {
        min-height: 98px;
        height: 98px;
        display: grid;
        grid-template-rows: 24px 1fr;
      }
      .lr-sheet .goods-table .stamp-label {
        border-bottom: 1px solid #222;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 4px;
      }
      .lr-sheet .goods-table .stamp-body {
        min-height: 60px;
      }
      .lr-sheet .goods-table .label-cell {
        text-align: left;
        padding-left: 5px;
      }
      .lr-sheet .goods-table .center-cell {
        text-align: center;
      }
      .lr-sheet .goods-table .charge-label {
        text-align: right;
        padding-right: 6px;
      }
      .lr-sheet .goods-table .value-cell {
        text-align: right;
        padding-right: 5px;
      }
      .lr-sheet .goods-table .words-cell {
        text-align: left;
        padding-left: 5px;
      }
      .lr-sheet .goods-table .footer-row td {
        height: 36px;
        min-height: 36px;
      }
      .lr-sheet .goods-table .qr-cell,
      .lr-sheet .goods-table .remark-cell,
      .lr-sheet .goods-table .transport-cell {
        padding: 3px 4px;
      }
      .lr-sheet .goods-table .remark-cell {
        text-align: left;
        color: #b91c1c;
        font-size: 9px;
      }
      .lr-sheet .qr-strip {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
        padding: 0;
      }
      .lr-sheet .qr-box {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .lr-sheet .qr-box img {
        width: 30px;
        height: 30px;
        border: 1px solid #222;
        background: #fff;
        object-fit: contain;
        padding: 1px;
      }
      .lr-sheet .qr-copy {
        font-size: 8.5px;
        line-height: 1.1;
        font-weight: 700;
      }
      .lr-sheet .sign-box {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 2px;
        min-height: 100%;
      }
      .lr-sheet .sign-box img.signature {
        max-width: 58px;
        max-height: 14px;
        object-fit: contain;
      }
      .lr-sheet .sign-title {
        font-size: 8.8px;
        font-weight: 700;
        text-align: center;
        line-height: 1.1;
      }
      .lr-sheet .sign-subtitle {
        font-size: 7.4px;
        font-weight: 600;
        text-align: center;
        line-height: 1;
      }
      .lr-sheet .freight-type-value {
        font-size: 24px;
        font-weight: 900;
        background: #fef3c7;
        letter-spacing: 0.3px;
      }
      .lr-sheet .grand-total-label {
        text-align: center;
        font-size: 13px;
        font-weight: 900;
        background: #fef3c7;
      }
      .lr-sheet .grand-total-value {
        font-size: 18px;
        font-weight: 900;
        text-align: right;
        padding-right: 5px;
        background: #fde68a;
      }
      .lr-sheet .notice-box {
        border: 1px solid #222;
        border-top: 0;
        padding: 5px 8px 6px;
        font-size: 9.2px;
        line-height: 1.35;
      }
      .lr-sheet .notice-title {
        font-weight: 800;
        margin-bottom: 2px;
      }
    </style>
  </head>
  <body>
    <div class="sheet lr-sheet">
      <div class="header">
        <div class="header-logo-box">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="logo" />` : ''}
        </div>
        <div>
          <div class="jurisdiction-note">Subject to Akola Jurisdiction</div>
          <div class="transport-name">${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</div>
          <div class="header-meta">${escapeHtml(company.address || '')}</div>
          <div class="header-gst">GSTIN : ${escapeHtml(company.gst_no || '-')}</div>
          <div class="header-meta">${escapeHtml(company.company_phone || '')} ${company.company_email ? `| ${escapeHtml(company.company_email)}` : ''}</div>
        </div>
      </div>

      <div class="content">
      <div class="party-section">
        <div class="party-box">
          <div class="box-label">CONSIGNOR :</div>
          <div class="party-name">${escapeHtml(data.consignor || '-')}</div>
          <div class="party-mobile">Mob. : ${escapeHtml(data.consignor_mobile || '-')}</div>
          <div class="party-mr">${escapeHtml(data.consignor_name_mr || '-')}</div>
        </div>
        <div class="party-box">
          <div class="box-label">CONSIGNEE :</div>
          <div class="party-name">${escapeHtml(data.consignee || '-')}</div>
          <div class="party-mobile">Mob. : ${escapeHtml(data.consignee_mobile || '-')}</div>
          <div class="party-mr">${escapeHtml(data.consignee_name_mr || '-')}</div>
        </div>
        <div class="lr-box">
          <div class="kv lr-number-row"><span>LR.No.</span><span>:</span><span class="lr-number-value">${escapeHtml(data.lr_no)}</span><span class="lr-mini-qr"><img src="${lrQr}" alt="lr qr" /></span></div>
          <div class="kv"><span>Date</span><span>:</span><span>${escapeHtml(new Date(data.lr_date).toLocaleDateString('en-IN'))}</span></div>
          <div class="kv"><span>Inv. No.</span><span>:</span><span>${escapeHtml(data.invoice_no || '-')}</span></div>
        </div>
      </div>

      <div class="route-strip">
        <div class="route-cell route-main">
          <div class="route-inline">
            <span class="muted">From :</span>
            <span>${escapeHtml(data.from_city || '-')}</span>
            <span class="muted">To</span>
            <span class="to-highlight">${escapeHtml(data.to_city || '-')}</span>
          </div>
        </div>
        <div class="route-cell route-city-mr route-mr">${escapeHtml(cityToMr || '-')}</div>
        <div class="route-cell route-delivery">
          <div style="font-size:9px;font-weight:700;">Delivery At :</div>
          <div style="font-size:9.4px;font-weight:700;">${escapeHtml(data.delivery_address || data.consignee_address || '-')}</div>
        </div>
      </div>

	      <table class="goods-table">
	        <colgroup>
	          <col /><col /><col /><col /><col /><col />
	        </colgroup>
        <thead>
          <tr>
            <th>DESCRIPTION</th>
            <th>QTY</th>
            <th>TYPE</th>
            <th>WEIGHT/KG</th>
            <th>Rate</th>
            <th>${paymentColumnLabel}</th>
          </tr>
        </thead>
	        <tbody>
	          ${rows
	            .map(
	              (item) => `
	              <tr>
	                <td class="desc-cell">${escapeHtml(item.nature ?? item.description ?? '')}</td>
	                <td>${item.qty ?? ''}</td>
	                <td>${escapeHtml(item.type ?? '')}</td>
	                <td>${item.weight_kg ? `${Number(item.weight_kg || 0)} Kg.` : ''}</td>
	                <td>${item.rate !== undefined ? Number(item.rate || 0).toFixed(2) : ''}</td>
	                <td>${isToPay && item.amount !== undefined ? Number(item.amount || 0).toFixed(2) : ''}</td>
	              </tr>
	            `
	            )
	            .join('')}
            ${Array.from({ length: fillerRowCount })
              .map(
                () => `
              <tr>
                <td class="desc-cell"></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `
              )
              .join('')}
            <tr class="totals-row">
              <td rowspan="4" class="stamp-cell">
                <div class="stamp-wrap">
                  <div class="stamp-label">CONSIGNEE SIGNATURE &amp; STAMP</div>
                  <div class="stamp-body"></div>
                </div>
              </td>
              <td>${totalQty}</td>
              <td>TOTAL</td>
              <td>${totalWeightKg} Kg.</td>
              <td class="charge-label">LR. CHARGE</td>
              <td class="value-cell">${Number(data.lr_charge || 0).toFixed(2)}</td>
            </tr>
            <tr class="amount-row">
              <td></td>
              <td class="center-cell freight-type-value">${escapeHtml(freightTypeLabel.replace('To Pay', 'ToPay'))}</td>
              <td>${totalWeightMt.toFixed(2)} M.T.</td>
              <td class="grand-total-label">${paymentSummaryLabel}</td>
              <td class="grand-total-value">${displayAmount.toFixed(2)}</td>
            </tr>
            <tr class="words-row">
              <td colspan="5" class="words-cell">AMOUNT IN WORDS : ${escapeHtml(amountWords)} Only</td>
            </tr>
            <tr class="footer-row">
              <td colspan="2" class="remark-cell">${escapeHtml(data.return_remark || data.remarks || '')}</td>
              <td colspan="2" class="qr-cell">
                <div class="qr-strip">
                  ${transporterQr ? `
                  <div class="qr-box">
                    <img src="${transporterQr}" alt="payment qr" />
                    <div class="qr-copy">
                      <div>PAYMENT</div>
                      <div>SCAN QR</div>
                    </div>
                  </div>` : ''}
                </div>
              </td>
              <td class="transport-cell">
                <div class="sign-box">
                  ${company.signature_url ? `<img class="signature" src="${company.signature_url}" alt="signature" />` : ''}
                  <div class="sign-title">${escapeHtml(company.company_name || 'TRANSPORT')}</div>
                  <div class="sign-subtitle">Authorised Signatory</div>
                </div>
              </td>
            </tr>
	        </tbody>
	      </table>
        <div class="notice-box">
          <div class="notice-title">सुचना:</div>
          <div>१. माल पुरी तरहसे मलिक के जोखीम पर भेजा जा रहा है, ट्रान्सपोर्ट कंपनी केवल वाहक के रूप मे कार्य करती है.</div>
          <div>२. क्षति, चोरी या देरी के लिए ट्रान्सपोर्ट कंपनी उत्तरदायी नही होगी जबतक की यह लापरवाही साबित न हो.</div>
          <div>३. माल की प्राप्ती के समय ग्राहक को सामान की जाचं करनी होगी, बाद मे कि गई शिकायत मान्य नही होगी.</div>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

export function generateInvoicePrintHTML(data: InvoicePrintData): string {
  const company = data.company || {};
  const resolvedFormat = data.format || company.invoice_print_format || 'classic';
  const amountInWords = numberToWords(Number(data.net_amount || 0));
  const invoiceRows = data.items || [];
  const additionalCharges = data.additional_charges || [];
  const allRows = [
    ...invoiceRows.map((item) => ({ kind: 'item' as const, item })),
    ...additionalCharges.map((charge) => ({ kind: 'charge' as const, charge })),
  ];
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Invoice ${data.invoice_no}</title>
    <style>${getPrintStyle(resolvedFormat)}</style>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      body { font-family: Arial, sans-serif; }
      .sheet.invoice-sheet {
        min-height: calc(297mm - 16mm);
        border: 1.4px solid #222;
        padding: 4mm;
      }
      .invoice-sheet .brand-head {
        display: grid;
        grid-template-columns: 76px 1fr;
        gap: 10px;
        align-items: center;
      }
      .invoice-sheet .logo-box {
        border: 1px solid #222;
        min-height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }
      .invoice-sheet .logo-box img {
        max-width: 64px;
        max-height: 54px;
        object-fit: contain;
      }
      .invoice-sheet .top-note {
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .invoice-sheet .transport-name {
        font-size: 26px;
        font-weight: 800;
        line-height: 1;
        text-align: center;
      }
      .invoice-sheet .jurisdiction {
        display: none;
      }
      .invoice-sheet .company-lines {
        text-align: center;
        border-top: 1px solid #222;
        border-bottom: 1px solid #222;
        padding: 5px 0 6px;
      }
      .invoice-sheet .company-lines .line {
        margin: 1px 0;
        font-size: 11px;
      }
      .invoice-sheet .company-lines .gst {
        font-size: 12px;
        font-weight: 700;
      }
      .invoice-sheet .invoice-title {
        text-align: center;
        font-size: 20px;
        font-weight: 800;
        margin: 8px 0 6px;
        letter-spacing: 0.5px;
      }
      .invoice-sheet .party-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        border: 1px solid #222;
        border-bottom: 0;
      }
      .invoice-sheet .party-cell {
        min-height: 88px;
        padding: 6px 8px;
        font-size: 11px;
        border-right: 1px solid #222;
      }
      .invoice-sheet .party-cell:last-child {
        border-right: 0;
      }
      .invoice-sheet .party-label {
        font-weight: 700;
        margin-bottom: 4px;
      }
      .invoice-sheet .party-name {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
      }
      .invoice-sheet .party-name-mr {
        font-size: 13px;
        font-weight: 700;
        margin-top: 4px;
      }
      .invoice-sheet .meta-line {
        display: grid;
        grid-template-columns: 82px 10px 1fr;
        margin-bottom: 4px;
      }
      .invoice-sheet .items-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .invoice-sheet .items-table th,
      .invoice-sheet .items-table td {
        border: 1px solid #222;
        padding: 4px 5px;
        font-size: 11px;
        height: 24px;
        text-align: center;
        vertical-align: middle;
      }
      .invoice-sheet .items-table th {
        font-weight: 800;
        background: #fff;
      }
      .invoice-sheet .items-table td.party-col {
        text-align: left;
        padding-left: 6px;
        font-weight: 700;
      }
      .invoice-sheet .items-table td.amount-col,
      .invoice-sheet .items-table th.amount-col {
        text-align: right;
        padding-right: 6px;
      }
      .invoice-sheet .items-table tr.charge-row td {
        font-weight: 700;
      }
      .invoice-sheet .invoice-footer {
        border: 1px solid #222;
        border-top: 0;
      }
      .invoice-sheet .summary-row,
      .invoice-sheet .words-row,
      .invoice-sheet .note-row {
        display: grid;
        grid-template-columns: 1fr 200px;
      }
      .invoice-sheet .summary-row > div,
      .invoice-sheet .words-row > div,
      .invoice-sheet .note-row > div {
        border-right: 1px solid #222;
        border-top: 1px solid #222;
        min-height: 34px;
        padding: 6px 8px;
        font-size: 11px;
      }
      .invoice-sheet .summary-row > div:last-child,
      .invoice-sheet .words-row > div:last-child,
      .invoice-sheet .note-row > div:last-child {
        border-right: 0;
      }
      .invoice-sheet .summary-row .amount {
        font-size: 18px;
        font-weight: 800;
        text-align: right;
      }
      .invoice-sheet .words-row .label,
      .invoice-sheet .summary-row .label {
        font-weight: 700;
      }
      .invoice-sheet .note-row {
        grid-template-columns: 1fr 220px;
      }
      .invoice-sheet .note {
        font-size: 10.6px;
        font-weight: 700;
        line-height: 1.25;
      }
      .invoice-sheet .sign-box {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        min-height: 86px;
        text-align: center;
      }
      .invoice-sheet .sign-box img {
        max-width: 120px;
        max-height: 42px;
        object-fit: contain;
        margin-bottom: 4px;
      }
      .invoice-sheet .sign-title {
        font-size: 12px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="sheet invoice-sheet">
      <div class="brand-head">
        <div class="logo-box">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="logo" />` : ''}
        </div>
        <div>
          <div class="top-note">Subject to Akola Jurisdiction Only .</div>
          <div class="transport-name">${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</div>
        </div>
      </div>
      <div class="company-lines">
        <div class="line">${escapeHtml(company.address || '')}</div>
        <div class="line">Tel.Nos.-${escapeHtml(company.company_phone || '')}${company.company_email ? ` Email :${escapeHtml(company.company_email)}` : ''}</div>
        <div class="line gst">GST NO : ${escapeHtml(company.gst_no || '-')}</div>
      </div>
      <div class="invoice-title">INVOICE</div>

      <div class="party-grid">
        <div class="party-cell">
          <div class="party-label">To,</div>
          <div class="party-name">${escapeHtml(data.party_name || '-')}</div>
          <div class="party-name-mr">${escapeHtml(data.party_name_mr || '')}</div>
        </div>
        <div class="party-cell">
          <div class="meta-line"><span>Date</span><span>:</span><span>${escapeHtml(new Date(data.invoice_date).toLocaleDateString('en-IN'))}</span></div>
          <div class="meta-line"><span>Bill No.</span><span>:</span><span>${escapeHtml(data.invoice_no || '-')}</span></div>
          <div class="meta-line"><span>GST No.</span><span>:</span><span>${escapeHtml('')}</span></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:8%;">S.N.</th>
            <th style="width:14%;">L.R. NO.</th>
            <th style="width:12%;">DATE</th>
            <th style="width:14%;">CITY</th>
            <th>CONSIGNEE</th>
            <th style="width:13%;">INV. NO.</th>
            <th style="width:9%;">QTY</th>
            <th class="amount-col" style="width:13%;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${allRows
            .map(
              (row, idx) =>
                row.kind === 'item'
                  ? `
              <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(row.item.lr_no || row.item.lrNo || '')}</td>
                <td>${escapeHtml(
                  row.item.lr_date || row.item.date
                    ? new Date(row.item.lr_date || row.item.date || '').toLocaleDateString('en-IN')
                    : ''
                )}</td>
                <td>${escapeHtml(row.item.city || row.item.to_city || '')}</td>
                <td class="party-col">${escapeHtml(row.item.consignee || row.item.description || '')}</td>
                <td>${escapeHtml(row.item.inv_no || row.item.invoice_no || row.item.invoiceNo || '')}</td>
                <td>${escapeHtml(row.item.qty ?? '')}</td>
                <td class="amount-col">${Number(row.item.amount || 0).toFixed(2)}</td>
              </tr>
            `
                  : `
              <tr class="charge-row">
                <td>${idx + 1}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="party-col">${escapeHtml(row.charge.charge_name || 'Additional Charge')}</td>
                <td>${escapeHtml(row.charge.remark || '')}</td>
                <td></td>
                <td class="amount-col">${Number(row.charge.amount || 0).toFixed(2)}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <div class="invoice-footer">
        <div class="summary-row">
          <div><span class="label">Total :</span></div>
          <div class="amount">${Number(data.net_amount || 0).toFixed(2)}</div>
        </div>
        <div class="words-row">
          <div><span class="label">In Words :</span> Rs. ${escapeHtml(amountInWords)} Only</div>
          <div><span class="label">Net Amount :</span> ${Number(data.net_amount || 0).toFixed(2)}</div>
        </div>
        <div class="note-row">
          <div class="note">WE ARE NOT LIABLE FOR PAYING GST ${escapeHtml(data.party_name || '')} TO BOOK THE MATERIAL UNDER REVERSE CHARGE MECHANISM . REMARK :-</div>
          <div class="sign-box">
            ${company.signature_url ? `<img src="${company.signature_url}" alt="signature" />` : ''}
            <div class="sign-title">For ${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</div>
            <div class="sign-title">Authorised sign. / Manager</div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

export function generateChallanPrintHTML(data: ChallanPrintData): string {
  const company = data.company || {};
  const nowTime = new Date(data.challan_date || new Date().toISOString()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const lrRows = data.lr_list || [];
  const totalPackages = (data.lr_list || []).reduce(
    (sum, item) => sum + (Number(item.packages) || 0),
    0
  );
  const calculatedToPay = lrRows
    .filter((item) => item.status === 'to_pay')
    .reduce((sum, item) => sum + (Number(item.freight) || 0), 0);
  const calculatedPaid = lrRows
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + (Number(item.freight) || 0), 0);
  const totalToPay = Number(data.total_to_pay ?? calculatedToPay);
  const totalPaid = Number(data.total_paid ?? calculatedPaid);
  const totalFreight = totalToPay + totalPaid;
  const hamali = Number(data.hamali || 0);
  const advance = Number(data.advance || 0);
  const balance = totalToPay + advance - hamali;
  const challanRows = (data.lr_list || []).length ? data.lr_list : [{}];

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Challan ${data.challan_no}</title>
    <style>
      * { box-sizing: border-box; }
      @page { size: A4 portrait; margin: 8mm; }
      body { font-family: Arial, sans-serif; margin: 0; color: #111; }
      .sheet.challan-sheet {
        min-height: calc(297mm - 16mm);
        border: 1.4px solid #222;
        padding: 4mm;
      }
      .challan-sheet .brand-head {
        display: grid;
        grid-template-columns: 84px 1fr;
        gap: 10px;
        align-items: center;
        margin-bottom: 4px;
      }
      .challan-sheet .logo-box {
        border: 1px solid #222;
        min-height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }
      .challan-sheet .logo-box img {
        max-width: 72px;
        max-height: 60px;
        object-fit: contain;
      }
      .challan-sheet .top-note {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .challan-sheet .title {
        text-align: center;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .challan-sheet .transport {
        text-align: center;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 2px;
      }
      .challan-sheet .company-line {
        text-align: center;
        font-size: 11px;
        margin-bottom: 2px;
      }
      .challan-sheet .meta-head {
        border-top: 1px solid #222;
        border-bottom: 1px solid #222;
        padding: 6px 0;
        margin: 6px 0 0;
      }
      .challan-sheet .challan-info {
        display: flex;
        justify-content: flex-end;
        gap: 18px;
        margin: 4px 0 6px;
        font-size: 11px;
        font-weight: 700;
      }
      .challan-sheet .meta-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.9fr 0.9fr;
        gap: 2px 10px;
      }
      .challan-sheet .meta-item {
        display: grid;
        grid-template-columns: 88px 8px 1fr;
        font-size: 11px;
        align-items: baseline;
      }
      .challan-sheet .meta-item .label {
        font-weight: 700;
      }
      .challan-sheet table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 0;
      }
      .challan-sheet th,
      .challan-sheet td {
        border: 1px solid #222;
        padding: 4px 4px;
        font-size: 11px;
        height: 26px;
        text-align: center;
        vertical-align: middle;
      }
      .challan-sheet th {
        background: #fff;
        font-weight: 800;
      }
      .challan-sheet td.party {
        text-align: left;
        padding-left: 6px;
        font-weight: 700;
      }
      .challan-sheet td.cons-name,
      .challan-sheet td.consgr-name {
        text-align: left;
        padding-left: 6px;
        font-weight: 700;
      }
      .challan-sheet .table-summary-row td {
        font-weight: 800;
        background: #f8fafc;
      }
      .challan-sheet .table-summary-label {
        text-align: right;
        padding-right: 8px;
        letter-spacing: 0.2px;
      }
      .challan-sheet .bottom-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        border: 1px solid #222;
        border-top: 0;
      }
      .challan-sheet .summary,
      .challan-sheet .other-details {
        padding: 8px;
        min-height: 170px;
      }
      .challan-sheet .summary {
        border-right: 1px solid #222;
      }
      .challan-sheet .summary-line,
      .challan-sheet .other-line {
        display: grid;
        grid-template-columns: 1fr 12px 110px;
        font-size: 11px;
        margin-bottom: 5px;
      }
      .challan-sheet .summary-line .label,
      .challan-sheet .other-title {
        font-weight: 700;
      }
      .challan-sheet .summary-line .value,
      .challan-sheet .other-line .value {
        text-align: right;
        font-weight: 700;
      }
      .challan-sheet .highlight {
        font-size: 14px;
        font-weight: 800;
      }
      .challan-sheet .remarks {
        margin-top: 8px;
        font-size: 11px;
      }
      .challan-sheet .rules {
        border: 1px solid #222;
        border-top: 0;
        padding: 8px;
        font-size: 10px;
        line-height: 1.4;
      }
      .challan-sheet .sign-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 8px;
        font-size: 11px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="sheet challan-sheet">
      <div class="brand-head">
        <div class="logo-box">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="logo" />` : ''}
        </div>
        <div>
          <div class="top-note">Subject to AKOLA Jurisdiction Only .</div>
          <div class="title">GOODS DESPATCH MEMO</div>
          <div class="transport">${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</div>
          <div class="company-line">${escapeHtml(company.address || '')}</div>
          <div class="company-line">GST No. : ${escapeHtml(company.gst_no || '-')}</div>
          <div class="company-line">Contact No.:${escapeHtml(company.company_phone || '')}${company.company_email ? ` Email :${escapeHtml(company.company_email)}` : ''}</div>
        </div>
      </div>

      <div class="meta-head">
        <div class="meta-grid">
          <div class="meta-item"><span class="label">Tpt Name</span><span>:</span><span>${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</span></div>
          <div class="meta-item"><span class="label">Driver</span><span>:</span><span>${escapeHtml(data.driver_name || '-')}</span></div>
          <div class="meta-item"><span class="label">CH.No.</span><span>:</span><span>${escapeHtml(data.challan_no || '-')}</span></div>
          <div class="meta-item"><span class="label">Owner</span><span>:</span><span>${escapeHtml(data.owner_name || '-')}</span></div>
          <div class="meta-item"><span class="label">From</span><span>:</span><span>${escapeHtml(data.from_city || '-')}</span></div>
          <div class="meta-item"><span class="label">Mob No.</span><span>:</span><span>${escapeHtml(data.driver_mobile || '-')}</span></div>
          <div class="meta-item"><span class="label">MV.No.</span><span>:</span><span>${escapeHtml(data.truck_no || '-')}</span></div>
          <div class="meta-item"><span class="label">To</span><span>:</span><span>${escapeHtml(data.to_city || '-')}</span></div>
          <div class="meta-item"><span class="label">Date</span><span>:</span><span>${escapeHtml(new Date(data.challan_date).toLocaleDateString('en-IN'))}</span></div>
          <div class="meta-item"><span class="label">Eway No</span><span>:</span><span>${escapeHtml(data.eway_no || '-')}</span></div>
          <div class="meta-item"></div>
          <div class="meta-item"><span class="label">Time</span><span>:</span><span>${escapeHtml(nowTime)}</span></div>
          <div class="meta-item"></div>
          <div class="meta-item"></div>
          <div class="meta-item"><span class="label">Page</span><span>:</span><span>1 / 1</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:6%;">Sr.</th>
            <th style="width:13%;">City</th>
            <th style="width:18%;">Consignee Name</th>
            <th style="width:14%;">Bilti / LR No.</th>
            <th style="width:12%;">Invoice No.</th>
            <th style="width:8%;">Qty</th>
            <th style="width:11%;">Freight</th>
            <th>Consigner</th>
          </tr>
        </thead>
        <tbody>
          ${challanRows
            .map(
              (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(item.city || item.to_city || '')}</td>
                <td class="cons-name">${escapeHtml(item.consignee || item.party_name || '')}</td>
                <td>${escapeHtml(item.lr_no || '')}</td>
                <td>${escapeHtml(item.invoice_no || '')}</td>
                <td>${escapeHtml(item.packages ?? '')}</td>
                <td>${item.status === 'to_pay' ? Number(item.freight || 0).toFixed(2) : ''}</td>
                <td class="consgr-name">${escapeHtml(item.consignor || '')}</td>
              </tr>
            `
            )
            .join('')}
          <tr class="table-summary-row">
            <td colspan="5" class="table-summary-label">TOTAL</td>
            <td>${totalPackages}</td>
            <td>${totalToPay.toFixed(2)}</td>
            <td class="consgr-name">Paid: ${totalPaid.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="bottom-grid">
        <div class="summary">
          <div class="summary-line"><span class="label">To Pay</span><span>:</span><span class="value">${totalToPay.toFixed(2)}</span></div>
          <div class="summary-line"><span class="label">Frt. Share (C.G)</span><span>:</span><span class="value">0.00</span></div>
          <div class="summary-line"><span class="label">Hamali</span><span>:</span><span class="value">${hamali.toFixed(2)}</span></div>
          <div class="summary-line"><span class="label">Door Delivery Chg.</span><span>:</span><span class="value">0.00</span></div>
          <div class="summary-line"><span class="label">Extra Bulky</span><span>:</span><span class="value">0.00</span></div>
          <div class="summary-line"><span class="label">Truck Freight</span><span>:</span><span class="value">0.00</span></div>
          <div class="summary-line"><span class="label">Advance</span><span>:</span><span class="value">${advance.toFixed(2)}</span></div>
          <div class="summary-line highlight"><span class="label">BALANCE (Dr)</span><span>:</span><span class="value">${balance.toFixed(2)}</span></div>
          <div class="summary-line"><span class="label">Please Dr our A/c with Rs.</span><span>:</span><span class="value">${balance.toFixed(2)}</span></div>
          <div class="summary-line"><span class="label">Receive TOTAL PKGS.</span><span>:</span><span class="value">${totalPackages}</span></div>
          <div class="remarks"><strong>Remarks :</strong> ${escapeHtml(data.remarks || '')}</div>
        </div>
        <div class="other-details">
          <div class="other-title">Other Details</div>
          <div class="other-line"><span>Starting Reading</span><span>:</span><span class="value">${Number(data.engine_reading || 0).toFixed(0)}</span></div>
          <div class="other-line"><span>Ending Reading</span><span>:</span><span class="value">${Number(data.short_reading || 0).toFixed(0)}</span></div>
          <div class="other-line"><span>Total KM</span><span>:</span><span class="value">${Number(data.reading_total || 0).toFixed(0)}</span></div>
          <div class="other-line"><span>Rate Per KM</span><span>:</span><span class="value">${Number(data.rate_per_km || 0).toFixed(2)}</span></div>
          <div class="sign-row">
            <div>Driver Sign.</div>
          </div>
        </div>
      </div>

      <div class="rules">
        नियम: (१) सदरहू मोटार कोण त्याही कारणाने बिघडल्यास आम्ही मालाची खोडी न करता स्वतःच्या खर्चाने माल मेमो लिहिलेल्या गावी मालधन्यास पोहोचविण्यास बंधनकारक आहोत व त्याची पूर्ण जबाबदारी आमची आहे. (२) आग, पाणी, हवा यापासून झालेल्या नुकसानीस पूर्णपणे गाडीमालक जबाबदार राहील. (३) सदरहू मालास कमी जास्त झाल्यास त्याची नुकसान भरपाई करून देण्यास आम्ही तयार आहोत. (४) सदरहू माल घेणारा मालधन्याशिवाय दुसऱ्या कोणत्याही जागेवर उतरविण्यास त्याची जबाबदारी आमचेवर असून खोटी न करता मालधन्यास पोहोचविण्यास तयार आहोत. (५) सदरहू माल आम्ही डाग मोजून घेतले आहेत, त्याचप्रमाणे मालाच्या बिलट्या समजून घेतल्या आहेत. वरील सर्व नियम आम्ही समजून घेतले आहेत व आम्हास ते मान्य आहेत.
      </div>
    </div>
  </body>
  </html>`;
}

export function exportToCSV(data: any[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0] || {});
  const rows = data.map((item) =>
    headers.map((header) => {
      const value = item[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
  );

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printHTML(html: string): void {
  let outputHtml = html;

  if (html.includes('<title>LR ') && html.includes('sheet lr-sheet')) {
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      const bodyInner = bodyMatch[1];
      const duplicatedBody = `
        <body>
          <div class="lr-a4-copies">
            ${bodyInner}
            ${bodyInner}
          </div>
        </body>
      `;

      outputHtml = html
        .replace(/@page\s*\{[^}]*\}/, '@page { size: A4 portrait; margin: 4mm; }')
        .replace(
          '</style>',
          `
          .lr-a4-copies {
            display: flex;
            flex-direction: column;
            gap: 2mm;
          }
          .lr-a4-copies .sheet.lr-sheet {
            box-sizing: border-box;
            min-height: calc((297mm - 30mm) / 2);
            height: calc((297mm - 30mm) / 2);
            max-height: calc((297mm - 30mm) / 2);
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          </style>`
        )
        .replace(/<body>[\s\S]*<\/body>/i, duplicatedBody);
    }
  }

  const printWindow = window.open('', '', 'height=700,width=900');
  if (printWindow) {
    printWindow.document.write(outputHtml);
    printWindow.document.close();
    printWindow.print();
  }
}

export function printImageDocument(title: string, imageUrl: string): void {
  if (!imageUrl || typeof window === 'undefined') return;

  const printWindow = window.open('', '', 'height=700,width=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
          }
          img {
            max-width: 100%;
            max-height: calc(100vh - 20mm);
            object-fit: contain;
            border: 1px solid #222;
          }
        </style>
      </head>
      <body>
        <img src="${imageUrl}" alt="${escapeHtml(title)}" onload="window.print()" />
      </body>
    </html>
  `);
  printWindow.document.close();
}

/** Print one or more POD images in a single print dialog (one section per image, page break between). */
export function printPodImagesBatch(items: { title: string; imageUrl: string }[]): void {
  const list = items.filter((item) => item.imageUrl?.trim());
  if (list.length === 0 || typeof window === 'undefined') return;

  const printWindow = window.open('', '', 'height=700,width=900');
  if (!printWindow) return;

  const body = list
    .map(
      (item, idx) => `
    <section class="pod-sheet" style="page-break-after: ${idx < list.length - 1 ? 'always' : 'auto'};">
      <h2 style="font-size:13px;margin:0 0 10px;font-family:system-ui,sans-serif;">${escapeHtml(item.title)}</h2>
      <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;">
        <img src="${item.imageUrl}" alt="${escapeHtml(item.title)}" style="max-width:100%;max-height:72vh;object-fit:contain;border:1px solid #222;" />
      </div>
    </section>`
    )
    .join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>POD batch (${list.length})</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; background: #fff; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body>${body}
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export async function downloadPDF(html: string, filename: string): Promise<void> {
  try {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html, filename }),
    });

    if (!response.ok) throw new Error('PDF generation failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    // Fallback: download printable HTML if PDF API is not configured.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
