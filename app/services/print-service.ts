/**
 * Print Service - Handles PDF generation, print templates, and exports
 */

export interface LRPrintData {
  lr_no: string;
  lr_date: string;
  consignor: string;
  consignee: string;
  from_city: string;
  to_city: string;
  goods_items: any[];
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  truck_no: string;
  driver_name: string;
  driver_mobile: string;
  invoice_no: string;
  remarks: string;
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
}

export interface ChallanPrintData {
  challan_no: string;
  challan_date: string;
  from_city: string;
  to_city: string;
  truck_no: string;
  driver_name: string;
  lr_list: any[];
  total_packages: number;
  total_freight: number;
}

export interface BillPrintData {
  bill_no: string;
  bill_date: string;
  party_name: string;
  period_from: string;
  period_to: string;
  items: any[];
  total_amount: number;
  tds_amount: number;
  net_amount: number;
}

/**
 * Generate HTML for L.R. Print
 */
export function generateLRPrintHTML(data: LRPrintData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>L.R. No: ${data.lr_no}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #333;
          line-height: 1.4;
        }
        .container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
        }
        .page {
          page-break-after: always;
          border: 1px solid #ddd;
          padding: 10mm;
          margin-bottom: 10mm;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .header h1 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .header p {
          font-size: 10px;
          margin: 2px 0;
        }
        .section {
          margin-bottom: 10px;
        }
        .section-title {
          background-color: #f0f0f0;
          padding: 4px 6px;
          font-weight: bold;
          border-left: 3px solid #0066cc;
        }
        .section-content {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-top: none;
        }
        .row {
          display: flex;
          margin-bottom: 4px;
        }
        .col {
          flex: 1;
        }
        .col-label {
          font-weight: bold;
          min-width: 100px;
        }
        .col-value {
          padding-left: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        th {
          background-color: #f0f0f0;
          padding: 4px 6px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: bold;
          font-size: 10px;
        }
        td {
          padding: 4px 6px;
          border: 1px solid #ddd;
          font-size: 10px;
        }
        .total-section {
          display: flex;
          justify-content: flex-end;
          gap: 20px;
          margin-top: 8px;
          padding: 8px;
          background-color: #f9f9f9;
        }
        .total-item {
          min-width: 120px;
        }
        .total-label {
          font-weight: bold;
        }
        .total-value {
          text-align: right;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          text-align: center;
        }
        .signature-line {
          width: 100px;
          border-top: 1px solid #000;
          padding-top: 4px;
          font-size: 9px;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-inside: avoid;
            border: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="page">
          <div class="header">
            <h1>TRIMURTI TRANSPORT</h1>
            <p>Lorry Receipt (L.R.)</p>
          </div>

          <div class="section">
            <div class="section-title">L.R. Details</div>
            <div class="section-content">
              <div class="row">
                <div class="col">
                  <div class="row">
                    <div class="col-label">L.R. No:</div>
                    <div class="col-value">${data.lr_no}</div>
                  </div>
                </div>
                <div class="col">
                  <div class="row">
                    <div class="col-label">L.R. Date:</div>
                    <div class="col-value">${new Date(data.lr_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parties Information</div>
            <div class="section-content">
              <div class="row">
                <div class="col">
                  <div class="row">
                    <div class="col-label">Consignor:</div>
                    <div class="col-value">${data.consignor}</div>
                  </div>
                </div>
                <div class="col">
                  <div class="row">
                    <div class="col-label">Consignee:</div>
                    <div class="col-value">${data.consignee}</div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <div class="row">
                    <div class="col-label">From:</div>
                    <div class="col-value">${data.from_city}</div>
                  </div>
                </div>
                <div class="col">
                  <div class="row">
                    <div class="col-label">To:</div>
                    <div class="col-value">${data.to_city}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Goods Details</div>
            <div class="section-content">
              <table>
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Type</th>
                    <th>Weight (KG)</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.goods_items
                    .map(
                      (item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.description}</td>
                      <td>${item.qty}</td>
                      <td>${item.type}</td>
                      <td>${item.weight_kg}</td>
                      <td>₹${item.rate?.toFixed(2) || 0}</td>
                      <td>₹${item.amount?.toFixed(2) || 0}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Freight Terms & Charges</div>
            <div class="section-content">
              <div class="total-section">
                <div class="total-item">
                  <div class="total-label">Freight:</div>
                  <div class="total-value">₹${data.freight.toFixed(2)}</div>
                </div>
                <div class="total-item">
                  <div class="total-label">Hamali:</div>
                  <div class="total-value">₹${data.hamali.toFixed(2)}</div>
                </div>
                <div class="total-item">
                  <div class="total-label">L.R. Charge:</div>
                  <div class="total-value">₹${data.lr_charge.toFixed(2)}</div>
                </div>
                <div class="total-item">
                  <div class="total-label">Advance:</div>
                  <div class="total-value">₹${data.advance.toFixed(2)}</div>
                </div>
                <div class="total-item">
                  <div class="total-label">Balance:</div>
                  <div class="total-value">₹${data.balance.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Vehicle & Documents</div>
            <div class="section-content">
              <div class="row">
                <div class="col">
                  <div class="row">
                    <div class="col-label">Truck No:</div>
                    <div class="col-value">${data.truck_no}</div>
                  </div>
                </div>
                <div class="col">
                  <div class="row">
                    <div class="col-label">Driver:</div>
                    <div class="col-value">${data.driver_name}</div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <div class="row">
                    <div class="col-label">Mobile:</div>
                    <div class="col-value">${data.driver_mobile}</div>
                  </div>
                </div>
                <div class="col">
                  <div class="row">
                    <div class="col-label">Invoice No:</div>
                    <div class="col-value">${data.invoice_no}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          ${data.remarks ? `
            <div class="section">
              <div class="section-title">Remarks</div>
              <div class="section-content">
                <p>${data.remarks}</p>
              </div>
            </div>
          ` : ''}

          <div class="signature-section">
            <div>
              <div class="signature-line">Consignor Sign</div>
            </div>
            <div>
              <div class="signature-line">Consignee Sign</div>
            </div>
            <div>
              <div class="signature-line">Driver Sign</div>
            </div>
            <div>
              <div class="signature-line">Authorized Sign</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for Invoice Print
 */
export function generateInvoicePrintHTML(data: InvoicePrintData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice: ${data.invoice_no}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #333;
          line-height: 1.4;
        }
        .container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
        }
        .page {
          border: 1px solid #ddd;
          padding: 10mm;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .header p {
          font-size: 10px;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 10px;
        }
        .invoice-info-left, .invoice-info-right {
          flex: 1;
        }
        .invoice-info-left {
          text-align: left;
        }
        .invoice-info-right {
          text-align: right;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
        }
        th {
          background-color: #e8e8e8;
          padding: 6px 8px;
          text-align: left;
          border: 1px solid #999;
          font-weight: bold;
          font-size: 10px;
        }
        td {
          padding: 6px 8px;
          border: 1px solid #ddd;
          font-size: 10px;
        }
        .totals {
          width: 250px;
          margin-left: auto;
          margin-right: 0;
          border: 1px solid #999;
          margin-top: 12px;
        }
        .total-row {
          display: flex;
          padding: 6px 8px;
          border-bottom: 1px solid #ddd;
        }
        .total-row.net {
          background-color: #f0f0f0;
          font-weight: bold;
          border-bottom: 2px solid #000;
          border-top: 2px solid #000;
        }
        .total-label {
          flex: 1;
          text-align: right;
          padding-right: 8px;
        }
        .total-value {
          min-width: 80px;
          text-align: right;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          font-size: 10px;
          text-align: center;
        }
        .signature-line {
          width: 100px;
          border-top: 1px solid #000;
          padding-top: 4px;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="page">
          <div class="header">
            <h1>TRIMURTI TRANSPORT</h1>
            <p>TAX INVOICE</p>
          </div>

          <div class="invoice-info">
            <div class="invoice-info-left">
              <p><strong>Invoice No:</strong> ${data.invoice_no}</p>
              <p><strong>Date:</strong> ${new Date(data.invoice_date).toLocaleDateString()}</p>
              <p><strong>Party:</strong> ${data.party_name}</p>
            </div>
            <div class="invoice-info-right">
              <p><strong>GSTIN:</strong> 27BHDPA6967R1ZM</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No.</th>
                <th style="width: 35%">Description</th>
                <th style="width: 15%">HSN/SAC</th>
                <th style="width: 10%">Qty</th>
                <th style="width: 15%">Rate</th>
                <th style="width: 20%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description}</td>
                  <td>9967</td>
                  <td>${item.qty}</td>
                  <td>₹${item.rate?.toFixed(2) || 0}</td>
                  <td>₹${item.amount?.toFixed(2) || 0}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">₹${data.total_amount.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">GST (${data.gst_percentage}%):</div>
              <div class="total-value">₹${data.gst_amount.toFixed(2)}</div>
            </div>
            <div class="total-row net">
              <div class="total-label">Net Amount:</div>
              <div class="total-value">₹${data.net_amount.toFixed(2)}</div>
            </div>
          </div>

          <div class="signature-section">
            <div>
              <div class="signature-line">Authorized Sign</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string): void {
  const headers = Object.keys(data[0] || {});
  const rows = data.map((item) =>
    headers.map((header) => {
      const value = item[header];
      // Escape quotes in CSV
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

/**
 * Print HTML content
 */
export function printHTML(html: string): void {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}

/**
 * Download HTML as PDF (requires backend support)
 */
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
