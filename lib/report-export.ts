import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportRow = Record<string, string | number>;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsToCSV(rows: ReportRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export function exportRowsToPDF(rows: ReportRow[], filename: string, title: string, subtitle?: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '')));

  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 21);
  }

  autoTable(doc, {
    head: [headers.map((h) => h.replace(/_/g, ' ').toUpperCase())],
    body,
    startY: subtitle ? 26 : 20,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}
