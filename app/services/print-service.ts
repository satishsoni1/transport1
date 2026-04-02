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
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  gst_percentage: number;
  format?: InvoicePrintFormat;
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
  const transporterNameFont = escapeHtml(company.transporter_name_font || 'Arial');
  const freightTypeLabel =
    data.freight_type === 'paid' ? 'Paid' : data.freight_type === 'tbb' ? 'TBB' : 'To Pay';
  const totalQty = (data.goods_items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalWeightKg = (data.goods_items || []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.weight_kg) || 0),
    0
  );
  const totalWeightMt = totalWeightKg / 100;
  const payableAmount = Number(data.freight || 0) + Number(data.hamali || 0) + Number(data.lr_charge || 0);
  const amountWords = numberToWords(payableAmount);
  const lrQr = getLRQr(data.lr_no);
  const transporterQr = company.transporter_qr_url || '';

  const cityToMr = data.to_city_mr || data.consignee_city_mr || '';
  const fixedRows = 5;
  const rows = [...(data.goods_items || [])];
  while (rows.length < fixedRows) {
    rows.push({});
  }

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
        border: 1.4px solid #222;
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
        font-size: 8px;
        line-height: 1.1;
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .lr-sheet .transport-name {
        font-family: ${transporterNameFont}, Georgia, 'Times New Roman', serif;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: 0.2px;
        line-height: 1;
        text-align: center;
      }
      .lr-sheet .header-meta {
        font-size: 8px;
        line-height: 1.15;
        text-align: center;
      }
      .lr-sheet .header-gst {
        font-size: 7.8px;
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
        max-width: 64px;
        max-height: 64px;
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
        font-size: 7.5px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      .lr-sheet .party-name {
        font-size: 8px;
        font-weight: 700;
        min-height: 18px;
        margin-bottom: 8px;
      }
      .lr-sheet .party-mobile {
        font-size: 7px;
        font-weight: 700;
        min-height: 14px;
        margin-bottom: 18px;
      }
      .lr-sheet .party-mr {
        font-size: 8.8px;
        font-weight: 700;
        line-height: 1.2;
      }
      .lr-sheet .lr-box .kv {
        display: grid;
        grid-template-columns: 44px 8px 1fr;
        font-size: 8px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .lr-sheet .lr-box .kv.lr-number-row {
        grid-template-columns: 44px 8px 1fr;
        align-items: center;
      }
      .lr-sheet .lr-box .lr-number-value {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .lr-sheet .route-strip {
        display: grid;
        grid-template-columns: 1fr 1fr 1.3fr;
        border-left: 1px solid #222;
        border-right: 1px solid #222;
        border-bottom: 1px solid #222;
      }
      .lr-sheet .route-cell {
        padding: 4px 6px;
        border-right: 1px solid #222;
        font-size: 8px;
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
        font-size: 8.8px;
        font-weight: 700;
        line-height: 1.2;
      }
      .lr-sheet .to-highlight {
        font-size: 10px;
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
      }
      .lr-sheet .goods-table th,
      .lr-sheet .goods-table td {
        border: 1px solid #222;
        font-size: 7.5px;
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
      .lr-sheet .goods-table col:nth-child(1) { width: 35%; }
      .lr-sheet .goods-table col:nth-child(2) { width: 13%; }
      .lr-sheet .goods-table col:nth-child(3) { width: 13%; }
      .lr-sheet .goods-table col:nth-child(4) { width: 14%; }
      .lr-sheet .goods-table col:nth-child(5) { width: 12%; }
      .lr-sheet .goods-table col:nth-child(6) { width: 13%; }
      .lr-sheet .goods-table .totals-row td,
      .lr-sheet .goods-table .amount-row td,
      .lr-sheet .goods-table .words-row td {
        font-weight: 700;
        vertical-align: middle;
      }
      .lr-sheet .goods-table .stamp-cell {
        padding: 0;
        vertical-align: top;
      }
      .lr-sheet .goods-table .stamp-wrap {
        min-height: 66px;
        height: 66px;
        display: grid;
        grid-template-rows: 22px 1fr;
      }
      .lr-sheet .goods-table .stamp-label {
        border-bottom: 1px solid #222;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 7px;
        font-weight: 700;
        padding: 2px 4px;
      }
      .lr-sheet .goods-table .stamp-body {
        min-height: 44px;
      }
      .lr-sheet .goods-table .label-cell {
        text-align: left;
        padding-left: 5px;
      }
      .lr-sheet .goods-table .center-cell {
        text-align: center;
      }
      .lr-sheet .goods-table .value-cell {
        text-align: right;
        padding-right: 5px;
      }
      .lr-sheet .goods-table .grand-total-cell {
        text-align: left;
        padding-left: 5px;
      }
      .lr-sheet .goods-table .grand-total-cell .amount {
        float: right;
        font-size: 9px;
      }
      .lr-sheet .goods-table .words-cell {
        text-align: left;
        padding-left: 5px;
      }
      .lr-sheet .bottom-strip {
        display: grid;
        grid-template-columns: 172px 1fr 78px;
        border-left: 1px solid #222;
        border-right: 1px solid #222;
        border-bottom: 1px solid #222;
        margin-top: -1px;
        min-height: 34px;
      }
      .lr-sheet .qr-strip {
        border-right: 1px solid #222;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
      }
      .lr-sheet .qr-box {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .lr-sheet .qr-box img {
        width: 26px;
        height: 26px;
        object-fit: contain;
        border: 1px solid #222;
        padding: 1px;
        background: #fff;
      }
      .lr-sheet .qr-copy {
        font-size: 6.5px;
        line-height: 1.1;
        font-weight: 700;
      }
      .lr-sheet .bottom-sign {
        border-right: 1px solid #222;
        padding: 3px 5px;
        font-size: 7px;
        font-weight: 700;
        color: #b91c1c;
      }
      .lr-sheet .sign-box {
        padding: 2px 4px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        gap: 2px;
      }
      .lr-sheet .sign-box img.signature {
        max-width: 58px;
        max-height: 14px;
        object-fit: contain;
      }
      .lr-sheet .sign-title {
        font-size: 6.8px;
        font-weight: 700;
        text-align: center;
        line-height: 1.1;
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
          <div class="jurisdiction-note">Subject to Akola Juridication</div>
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
          <div class="kv lr-number-row"><span>LR.No.</span><span>:</span><span class="lr-number-value">${escapeHtml(data.lr_no)}</span></div>
          <div class="kv"><span>Date</span><span>:</span><span>${escapeHtml(new Date(data.lr_date).toLocaleDateString('en-IN'))}</span></div>
          <div class="kv"><span>Inv. No.</span><span>:</span><span>${escapeHtml(data.invoice_no || '-')}</span></div>
        </div>
      </div>

      <div class="route-strip">
        <div class="route-cell">
          <div class="route-inline">
            <span class="muted">From :</span>
            <span>${escapeHtml(data.from_city || '-')}</span>
            <span class="muted">To</span>
            <span class="to-highlight">${escapeHtml(data.to_city || '-')}</span>
          </div>
        </div>
        <div class="route-cell route-mr">${escapeHtml(cityToMr || '-')}</div>
        <div class="route-cell">
          <div style="font-size:7px;font-weight:700;">Delivery At :</div>
          <div style="font-size:7.4px;font-weight:700;">${escapeHtml(data.delivery_address || data.consignee_address || '-')}</div>
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
            <th>FREIGHT TO PAY</th>
          </tr>
        </thead>
	        <tbody>
	          ${rows
	            .map(
	              (item, idx) => `
	              <tr>
	                <td class="desc-cell">${escapeHtml(item.type ?? '')}</td>
	                <td>${item.qty ?? ''}</td>
	                <td>${escapeHtml(item.nature ?? item.description ?? '')}</td>
	                <td>${item.weight_kg ? `${(Number(item.qty) || 0) * (Number(item.weight_kg) || 0)} Kg.` : ''}</td>
	                <td>${item.rate !== undefined ? Number(item.rate || 0).toFixed(2) : ''}</td>
	                <td>${item.amount !== undefined ? Number(item.amount || 0).toFixed(2) : ''}</td>
	              </tr>
	            `
	            )
	            .join('')}
            <tr class="totals-row">
              <td rowspan="3" class="stamp-cell">
                <div class="stamp-wrap">
                  <div class="stamp-label">CONSIGNEE SIGNATURE &amp; STAMP</div>
                  <div class="stamp-body"></div>
                </div>
              </td>
              <td>${totalQty}</td>
              <td>TOTAL</td>
              <td>${totalWeightKg} Kg.</td>
              <td class="center-cell">LR. CHARGE</td>
              <td class="value-cell">${Number(data.lr_charge || 0).toFixed(2)}</td>
            </tr>
            <tr class="amount-row">
              <td></td>
              <td></td>
              <td>${totalWeightMt.toFixed(2)} M.T.</td>
              <td class="center-cell">${escapeHtml(freightTypeLabel.replace('To Pay', 'ToPay'))}</td>
              <td class="grand-total-cell">GRAND TOTAL : <span class="amount">${Number(data.balance || payableAmount).toFixed(2)}</span></td>
            </tr>
            <tr class="words-row">
              <td colspan="5" class="words-cell">AMOUNT IN WORDS : ${escapeHtml(amountWords)} Only</td>
            </tr>
	        </tbody>
	      </table>

      <div class="bottom-strip">
        <div class="qr-strip">
          ${transporterQr ? `
          <div class="qr-box">
            <img src="${transporterQr}" alt="payment qr" />
            <div class="qr-copy">
              <div>PAYMENT</div>
              <div>SCAN QR</div>
            </div>
          </div>` : ''}
          <div class="qr-box">
            <img src="${lrQr}" alt="lr qr" />
            <div class="qr-copy">
              <div>LR QR</div>
              <div>${escapeHtml(data.lr_no)}</div>
            </div>
          </div>
        </div>
        <div class="bottom-sign">${escapeHtml(data.return_remark || data.remarks || '')}</div>
        <div class="sign-box">
          ${company.signature_url ? `<img class="signature" src="${company.signature_url}" alt="signature" />` : ''}
          <div class="sign-title">${escapeHtml(company.company_name || 'TRANSPORT')}</div>
        </div>
      </div>
      </div>
    </div>
  </body>
  </html>`;
}

export function generateInvoicePrintHTML(data: InvoicePrintData): string {
  const company = data.company || {};
  const resolvedFormat = data.format || company.invoice_print_format || 'classic';
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Invoice ${data.invoice_no}</title>
    <style>${getPrintStyle(resolvedFormat)}</style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        ${company.logo_url ? `<img class="logo" src="${company.logo_url}" alt="logo" />` : ''}
        <div>
          <div class="title">${company.company_name || 'TRIMURTI TRANSPORT'}</div>
          <div class="sub">${company.address || ''}</div>
          <div class="sub">${company.company_phone || ''}</div>
          ${company.gst_no ? `<div class="sub">GSTIN: ${company.gst_no}</div>` : ''}
        </div>
      </div>

      <div class="grid2">
        <div class="box">
          <div class="line"><span class="lbl">Invoice No:</span> ${data.invoice_no}</div>
          <div class="line"><span class="lbl">Date:</span> ${new Date(data.invoice_date).toLocaleDateString()}</div>
          <div class="line"><span class="lbl">Party:</span> ${data.party_name}</div>
          <div class="line"><span class="lbl">Party (Mr):</span> ${data.party_name_mr || '-'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sr</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(data.items || [])
            .map(
              (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description || ''}</td>
                <td>${item.qty || 0}</td>
                <td>${Number(item.rate || 0).toFixed(2)}</td>
                <td>${Number(item.amount || 0).toFixed(2)}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="box"><span class="lbl">Subtotal:</span> ${Number(data.total_amount || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">GST (${Number(data.gst_percentage || 0).toFixed(2)}%):</span> ${Number(data.gst_amount || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Net Amount:</span> ${Number(data.net_amount || 0).toFixed(2)}</div>
      </div>

      <div class="footer" style="justify-content:flex-end;">
        <div class="sig">
          ${company.signature_url ? `<img src="${company.signature_url}" alt="signature" />` : ''}
          <div class="sig-line">Authorised Sign</div>
        </div>
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
        .replace(/@page\s*\{[^}]*\}/, '@page { size: A4 portrait; margin: 6mm; }')
        .replace(
          '</style>',
          `
          .lr-a4-copies {
            display: flex;
            flex-direction: column;
            gap: 6mm;
          }
          .lr-a4-copies .sheet.lr-sheet {
            min-height: calc((297mm - 18mm) / 2);
            height: calc((297mm - 18mm) / 2);
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
