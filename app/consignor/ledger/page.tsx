'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConsignorShell } from '@/app/consignor/_components/consignor-shell';
import {
  clearConsignorSession,
  consignorFetch,
  getConsignorToken,
  getConsignorUser,
  type ConsignorSessionUser,
} from '@/app/services/consignor-session';

interface LedgerInvoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  net_amount: number;
  received_amount: number;
  balance_amount: number;
  status?: string;
}

interface LedgerReceiptItem {
  invoice_no?: string;
  amount_received?: number;
}

interface LedgerReceipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  mode?: string;
  bank_name?: string;
  cheque_no?: string;
  remarks?: string;
  total_amount: number;
  status?: string;
  items: LedgerReceiptItem[];
}

interface LedgerResponse {
  summary: {
    total_invoiced: number;
    total_received: number;
    total_balance: number;
  };
  invoices: LedgerInvoice[];
  receipts: LedgerReceipt[];
}

interface LrSummaryResponse {
  pod_received?: boolean;
}

export default function ConsignorLedgerPage() {
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [balance, setBalance] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingPodCount, setPendingPodCount] = useState(0);
  const [ledger, setLedger] = useState<LedgerResponse>({
    summary: { total_invoiced: 0, total_received: 0, total_balance: 0 },
    invoices: [],
    receipts: [],
  });

  const loadLedger = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (balance) params.set('balance', balance);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const data = await consignorFetch<LedgerResponse>(
      `/api/consignor/ledger${params.toString() ? `?${params.toString()}` : ''}`
    );
    setLedger(data);
  }, [search, balance, dateFrom, dateTo]);

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
        await loadLedger();
      } catch {
        clearConsignorSession();
        router.replace('/consignor/login');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [loadLedger, router]);

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
      title="Payment Ledger"
      description="Check invoice amount, received payment, and pending balance."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-2xl font-black">
              {Number(ledger.summary.total_invoiced || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Received</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700">
              {Number(ledger.summary.total_received || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-black text-amber-700">
              {Number(ledger.summary.total_balance || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="gap-3 py-4 shadow-lg">
        <CardHeader className="space-y-2 pb-0">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
            <CardDescription className="mt-1 text-sm leading-5">
              Search by invoice or receipt and narrow by date or balance status.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice / receipt"
              className="h-11 rounded-xl bg-white"
            />
            <select
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
            >
              <option value="">All Balance</option>
              <option value="pending">Pending Balance</option>
              <option value="cleared">Fully Cleared</option>
            </select>
            <Button type="button" className="h-11 rounded-xl" onClick={() => void loadLedger()}>
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

      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <Card className="gap-3 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-black">Invoice Balance</CardTitle>
            <CardDescription>
              Billed amount against received payment invoice-wise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ledger.invoices.length === 0 ? (
              <div className="text-sm text-slate-500">No invoice ledger records found.</div>
            ) : (
              ledger.invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-black text-slate-900">{invoice.invoice_no}</div>
                      <div className="text-xs text-slate-500">
                        {invoice.invoice_date
                          ? new Date(invoice.invoice_date).toLocaleDateString('en-IN')
                          : '-'}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                      {invoice.status || '-'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div><b>Invoice:</b> {Number(invoice.net_amount || 0).toFixed(2)}</div>
                    <div><b>Received:</b> {Number(invoice.received_amount || 0).toFixed(2)}</div>
                    <div><b>Balance:</b> {Number(invoice.balance_amount || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-black">Receipts</CardTitle>
            <CardDescription>
              Payment receipts received from this consignor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ledger.receipts.length === 0 ? (
              <div className="text-sm text-slate-500">No payment receipts found.</div>
            ) : (
              ledger.receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border bg-slate-50 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-black text-slate-900">{receipt.receipt_no}</div>
                      <div className="text-xs text-slate-500">
                        {receipt.receipt_date
                          ? new Date(receipt.receipt_date).toLocaleDateString('en-IN')
                          : '-'}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {receipt.mode || '-'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <b>Total Received:</b> {Number(receipt.total_amount || 0).toFixed(2)}
                  </div>
                  {receipt.items?.length ? (
                    <div className="mt-2 text-xs text-slate-600">
                      {receipt.items
                        .map(
                          (item) =>
                            `${item.invoice_no || '-'}: ${Number(item.amount_received || 0).toFixed(2)}`
                        )
                        .join(' | ')}
                    </div>
                  ) : null}
                  {receipt.remarks ? <div className="mt-2"><b>Remarks:</b> {receipt.remarks}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ConsignorShell>
  );
}
