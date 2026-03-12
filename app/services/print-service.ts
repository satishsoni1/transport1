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
}

export interface LRPrintData {
  lr_no: string;
  lr_date: string;
  consignor: string;
  consignor_name_mr?: string;
  consignee: string;
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
  freight_type?: 'to_pay' | 'paid' | 'tbb';
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
  company?: CompanyPrintData;
}

const basePrintStyle = `
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
`;

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
  const fixedRows = 8;
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
    <style>${basePrintStyle}</style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        ${company.logo_url ? `<img class="logo" src="${company.logo_url}" alt="logo" />` : ''}
        <div>
          <div class="title">${company.company_name || 'TRIMURTI TRANSPORT'}</div>
          <div class="sub">${company.address || ''}</div>
          <div class="sub">${company.company_phone || ''} ${company.company_email ? `| ${company.company_email}` : ''}</div>
          ${company.gst_no ? `<div class="sub">GSTIN: ${company.gst_no}</div>` : ''}
        </div>
      </div>

      <div class="content">
      <div class="grid2">
        <div class="box">
          <h4>L.R. Details</h4>
          <div class="line"><span class="lbl">LR No:</span> ${data.lr_no}</div>
          <div class="line"><span class="lbl">Date:</span> ${new Date(data.lr_date).toLocaleDateString()}</div>
          <div class="line"><span class="lbl">Invoice No:</span> ${data.invoice_no || '-'}</div>
          <div class="line"><span class="lbl">Freight Type:</span> ${freightTypeLabel}</div>
        </div>
        <div class="box">
          <h4>Route</h4>
          <div class="line"><span class="lbl">From:</span> ${data.from_city || '-'}</div>
          <div class="line"><span class="lbl">From (Mr):</span> ${cityFromMr || '-'}</div>
          <div class="line"><span class="lbl">To:</span> ${data.to_city || '-'}</div>
          <div class="line"><span class="lbl">To (Mr):</span> ${cityToMr || '-'}</div>
          <div style="margin-top:4px;text-align:right;">
            <img src="${lrQr}" alt="lr qr" style="width:72px;height:72px;object-fit:contain;border:1px solid #666;padding:2px;" />
            <div style="font-size:9px;">LR QR</div>
          </div>
        </div>
      </div>

      <div class="grid2" style="margin-top:6px;">
        <div class="box">
          <h4>Consignor</h4>
          <div class="line"><span class="lbl">Name:</span> ${data.consignor || '-'}</div>
          <div class="line"><span class="lbl">Name (Mr):</span> ${data.consignor_name_mr || '-'}</div>
          <div class="line"><span class="lbl">Address:</span> ${data.consignor_address || '-'}</div>
          <div class="line"><span class="lbl">City:</span> ${data.consignor_city || '-'}</div>
          <div class="line"><span class="lbl">Contact:</span> ${data.consignor_mobile || '-'}</div>
          <div class="line"><span class="lbl">GST:</span> ${data.consignor_gst || '-'}</div>
        </div>
        <div class="box">
          <h4>Consignee</h4>
          <div class="line" style="font-size:12px;font-weight:700;">${data.consignee || '-'}</div>
          <div class="line" style="font-size:11px;">${data.consignee_name_mr || '-'}</div>
          <div class="line" style="font-size:12px;font-weight:700;">${data.consignee_city || '-'}</div>
          <div class="line"><span class="lbl">City (Mr):</span> ${data.consignee_city_mr || '-'}</div>
          <div class="line" style="font-size:12px;font-weight:700;"><span class="lbl">Mobile:</span> ${data.consignee_mobile || '-'}</div>
          <div class="line"><span class="lbl">GST:</span> ${data.consignee_gst || '-'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sr</th>
            <th>Qty</th>
            <th>Type</th>
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
                <td>${item.type ?? ''}</td>
                <td>${item.nature ?? item.description ?? ''}</td>
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
        <div class="box"><span class="lbl">Total Qty / Weight:</span> ${totalQty} / ${totalWeightMt.toFixed(3)} MT</div>
      </div>
      <div class="box" style="margin-top:6px;"><span class="lbl">Amount in Words:</span> ${amountWords} Only</div>

      ${data.remarks ? `<div class="box" style="margin-top:6px;"><span class="lbl">Remarks:</span> ${data.remarks}</div>` : ''}
      </div>

      <div class="footer">
        <div style="font-size:10px;font-weight:700;">Subject to Akola Jurisdiction</div>
        <div class="sig">
          ${transporterQr ? `<img src="${transporterQr}" alt="transporter qr" style="width:56px;height:56px;object-fit:contain;border:1px solid #666;padding:2px;margin-bottom:4px;" />` : ''}
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
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Invoice ${data.invoice_no}</title>
    <style>${basePrintStyle}</style>
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
