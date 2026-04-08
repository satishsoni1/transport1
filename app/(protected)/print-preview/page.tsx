'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Printer, Download, FileText } from 'lucide-react';
import {
  generateLRPrintHTML,
  generateInvoicePrintHTML,
  generateChallanPrintHTML,
  printHTML,
  downloadPDF,
  exportToCSV,
} from '@/app/services/print-service';
import { transliterateToMarathi } from '@/app/services/marathi';
import useSWR from 'swr';

type DocumentType = 'lr' | 'invoice' | 'challan' | 'bill';

interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  consignee_id: number;
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
  status: 'to_pay' | 'paid' | 'tbb';
}

interface Invoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  consignor_id?: number;
  items: any[];
  additional_charges?: any[];
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  gst_percentage: number;
}

interface Challan {
  id: number;
  challan_no: string;
  challan_date: string;
  from_city: string;
  to_city: string;
  truck_no: string;
  driver_name: string;
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
  total_to_pay?: number;
  total_paid?: number;
  lr_list: any[];
  total_freight: number;
}

interface MonthlyBill {
  id: number;
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

interface Consignor {
  id: number;
  name: string;
  name_mr?: string;
  address: string;
  city: string;
  gst_no: string;
  mobile: string;
}

interface Consignee {
  id: number;
  name: string;
  name_mr?: string;
  address: string;
  city: string;
  city_mr?: string;
  gst_no: string;
  mobile: string;
}

interface AdminSettings {
  company_name?: string;
  company_tagline?: string;
  app_title?: string;
  company_email?: string;
  company_phone?: string;
  address?: string;
  gst_no?: string;
  logo_url?: string;
  signature_url?: string;
  transporter_qr_url?: string;
  lr_print_format?: 'classic' | 'compact' | 'detailed';
  invoice_print_format?: 'classic' | 'compact' | 'detailed';
}

function generateBillHTML(bill: MonthlyBill, settings?: AdminSettings): string {
  return `
    <html><head><title>Bill ${bill.bill_no}</title></head>
    <body style="font-family:Arial;padding:16px">
      <div style="display:flex;gap:8px;align-items:flex-start;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:8px;">
        ${settings?.logo_url ? `<img src="${settings.logo_url}" style="width:48px;height:48px;object-fit:contain;" />` : ''}
        <div>
          <h2 style="margin:0">${settings?.company_name || settings?.app_title || 'Transport Company'} - MONTHLY BILL</h2>
          <p style="margin:2px 0">${settings?.address || ''}</p>
          <p style="margin:2px 0">${settings?.company_phone || ''}</p>
        </div>
      </div>
      <p><b>No:</b> ${bill.bill_no} | <b>Date:</b> ${new Date(bill.bill_date).toLocaleDateString()}</p>
      <p><b>Party:</b> ${bill.party_name}</p>
      <p><b>Period:</b> ${new Date(bill.period_from).toLocaleDateString()} - ${new Date(bill.period_to).toLocaleDateString()}</p>
      <table border="1" cellspacing="0" cellpadding="6" width="100%">
        <tr><th>Invoice No</th><th>Date</th><th>Amount</th><th>TDS</th><th>Net</th></tr>
        ${(bill.items || [])
          .map(
            (item: any) =>
              `<tr><td>${item.invoice_no || ''}</td><td>${item.invoice_date ? new Date(item.invoice_date).toLocaleDateString() : ''}</td><td>${Number(item.amount || 0).toFixed(2)}</td><td>${Number(item.tds || 0).toFixed(2)}</td><td>${Number(item.net_amount || 0).toFixed(2)}</td></tr>`
          )
          .join('')}
      </table>
      <p style="margin-top:12px"><b>Total:</b> ₹${Number(bill.total_amount || 0).toFixed(2)} | <b>TDS:</b> ₹${Number(bill.tds_amount || 0).toFixed(2)} | <b>Net:</b> ₹${Number(bill.net_amount || 0).toFixed(2)}</p>
    </body></html>
  `;
}

export default function PrintPreviewPage() {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState<DocumentType>('lr');
  const [documentNo, setDocumentNo] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);

  const { data: lrEntries = [] } = useSWR<LREntry[]>('/api/daily-entry/lr-entries', apiClient.get);
  const { data: invoices = [] } = useSWR<Invoice[]>('/api/daily-entry/invoices', apiClient.get);
  const { data: challans = [] } = useSWR<Challan[]>('/api/daily-entry/challans', apiClient.get);
  const { data: bills = [] } = useSWR<MonthlyBill[]>('/api/daily-entry/monthly-bills', apiClient.get);
  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: consignees = [] } = useSWR<Consignee[]>('/api/masters/consignees', apiClient.get);
  const { data: settings } = useSWR<AdminSettings>('/api/admin/settings', apiClient.get);

  const handleLoadPreview = useCallback(async () => {
    if (!documentNo.trim()) {
      toast.error('Please enter document number');
      return;
    }

    setLoading(true);
    try {
      let html = '';
      let exportRows: any[] = [];

      if (documentType === 'lr') {
        const lr = lrEntries.find((item) => item.lr_no === documentNo.trim());
        if (!lr) throw new Error('L.R. not found');

        const consignorName =
          consignors.find((item) => item.id === lr.consignor_id)?.name ||
          `Consignor #${lr.consignor_id}`;
        const consigneeName =
          consignees.find((item) => item.id === lr.consignee_id)?.name ||
          `Consignee #${lr.consignee_id}`;

        html = generateLRPrintHTML({
          ...lr,
          consignor: consignorName,
          consignor_name_mr:
            consignors.find((item) => item.id === lr.consignor_id)?.name_mr ||
            transliterateToMarathi(consignorName),
          consignee: consigneeName,
          consignor_address: consignors.find((item) => item.id === lr.consignor_id)?.address || '',
          consignor_city: consignors.find((item) => item.id === lr.consignor_id)?.city || '',
          consignor_mobile: consignors.find((item) => item.id === lr.consignor_id)?.mobile || '',
          consignor_gst: consignors.find((item) => item.id === lr.consignor_id)?.gst_no || '',
          consignee_address: consignees.find((item) => item.id === lr.consignee_id)?.address || '',
          consignee_city: consignees.find((item) => item.id === lr.consignee_id)?.city || '',
          consignee_city_mr: consignees.find((item) => item.id === lr.consignee_id)?.city_mr || '',
          consignee_name_mr: consignees.find((item) => item.id === lr.consignee_id)?.name_mr || '',
          consignee_mobile: consignees.find((item) => item.id === lr.consignee_id)?.mobile || '',
          consignee_gst: consignees.find((item) => item.id === lr.consignee_id)?.gst_no || '',
          freight_type: lr.status,
          format: settings?.lr_print_format || 'classic',
          company: settings,
        });
        exportRows = lr.goods_items?.length
          ? lr.goods_items.map((g: any) => ({
              lr_no: lr.lr_no,
              date: lr.lr_date,
              consignor: consignorName,
              consignee: consigneeName,
              description: g.description,
              qty: g.qty,
              amount: g.amount,
            }))
          : [{ lr_no: lr.lr_no, date: lr.lr_date, consignor: consignorName, consignee: consigneeName, freight: lr.freight }];
      } else if (documentType === 'invoice') {
        const invoice = invoices.find((item) => item.invoice_no === documentNo.trim());
        if (!invoice) throw new Error('Invoice not found');

        html = generateInvoicePrintHTML({
          ...invoice,
          gst_percentage: Number(invoice.gst_percentage || 0),
          party_name_mr:
            consignors.find((item) => item.id === Number(invoice.consignor_id))?.name_mr ||
            transliterateToMarathi(invoice.party_name || ''),
          format: settings?.invoice_print_format || 'classic',
          company: settings,
        });
        exportRows = (invoice.items || []).map((i: any) => ({
          invoice_no: invoice.invoice_no,
          date: invoice.invoice_date,
          party_name: invoice.party_name,
          description: i.description,
          qty: i.qty,
          amount: i.amount,
        }));
      } else if (documentType === 'challan') {
        const challan = challans.find((item) => item.challan_no === documentNo.trim());
        if (!challan) throw new Error('Challan not found');
        html = generateChallanPrintHTML({
          ...challan,
          company: settings,
        });
        exportRows = (challan.lr_list || []).map((lr: any) => ({
          challan_no: challan.challan_no,
          lr_no: lr.lr_no,
          city: lr.city,
          consignee: lr.consignee,
          freight: lr.freight,
        }));
      } else if (documentType === 'bill') {
        const bill = bills.find((item) => item.bill_no === documentNo.trim());
        if (!bill) throw new Error('Monthly bill not found');
        html = generateBillHTML(bill, settings);
        exportRows = (bill.items || []).map((i: any) => ({
          bill_no: bill.bill_no,
          invoice_no: i.invoice_no,
          amount: i.amount,
          tds: i.tds,
          net_amount: i.net_amount,
        }));
      }

      setPreviewHTML(html);
      setCsvData(exportRows);
      toast.success('Document preview loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load document preview');
    } finally {
      setLoading(false);
    }
  }, [documentType, documentNo, lrEntries, invoices, challans, bills, consignors, consignees, settings]);

  const handlePrint = useCallback(() => {
    if (!previewHTML) return toast.error('Please load a document first');
    printHTML(previewHTML);
  }, [previewHTML]);

  const handleDownloadPDF = useCallback(async () => {
    if (!previewHTML) return toast.error('Please load a document first');
    try {
      await downloadPDF(previewHTML, `${documentType}-${documentNo}`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to download PDF');
    }
  }, [previewHTML, documentType, documentNo]);

  const handleExportCSV = useCallback(() => {
    if (!csvData.length) {
      toast.error('No export data');
      return;
    }
    exportToCSV(csvData, `${documentType}-${documentNo}`);
    toast.success('CSV exported successfully');
  }, [csvData, documentType, documentNo]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Print & Export</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doc-type">Document Type</Label>
              <select
                id="doc-type"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={documentType}
                onChange={(e) => {
                  setDocumentType(e.target.value as DocumentType);
                  setPreviewHTML('');
                  setCsvData([]);
                }}
              >
                <option value="lr">Lorry Receipt (L.R.)</option>
                <option value="invoice">Invoice</option>
                <option value="challan">Challan / Goods Despatch</option>
                <option value="bill">Monthly Bill</option>
              </select>
            </div>
            <div>
              <Label htmlFor="doc-no">Document Number</Label>
              <Input
                id="doc-no"
                placeholder="Enter exact document number (e.g. LR00001)"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleLoadPreview} disabled={loading} className="w-full">
            {loading ? 'Loading...' : 'Load Preview'}
          </Button>
        </CardContent>
      </Card>

      {previewHTML && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} className="gap-2" variant="outline">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button onClick={handleExportCSV} className="gap-2" variant="outline">
                <FileText className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {previewHTML ? (
        <Card>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              srcDoc={previewHTML}
              style={{ width: '100%', height: '600px', border: '1px solid #ddd', borderRadius: '4px' }}
              title="Document Preview"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Load a document to see preview and export options</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
