'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportToCSV } from '@/app/services/print-service';
import { Download } from 'lucide-react';

interface Consignor {
  id: number;
  name: string;
  city?: string;
  mobile?: string;
}

interface Invoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  consignor_id: number;
  party_name: string;
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  status: string;
}

interface ReceiptItem {
  invoice_no?: string;
  amount_received?: number;
  tds_amount?: number;
  deduction_amount?: number;
}

interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  consignor_id: number;
  party_name: string;
  total_amount: number;
  received_amount?: number;
  tds_amount?: number;
  deduction_amount?: number;
  receipt_type?: string;
  mode?: string;
  bank_name?: string;
  cheque_no?: string;
  remarks?: string;
  items: ReceiptItem[];
}

interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  to_city: string;
  invoice_no: string;
  freight: number;
  status: string;
}

export default function ConsignorLedgerPage() {
  const { user } = useAuth();
  const [selectedConsignorId, setSelectedConsignorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeView, setActiveView] = useState<'summary' | 'lr' | 'invoice' | 'receipt'>('summary');

  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: allInvoices = [] } = useSWR<Invoice[]>('/api/daily-entry/invoices', apiClient.get);
  const { data: allReceipts = [] } = useSWR<Receipt[]>('/api/daily-entry/receipts', apiClient.get);

  const lrKey = selectedConsignorId
    ? `/api/daily-entry/lr-entries?consignor_id=${selectedConsignorId}`
    : null;
  const { data: lrEntries = [] } = useSWR<LREntry[]>(lrKey, apiClient.get);

  const selectedConsignor = useMemo(
    () => consignors.find((c) => String(c.id) === selectedConsignorId),
    [consignors, selectedConsignorId]
  );

  const filteredInvoices = useMemo(() => {
    if (!selectedConsignorId) return [];
    return allInvoices.filter((inv) => {
      if (String(inv.consignor_id) !== selectedConsignorId) return false;
      if (dateFrom && new Date(inv.invoice_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(inv.invoice_date) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [allInvoices, selectedConsignorId, dateFrom, dateTo]);

  const filteredReceipts = useMemo(() => {
    if (!selectedConsignorId) return [];
    return allReceipts.filter((r) => {
      if (String(r.consignor_id) !== selectedConsignorId) return false;
      if (dateFrom && new Date(r.receipt_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.receipt_date) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [allReceipts, selectedConsignorId, dateFrom, dateTo]);

  const filteredLRs = useMemo(() => {
    if (!dateFrom && !dateTo) return lrEntries;
    return lrEntries.filter((lr) => {
      if (dateFrom && new Date(lr.lr_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(lr.lr_date) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [lrEntries, dateFrom, dateTo]);

  const receivedByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    for (const receipt of filteredReceipts) {
      for (const item of receipt.items || []) {
        const invNo = String(item.invoice_no || '').trim();
        if (!invNo) continue;
        map.set(invNo, (map.get(invNo) || 0) + (Number(item.amount_received) || 0));
      }
    }
    return map;
  }, [filteredReceipts]);

  const invoiceLedger = useMemo(() =>
    filteredInvoices.map((inv) => {
      const netAmt = Number(inv.net_amount) || 0;
      const received = receivedByInvoice.get(String(inv.invoice_no || '')) || 0;
      return { ...inv, net_amount: netAmt, received_amount: received, balance: netAmt - received };
    }),
    [filteredInvoices, receivedByInvoice]
  );

  const totalInvoiced = useMemo(() => invoiceLedger.reduce((s, i) => s + i.net_amount, 0), [invoiceLedger]);
  const totalReceived = useMemo(() => filteredReceipts.reduce((s, r) => s + (Number(r.received_amount ?? r.total_amount) || 0), 0), [filteredReceipts]);
  const totalBalance = totalInvoiced - totalReceived;
  const totalLRFreight = useMemo(() => filteredLRs.reduce((s, lr) => s + (Number(lr.freight) || 0), 0), [filteredLRs]);

  const handleExport = () => {
    if (activeView === 'invoice') {
      exportToCSV(invoiceLedger.map((inv) => ({
        'Invoice No': inv.invoice_no,
        'Date': new Date(inv.invoice_date).toLocaleDateString('en-IN'),
        'Party': inv.party_name,
        'Amount': inv.net_amount.toFixed(2),
        'Received': inv.received_amount.toFixed(2),
        'Balance': inv.balance.toFixed(2),
      })), `consignor-ledger-${selectedConsignor?.name || ''}`);
    } else if (activeView === 'lr') {
      exportToCSV(filteredLRs.map((lr) => ({
        'LR No': lr.lr_no,
        'Date': new Date(lr.lr_date).toLocaleDateString('en-IN'),
        'To City': lr.to_city,
        'Invoice No': lr.invoice_no,
        'Freight': Number(lr.freight).toFixed(2),
        'Status': lr.status,
      })), `consignor-lr-${selectedConsignor?.name || ''}`);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consignor Ledger</h1>
        {selectedConsignorId && (
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="consignor-select">Consignor *</Label>
              <select
                id="consignor-select"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={selectedConsignorId}
                onChange={(e) => setSelectedConsignorId(e.target.value)}
              >
                <option value="">— Select Consignor —</option>
                {consignors.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                Clear Dates
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedConsignorId && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-blue-600">Total LR Freight</p>
                <p className="mt-1 text-2xl font-bold text-blue-800">₹{totalLRFreight.toFixed(2)}</p>
                <p className="text-xs text-blue-500">{filteredLRs.length} LRs</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-orange-600">Total Invoiced</p>
                <p className="mt-1 text-2xl font-bold text-orange-800">₹{totalInvoiced.toFixed(2)}</p>
                <p className="text-xs text-orange-500">{filteredInvoices.length} invoices</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-green-600">Total Received</p>
                <p className="mt-1 text-2xl font-bold text-green-800">₹{totalReceived.toFixed(2)}</p>
                <p className="text-xs text-green-500">{filteredReceipts.length} receipts</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${totalBalance > 0 ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}`}>
              <CardContent className="pt-4">
                <p className={`text-xs font-medium ${totalBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Balance Due</p>
                <p className={`mt-1 text-2xl font-bold ${totalBalance > 0 ? 'text-red-800' : 'text-emerald-800'}`}>₹{totalBalance.toFixed(2)}</p>
                <p className={`text-xs ${totalBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{totalBalance > 0 ? 'Outstanding' : 'Cleared'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-2">
            {(['summary', 'lr', 'invoice', 'receipt'] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={activeView === tab ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView(tab)}
              >
                {tab === 'summary' ? 'Invoice Summary' : tab === 'lr' ? 'LR Details' : tab === 'invoice' ? 'Invoice Details' : 'Receipt Details'}
              </Button>
            ))}
          </div>

          {activeView === 'summary' && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Invoice Amt (₹)</TableHead>
                    <TableHead className="text-right">Received (₹)</TableHead>
                    <TableHead className="text-right">Balance (₹)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No invoices found for this consignor
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {invoiceLedger.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                          <TableCell>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{inv.net_amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-700">₹{inv.received_amount.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-semibold ${inv.balance > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ₹{inv.balance.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${inv.balance > 0.01 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {inv.balance > 0.01 ? 'Pending' : 'Cleared'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={2}>TOTAL</TableCell>
                        <TableCell className="text-right">₹{totalInvoiced.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-700">₹{invoiceLedger.reduce((s, i) => s + i.received_amount, 0).toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${totalBalance > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>₹{totalBalance.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeView === 'lr' && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LR No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>To City</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead className="text-right">Freight (₹)</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLRs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No LR entries found for this consignor
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredLRs.map((lr) => (
                        <TableRow key={lr.id}>
                          <TableCell className="font-medium">{lr.lr_no}</TableCell>
                          <TableCell>{new Date(lr.lr_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{lr.to_city}</TableCell>
                          <TableCell>{lr.invoice_no}</TableCell>
                          <TableCell className="text-right">₹{Number(lr.freight).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                              lr.status === 'paid' ? 'bg-green-100 text-green-800' :
                              lr.status === 'tbb' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>{lr.status === 'to_pay' ? 'To Pay' : lr.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={4}>TOTAL ({filteredLRs.length} LRs)</TableCell>
                        <TableCell className="text-right">₹{totalLRFreight.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeView === 'invoice' && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-right">GST (₹)</TableHead>
                    <TableHead className="text-right">Net (₹)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                          <TableCell>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{inv.party_name}</TableCell>
                          <TableCell className="text-right">₹{Number(inv.total_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{Number(inv.gst_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{Number(inv.net_amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize">{inv.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={5}>TOTAL</TableCell>
                        <TableCell className="text-right">₹{totalInvoiced.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeView === 'receipt' && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Received (₹)</TableHead>
                    <TableHead className="text-right">TDS (₹)</TableHead>
                    <TableHead className="text-right">Deduction (₹)</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        No receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredReceipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.receipt_no}</TableCell>
                          <TableCell>{new Date(r.receipt_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>
                            <span className="text-xs">{r.receipt_type === 'on_account' ? 'On Account' : 'Invoice'}</span>
                          </TableCell>
                          <TableCell className="capitalize">{(r.mode || '').replace('_', ' ')}</TableCell>
                          <TableCell className="text-right text-green-700 font-semibold">
                            ₹{Number(r.received_amount ?? r.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">₹{Number(r.tds_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{Number(r.deduction_amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={4}>TOTAL</TableCell>
                        <TableCell className="text-right text-green-700">₹{totalReceived.toFixed(2)}</TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {!selectedConsignorId && (
        <Card className="bg-slate-50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">Select a consignor above to view their ledger.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
