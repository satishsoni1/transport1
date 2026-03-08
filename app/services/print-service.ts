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
  to_city: string;
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
  @page { size: A5 portrait; margin: 8mm; }
  .sheet { width: 100%; min-height: 100%; border: 1px solid #222; padding: 6mm; }
  .header { display: flex; gap: 8px; border-bottom: 1px solid #222; padding-bottom: 6px; margin-bottom: 8px; }
  .logo { width: 48px; height: 48px; object-fit: contain; }
  .title { font-size: 16px; font-weight: 700; }
  .sub { font-size: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .box { border: 1px solid #666; padding: 6px; font-size: 10px; }
  .box h4 { margin: 0 0 4px 0; font-size: 11px; }
  .line { margin: 2px 0; }
  .lbl { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #666; padding: 4px; font-size: 9px; }
  th { background: #f4f4f4; }
  .totals { margin-top: 6px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .totals .box { padding: 4px; }
  .footer { margin-top: 8px; display: flex; justify-content: space-between; align-items: end; gap: 8px; }
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

export function generateLRPrintHTML(data: LRPrintData): string {
  const company = data.company || {};
  const freightTypeLabel =
    data.freight_type === 'paid' ? 'Paid' : data.freight_type === 'tbb' ? 'TBB' : 'To Pay';

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
          <div class="line"><span class="lbl">To:</span> ${data.to_city || '-'}</div>
        </div>
      </div>

      <div class="grid2" style="margin-top:6px;">
        <div class="box">
          <h4>Consignor</h4>
          <div class="line"><span class="lbl">Name:</span> ${data.consignor || '-'}</div>
          <div class="line"><span class="lbl">Address:</span> ${data.consignor_address || '-'}</div>
          <div class="line"><span class="lbl">City:</span> ${data.consignor_city || '-'}</div>
          <div class="line"><span class="lbl">Contact:</span> ${data.consignor_mobile || '-'}</div>
          <div class="line"><span class="lbl">GST:</span> ${data.consignor_gst || '-'}</div>
        </div>
        <div class="box">
          <h4>Consignee</h4>
          <div class="line"><span class="lbl">Name:</span> ${data.consignee || '-'}</div>
          <div class="line"><span class="lbl">Name (Mr):</span> ${data.consignee_name_mr || '-'}</div>
          <div class="line"><span class="lbl">City:</span> ${data.consignee_city || '-'}</div>
          <div class="line"><span class="lbl">City (Mr):</span> ${data.consignee_city_mr || '-'}</div>
          <div class="line"><span class="lbl">Contact:</span> ${data.consignee_mobile || '-'}</div>
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
          ${(data.goods_items || [])
            .map(
              (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.qty ?? ''}</td>
                <td>${item.type ?? ''}</td>
                <td>${item.nature ?? item.description ?? ''}</td>
                <td>${item.weight_kg ?? ''}</td>
                <td>${Number(item.rate || 0).toFixed(2)}</td>
                <td>${Number(item.amount || 0).toFixed(2)}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="box"><span class="lbl">Freight:</span> ${Number(data.freight || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Hamali:</span> ${Number(data.hamali || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">L.R. Charge:</span> ${Number(data.lr_charge || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Advance:</span> ${Number(data.advance || 0).toFixed(2)}</div>
        <div class="box"><span class="lbl">Balance:</span> ${Number(data.balance || 0).toFixed(2)}</div>
      </div>

      ${data.remarks ? `<div class="box" style="margin-top:6px;"><span class="lbl">Remarks:</span> ${data.remarks}</div>` : ''}

      <div class="footer">
        <div class="qr-row">
          <div class="qr-box">
            <img src="${company.transporter_qr_url || getLRQr(company.company_name || 'TRANSPORT')}" alt="transporter qr" />
            <div>Transporter QR</div>
          </div>
          <div class="qr-box">
            <img src="${getLRQr(data.lr_no)}" alt="lr qr" />
            <div>LR QR (${data.lr_no})</div>
          </div>
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

    if (!response.ok) {
      throw new Error('PDF generation failed');
    }

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
    throw error;
  }
}
