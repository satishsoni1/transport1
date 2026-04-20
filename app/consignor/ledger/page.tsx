'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const ledgerRows = useMemo(() => {
    const rows = [
      ...ledger.invoices.map((invoice) => ({
        date: invoice.invoice_date,
        particulars: `Invoice ${invoice.invoice_no}`,
        debit: Number(invoice.net_amount) || 0,
        credit: 0,
      })),
      ...ledger.receipts.map((receipt) => ({
        date: receipt.receipt_date,
        particulars: `Receipt ${receipt.receipt_no}`,
        debit: 0,
        credit: Number(receipt.total_amount) || 0,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balanceAmount = 0;
    return rows.map((row) => {
      balanceAmount += row.debit - row.credit;
      return { ...row, balance: balanceAmount };
    });
  }, [ledger.invoices, ledger.receipts]);

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

      <Card className="gap-3 py-4 shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-black">Account Ledger</CardTitle>
          <CardDescription>Debit (invoice billed) · Credit (payment received) · Running balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Particulars</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-red-700">Debit (Dr)</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-green-700">Credit (Cr)</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-slate-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-yellow-50">
                  <td className="px-3 py-2 text-xs text-slate-500">—</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">Opening Balance</td>
                  <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                  <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-slate-600">0.00</td>
                </tr>
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No ledger records found.
                    </td>
                  </tr>
                ) : ledgerRows.map((row, index) => (
                  <tr key={`${row.particulars}-${index}`} className="border-b odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/30">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.particulars}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-600">
                      {row.debit ? row.debit.toFixed(2) : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">
                      {row.credit ? row.credit.toFixed(2) : ''}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-bold ${row.balance > 0 ? 'text-red-700' : row.balance < 0 ? 'text-green-700' : 'text-slate-500'}`}>
                      {Math.abs(row.balance).toFixed(2)}{' '}
                      <span className="text-xs font-semibold">
                        {row.balance > 0 ? 'Dr' : row.balance < 0 ? 'Cr' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
                {ledgerRows.length > 0 ? (
                  <tr className="border-t-2 bg-slate-100 font-bold">
                    <td colSpan={2} className="px-3 py-2 text-slate-700">Closing Balance</td>
                    <td className="px-3 py-2 text-right text-red-700">
                      {ledgerRows.reduce((s, r) => s + r.debit, 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">
                      {ledgerRows.reduce((s, r) => s + r.credit, 0).toFixed(2)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right ${(ledgerRows.at(-1)?.balance ?? 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {Math.abs(ledgerRows.at(-1)?.balance ?? 0).toFixed(2)}{' '}
                      <span className="text-xs">{(ledgerRows.at(-1)?.balance ?? 0) > 0 ? 'Dr' : (ledgerRows.at(-1)?.balance ?? 0) < 0 ? 'Cr' : ''}</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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
