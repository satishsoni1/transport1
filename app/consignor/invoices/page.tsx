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
      title="Consignor Invoices"
      description="Check invoice amount, GST, remarks, and included LR lines."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-2xl font-black">
              {invoiceSummary.total.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>GST Amount</CardDescription>
            <CardTitle className="text-2xl font-black">
              {invoiceSummary.gst.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Net Invoice</CardDescription>
            <CardTitle className="text-2xl font-black">
              {invoiceSummary.net.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="gap-3 py-4 shadow-lg">
        <CardHeader className="space-y-2 pb-0">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
            <CardDescription className="mt-1 text-sm leading-5">
              Search invoice by number, date, or status.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice no / party"
              className="h-11 rounded-xl bg-white"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
            </select>
            <Button type="button" className="h-11 rounded-xl" onClick={() => void loadInvoices()}>
              Apply Filters
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-xl bg-white"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-xl bg-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {invoices.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-center text-sm text-slate-500">
              No invoice records found for this consignor.
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="gap-2 py-4 shadow-md">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-black">{invoice.invoice_no}</CardTitle>
                    <CardDescription>
                      {invoice.invoice_date
                        ? new Date(invoice.invoice_date).toLocaleDateString('en-IN')
                        : '-'}
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    {invoice.status || '-'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><b>Party:</b> {invoice.party_name || '-'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><b>Freight:</b> {Number(invoice.total_amount || 0).toFixed(2)}</div>
                  <div><b>GST:</b> {Number(invoice.gst_amount || 0).toFixed(2)}</div>
                </div>
                <div><b>Net Amount:</b> {Number(invoice.net_amount || 0).toFixed(2)}</div>
                <div><b>LR Count:</b> {(invoice.items || []).length}</div>
                {invoice.additional_charges?.length ? (
                  <div>
                    <b>Additional Charges:</b>{' '}
                    {invoice.additional_charges
                      .map((item) => item.charge_name || 'Charge')
                      .join(', ')}
                  </div>
                ) : null}
                {invoice.remarks ? <div><b>Remarks:</b> {invoice.remarks}</div> : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ConsignorShell>
  );
}
