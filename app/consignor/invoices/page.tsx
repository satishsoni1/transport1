'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConsignorShell } from '@/app/consignor/_components/consignor-shell';
import {
  consignorFetch,
  getConsignorToken,
  getConsignorUser,
  clearConsignorSession,
  type ConsignorSessionUser,
} from '@/app/services/consignor-session';

interface InvoiceItem {
  description?: string;
  lr_no?: string;
  qty?: number;
  amount?: number;
}

interface AdditionalCharge {
  charge_name?: string;
  remark?: string;
  amount?: number;
}

interface ConsignorInvoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  gst_percentage?: number;
  remarks?: string;
  items: InvoiceItem[];
  additional_charges?: AdditionalCharge[];
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  status?: string;
}

interface LrSummaryResponse {
  pod_received?: boolean;
}

export default function ConsignorInvoicesPage() {
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [invoices, setInvoices] = useState<ConsignorInvoice[]>([]);
  const [pendingPodCount, setPendingPodCount] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadInvoices = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const data = await consignorFetch<ConsignorInvoice[]>(
      `/api/consignor/invoices${params.toString() ? `?${params.toString()}` : ''}`
    );
    setInvoices(data);
  }, [search, status, dateFrom, dateTo]);

  useEffect(() => {
    if (!getConsignorToken()) {
      router.replace('/consignor/login');
      return;
    }

    const saved = getConsignorUser();
    if (saved) setConsignor(saved);

    const init = async () => {
      try {
        const [verify, lrRows] = await Promise.all([
          consignorFetch<{ consignor: ConsignorSessionUser }>('/api/consignor-auth/verify'),
          consignorFetch<LrSummaryResponse[]>('/api/consignor/lrs'),
        ]);
        setConsignor(verify.consignor);
        setPendingPodCount(lrRows.filter((item) => !item.pod_received).length);
        await loadInvoices();
      } catch {
        clearConsignorSession();
        router.replace('/consignor/login');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [loadInvoices, router]);

  const invoiceSummary = useMemo(
    () =>
      invoices.reduce(
        (acc, item) => {
          acc.total += Number(item.total_amount) || 0;
          acc.gst += Number(item.gst_amount) || 0;
          acc.net += Number(item.net_amount) || 0;
          return acc;
        },
        { total: 0, gst: 0, net: 0 }
      ),
    [invoices]
  );

  const fmt = (v?: string) => {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <ConsignorShell
      consignor={consignor}
      pendingPodLabel={`Pending POD: ${pendingPodCount}`}
      title="Invoices"
      description="Check invoice amount, GST, remarks, and included LR lines."
    >
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Freight</CardDescription>
            <CardTitle className="text-2xl font-black">{invoiceSummary.total.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>GST Amount</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-700">{invoiceSummary.gst.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Net Invoice</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700">{invoiceSummary.net.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="gap-3 py-4 shadow-lg">
        <CardHeader className="space-y-1 pb-0">
          <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
          <CardDescription className="text-sm">Search invoice by number, date, or status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice no / party" className="h-11 rounded-xl bg-white" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
            </select>
            <Button type="button" className="h-11 rounded-xl" onClick={() => void loadInvoices()}>Apply Filters</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 rounded-xl bg-white" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 rounded-xl bg-white" />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="gap-3 py-4 shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-black">Invoice Records</CardTitle>
          <CardDescription>Click any row to expand LR details and additional charges.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Invoice No</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Party</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-slate-600">Freight</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-blue-700">GST</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-emerald-700">Net Amt</th>
                  <th className="border-b px-3 py-2 text-center font-semibold text-slate-600">LRs</th>
                  <th className="border-b px-3 py-2 text-center font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No invoice records found.</td></tr>
                ) : invoices.map((inv) => (
                  <>
                    <tr
                      key={inv.id}
                      className="cursor-pointer border-b hover:bg-blue-50/40 transition-colors"
                      onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{inv.invoice_no}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmt(inv.invoice_date)}</td>
                      <td className="px-3 py-2 text-slate-700">{inv.party_name || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-slate-800">{Number(inv.total_amount || 0).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-blue-700">{Number(inv.gst_amount || 0).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-emerald-700">{Number(inv.net_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{(inv.items || []).length}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{inv.status || '-'}</span>
                      </td>
                    </tr>
                    {expandedId === inv.id && (
                      <tr key={`${inv.id}-detail`} className="bg-slate-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-3 text-sm">
                            {inv.remarks && <div><span className="font-semibold text-slate-600">Remarks:</span> {inv.remarks}</div>}
                            {(inv.items || []).length > 0 && (
                              <div>
                                <div className="mb-1 font-semibold text-slate-700">LR Lines</div>
                                <div className="overflow-x-auto rounded border">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-slate-200">
                                      <tr>
                                        <th className="px-2 py-1 text-left">LR No</th>
                                        <th className="px-2 py-1 text-left">Description</th>
                                        <th className="px-2 py-1 text-right">Qty</th>
                                        <th className="px-2 py-1 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inv.items.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                          <td className="px-2 py-1">{item.lr_no || '-'}</td>
                                          <td className="px-2 py-1">{item.description || '-'}</td>
                                          <td className="px-2 py-1 text-right">{item.qty ?? '-'}</td>
                                          <td className="px-2 py-1 text-right">{Number(item.amount || 0).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {(inv.additional_charges || []).length > 0 && (
                              <div>
                                <div className="mb-1 font-semibold text-slate-700">Additional Charges</div>
                                <div className="overflow-x-auto rounded border">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-slate-200">
                                      <tr>
                                        <th className="px-2 py-1 text-left">Charge</th>
                                        <th className="px-2 py-1 text-left">Remark</th>
                                        <th className="px-2 py-1 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(inv.additional_charges || []).map((ch, idx) => (
                                        <tr key={idx} className="border-t">
                                          <td className="px-2 py-1">{ch.charge_name || '-'}</td>
                                          <td className="px-2 py-1">{ch.remark || '-'}</td>
                                          <td className="px-2 py-1 text-right">{Number(ch.amount || 0).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ConsignorShell>
  );
}
