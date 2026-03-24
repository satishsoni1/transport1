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
    (sum, item) => sum + (Number(item.weight_kg) || 0),
    0
  );
  const totalWeightMt = totalWeightKg / 1000;
  const payableAmount = Number(data.freight || 0) + Number(data.hamali || 0) + Number(data.lr_charge || 0);
  const amountWords = numberToWords(payableAmount);
  const lrQr = getLRQr(data.lr_no);
  const transporterQr = company.transporter_qr_url || '';
  const showFreight = data.freight_type === 'to_pay';

  const cityToMr = data.to_city_mr || data.consignee_city_mr || '';
  const cityFromMr = data.from_city_mr || '';
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
        padding: 2.5mm;
      }
      .lr-sheet .header {
        align-items: center;
        min-height: 62px;
        padding-bottom: 3px;
        margin-bottom: 3px;
      }
      .lr-sheet .transport-name {
        font-family: ${transporterNameFont}, Arial, sans-serif;
        font-size: 19px;
        font-weight: 800;
        letter-spacing: 0.3px;
        line-height: 1.05;
      }
      .lr-sheet .header-meta {
        font-size: 9px;
        line-height: 1.2;
      }
      .lr-sheet .lr-meta-grid,
      .lr-sheet .party-grid,
      .lr-sheet .info-grid {
        display: grid;
        gap: 4px;
      }
      .lr-sheet .lr-meta-grid {
        grid-template-columns: 1.05fr 0.95fr;
      }
      .lr-sheet .party-grid {
        grid-template-columns: 1fr 1fr;
        margin-top: 4px;
      }
      .lr-sheet .info-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-top: 4px;
      }
      .lr-sheet .box {
        padding: 3px 4px;
        font-size: 8.4px;
      }
      .lr-sheet .box h4 {
        font-size: 10px;
        margin-bottom: 3px;
      }
      .lr-sheet .key-value {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: 1px 0;
      }
      .lr-sheet .goods-table {
        margin-top: 4px;
      }
      .lr-sheet .goods-table th,
      .lr-sheet .goods-table td {
        font-size: 8px;
        height: 22px;
        text-align: center;
        vertical-align: middle;
      }
      .lr-sheet .goods-table td.desc-cell {
        text-align: left;
        padding-left: 4px;
      }
      .lr-sheet .goods-table col:nth-child(1) { width: 8%; }
      .lr-sheet .goods-table col:nth-child(2) { width: 11%; }
      .lr-sheet .goods-table col:nth-child(3) { width: 21%; }
      .lr-sheet .goods-table col:nth-child(4) { width: 18%; }
      .lr-sheet .goods-table col:nth-child(5) { width: 13%; }
      .lr-sheet .goods-table col:nth-child(6) { width: 13%; }
      .lr-sheet .goods-table col:nth-child(7) { width: 16%; }
      .lr-sheet .totals {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 4px;
      }
      .lr-sheet .remarks-box {
        min-height: 32px;
      }
      .lr-sheet .footer {
        margin-top: 4px;
        min-height: 52px;
      }
      .lr-sheet .footer-note {
        font-size: 9px;
        font-weight: 700;
      }
      .lr-sheet .payment-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .lr-sheet .payment-box img {
        width: 52px;
        height: 52px;
        border: 1px solid #666;
        padding: 2px;
      }
      .lr-sheet .payment-copy {
        font-size: 8.6px;
        line-height: 1.2;
      }
    </style>
  </head>
  <body>
    <div class="sheet lr-sheet">
      <div class="header">
        ${company.logo_url ? `<img class="logo" src="${company.logo_url}" alt="logo" />` : ''}
        <div>
          <div class="transport-name">${escapeHtml(company.company_name || 'TRIMURTI TRANSPORT')}</div>
          <div class="header-meta">${escapeHtml(company.address || '')}</div>
          <div class="header-meta">${escapeHtml(company.company_phone || '')} ${company.company_email ? `| ${escapeHtml(company.company_email)}` : ''}</div>
          ${company.gst_no ? `<div class="header-meta">GSTIN: ${escapeHtml(company.gst_no)}</div>` : ''}
        </div>
      </div>

      <div class="content">
      <div class="lr-meta-grid">
        <div class="box">
          <h4>L.R. Details</h4>
          <div class="key-value"><span class="lbl">LR No</span><span>${escapeHtml(data.lr_no)}</span></div>
          <div class="key-value"><span class="lbl">Date</span><span>${escapeHtml(new Date(data.lr_date).toLocaleDateString('en-IN'))}</span></div>
          <div class="key-value"><span class="lbl">Invoice No</span><span>${escapeHtml(data.invoice_no || '-')}</span></div>
          <div class="key-value"><span class="lbl">Freight Type</span><span>${escapeHtml(freightTypeLabel)}</span></div>
        </div>
        <div class="box">
          <h4>Delivery & Route</h4>
          <div class="key-value"><span class="lbl">Booking From</span><span>${escapeHtml(data.from_city || '-')}</span></div>
          <div class="key-value"><span class="lbl">Destination</span><span>${escapeHtml(data.to_city || '-')}</span></div>
          <div class="line"><span class="lbl">To (Mr):</span> ${escapeHtml(cityToMr || '-')}</div>
          <div class="line"><span class="lbl">Delivery At:</span> ${escapeHtml(data.delivery_address || data.consignee_address || '-')}</div>
          <div style="margin-top:3px;text-align:right;">
            <img src="${lrQr}" alt="lr qr" style="width:58px;height:58px;object-fit:contain;border:1px solid #666;padding:2px;" />
            <div style="font-size:8px;">LR QR</div>
          </div>
        </div>
      </div>

      <div class="party-grid">
        <div class="box">
          <h4>Consignor</h4>
          <div class="line"><span class="lbl">Name:</span> ${escapeHtml(data.consignor || '-')}</div>
          <div class="line"><span class="lbl">Name (Mr):</span> ${escapeHtml(data.consignor_name_mr || '-')}</div>
          <div class="line"><span class="lbl">Address:</span> ${escapeHtml(data.consignor_address || '-')}</div>
          <div class="line"><span class="lbl">City:</span> ${escapeHtml(data.consignor_city || '-')}</div>
          <div class="line"><span class="lbl">Contact:</span> ${escapeHtml(data.consignor_mobile || '-')}</div>
          <div class="line"><span class="lbl">GST:</span> ${escapeHtml(data.consignor_gst || '-')}</div>
        </div>
        <div class="box">
          <h4>Consignee</h4>
          <div class="line" style="font-size:11px;font-weight:700;">${escapeHtml(data.consignee || '-')}</div>
          <div class="line">${escapeHtml(data.consignee_name_mr || '-')}</div>
          <div class="line">${escapeHtml(data.consignee_address || '-')}</div>
          <div class="line"><span class="lbl">City:</span> ${escapeHtml(data.consignee_city || '-')}</div>
          <div class="line"><span class="lbl">City (Mr):</span> ${escapeHtml(data.consignee_city_mr || '-')}</div>
          <div class="line"><span class="lbl">Mobile:</span> ${escapeHtml(data.consignee_mobile || '-')}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="box"><span class="lbl">Truck No:</span> ${escapeHtml((data as any).truck_no || '-')}</div>
        <div class="box"><span class="lbl">Driver:</span> ${escapeHtml((data as any).driver_name || '-')}</div>
        <div class="box"><span class="lbl">Mobile:</span> ${escapeHtml((data as any).driver_mobile || '-')}</div>
        <div class="box"><span class="lbl">E-Way No:</span> ${escapeHtml((data as any).eway_no || '-')}</div>
      </div>

      <table class="goods-table">
        <colgroup>
          <col /><col /><col /><col /><col /><col /><col />
        </colgroup>
        <thead>
          <tr>
            <th>No.</th>
            <th>Qty</th>
            <th>Goods Details</th>
            <th>Nature</th>
            <th>Weight</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.qty ?? ''}</td>
                <td class="desc-cell">${escapeHtml(item.type ?? '')}</td>
                <td class="desc-cell">${escapeHtml(item.nature ?? item.description ?? '')}</td>
                <td>${item.weight_kg ?? ''}</td>
                <td>${item.rate !== undefined ? Number(item.rate || 0).toFixed(2) : ''}</td>
                <td>${item.amount !== undefined ? Number(item.amount || 0).toFixed(2) : ''}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="box"><span class="lbl">Freight:</span> ${showFreight ? Number(data.freight || 0).toFixed(2) : '-'}</div>
        <div class="box"><span class="lbl">Hamali:</span> ${Number(data.hamali || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">L.R. Charge:</span> ${Number(data.lr_charge || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Advance:</span> ${Number(data.advance || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Balance:</span> ${Number(data.balance || payableAmount).toFixed(2)}</div>
        <div class="box"><span class="lbl">Qty / Weight:</span> ${totalQty} / ${totalWeightMt.toFixed(3)} MT</div>
      </div>
      <div class="box" style="margin-top:4px;"><span class="lbl">Amount in Words:</span> ${escapeHtml(amountWords)} Only</div>

      <div class="box remarks-box" style="margin-top:4px;"><span class="lbl">Remarks:</span> ${escapeHtml(data.remarks || '')}</div>
      </div>

      <div class="footer">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;flex:1;">
          <div class="footer-note">Subject to Akola Jurisdiction</div>
          ${transporterQr ? `
            <div class="payment-box">
              <img src="${transporterQr}" alt="payment qr" />
              <div class="payment-copy">
                <div class="lbl">Payment QR</div>
                <div>Scan to make freight payment</div>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="sig">
          ${company.signature_url ? `<img src="${company.signature_url}" alt="signature" />` : ''}
          <div class="sig-line">Authorised Sign</div>
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
  const printWindow = window.open('', '', 'height=700,width=900');
  if (printWindow) {
    printWindow.document.write(html);
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
