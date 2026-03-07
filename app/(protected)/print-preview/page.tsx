'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Printer, Download, FileText } from 'lucide-react';
import {
  generateLRPrintHTML,
  generateInvoicePrintHTML,
  printHTML,
  downloadPDF,
  exportToCSV,
} from '@/app/services/print-service';

type DocumentType = 'lr' | 'invoice' | 'challan' | 'bill';

export default function PrintPreviewPage() {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState<DocumentType>('lr');
  const [documentNo, setDocumentNo] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoadPreview = useCallback(async () => {
    if (!documentNo.trim()) {
      toast.error('Please enter document number');
      return;
    }

    setLoading(true);
    try {
      // Mock data - in production, would fetch from API
      let html = '';

      if (documentType === 'lr') {
        const mockData = {
          lr_no: documentNo,
          lr_date: new Date().toISOString(),
          consignor: 'RALLIS INDIA LIMITED',
          consignee: 'MAA SANTOSHI KRUSHI SEVA KENDRA',
          from_city: 'AKOLA',
          to_city: 'JAIPUR',
          goods_items: [
            {
              description: 'Pesticides',
              qty: 145,
              type: 'BOX',
              weight_kg: 5,
              rate: 10,
              amount: 1450,
            },
          ],
          freight: 500,
          hamali: 100,
          lr_charge: 0,
          advance: 200,
          balance: 300,
          truck_no: 'MH04BG1610',
          driver_name: 'PRATAP SINGH THAKUR',
          driver_mobile: '7517974410',
          invoice_no: 'INV-001',
          remarks: 'Delivery at JAIPUR',
        };
        html = generateLRPrintHTML(mockData);
      } else if (documentType === 'invoice') {
        const mockData = {
          invoice_no: documentNo,
          invoice_date: new Date().toISOString(),
          party_name: 'SAI RAM AGRITECH PVT LTD AKOLA',
          items: [
            {
              description: 'Freight Services',
              qty: 1,
              rate: 4740,
              amount: 4740,
            },
          ],
          total_amount: 4740,
          gst_amount: 853.2,
          net_amount: 5593.2,
          gst_percentage: 18,
        };
        html = generateInvoicePrintHTML(mockData);
      }

      if (html) {
        setPreviewHTML(html);
        toast.success('Document preview loaded');
      }
    } catch (error) {
      toast.error('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  }, [documentType, documentNo]);

  const handlePrint = useCallback(() => {
    if (!previewHTML) {
      toast.error('Please load a document first');
      return;
    }
    printHTML(previewHTML);
  }, [previewHTML]);

  const handleDownloadPDF = useCallback(async () => {
    if (!previewHTML) {
      toast.error('Please load a document first');
      return;
    }
    try {
      await downloadPDF(previewHTML, `${documentType}-${documentNo}`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  }, [previewHTML, documentType, documentNo]);

  const handleExportCSV = useCallback(() => {
    const mockData = [
      {
        lr_no: documentNo,
        date: new Date().toLocaleDateString(),
        consignor: 'RALLIS INDIA LIMITED',
        freight: 500,
      },
    ];
    exportToCSV(mockData, `${documentType}-${documentNo}`);
    toast.success('CSV exported successfully');
  }, [documentType, documentNo]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Print & Export</h1>
      </div>

      {/* Document Selection */}
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
                placeholder={
                  documentType === 'lr'
                    ? 'e.g., LR-001'
                    : documentType === 'invoice'
                    ? 'e.g., INV-001'
                    : 'Enter document number'
                }
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleLoadPreview}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Loading...' : 'Load Preview'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {previewHTML && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handlePrint}
                className="gap-2"
                variant="default"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                className="gap-2"
                variant="outline"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewHTML && (
        <Card>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              srcDoc={previewHTML}
              style={{
                width: '100%',
                height: '600px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              title="Document Preview"
            />
          </CardContent>
        </Card>
      )}

      {!previewHTML && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Load a document to see preview and export options</p>
          </CardContent>
        </Card>
      )}

      {/* Export Formats Info */}
      <Card>
        <CardHeader>
          <CardTitle>Available Export Formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-1">PDF Export</h4>
            <p className="text-sm text-gray-600">
              Download document as PDF with professional formatting and print-ready layout
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">CSV Export</h4>
            <p className="text-sm text-gray-600">
              Export data in CSV format for use in Excel or other spreadsheet applications
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Print</h4>
            <p className="text-sm text-gray-600">
              Print document directly or save as PDF using your browser's print dialog
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
