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
  tds_amount?: number;
  deduction_amount?: number;
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
  tds_amount?: number;
  deduction_amount?: number;
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

interface LedgerRow {
  date: string;
  particulars: string;
  invoice_amt: number;
  received_amt: number;
  tds_amt: number;
  deduct_amt: number;
  remarks: string;
  balance: number;
  type: 'invoice' | 'receipt';
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

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const invoiceRows: LedgerRow[] = ledger.invoices.map((inv) => ({
      date: inv.invoice_date,
      particulars: `Invoice ${inv.invoice_no}`,
      invoice_amt: Number(inv.net_amount) || 0,
      received_amt: 0,
      tds_amt: 0,
      deduct_amt: 0,
      remarks: '',
      balance: 0,
      type: 'invoice',
    }));

    const receiptRows: LedgerRow[] = ledger.receipts.map((receipt) => ({
      date: receipt.receipt_date,
      particulars: `Receipt ${receipt.receipt_no}`,
      invoice_amt: 0,
      received_amt: Number(receipt.total_amount) || 0,
      tds_amt: Number(receipt.tds_amount) || 0,
      deduct_amt: Number(receipt.deduction_amount) || 0,
      remarks: receipt.remarks || '',
      balance: 0,
      type: 'receipt',
    }));

    const combined = [...invoiceRows, ...receiptRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    return combined.map((row) => {
      runningBalance += row.invoice_amt - row.received_amt - row.tds_amt - row.deduct_amt;
      return { ...row, balance: runningBalance };
    });
  }, [ledger.invoices, ledger.receipts]);

  const totals = useMemo(() => ({
    invoice_amt: ledgerRows.reduce((s, r) => s + r.invoice_amt, 0),
    received_amt: ledgerRows.reduce((s, r) => s + r.received_amt, 0),
    tds_amt: ledgerRows.reduce((s, r) => s + r.tds_amt, 0),
    deduct_amt: ledgerRows.reduce((s, r) => s + r.deduct_amt, 0),
    closing_balance: ledgerRows.at(-1)?.balance ?? 0,
  }), [ledgerRows]);

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
      description="Invoice amount, received payment, TDS, deductions, and pending balance."
    >
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-2xl font-black">{Number(ledger.summary.total_invoiced || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Total Received</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700">{Number(ledger.summary.total_received || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>TDS + Deduction</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-700">{(totals.tds_amt + totals.deduct_amt).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-md">
          <CardHeader className="pb-0">
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-black text-amber-700">{Number(ledger.summary.total_balance || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="gap-3 py-4 shadow-lg">
        <CardHeader className="space-y-2 pb-0">
          <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
          <CardDescription className="text-sm">Search by invoice or receipt and narrow by date or balance status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice / receipt" className="h-11 rounded-xl bg-white" />
            <select value={balance} onChange={(e) => setBalance(e.target.value)} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              <option value="">All Balance</option>
              <option value="pending">Pending Balance</option>
              <option value="cleared">Fully Cleared</option>
            </select>
            <Button type="button" className="h-11 rounded-xl" onClick={() => void loadLedger()}>Apply Filters</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 rounded-xl bg-white" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 rounded-xl bg-white" />
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card className="gap-3 py-4 shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-black">Consignor Account Ledger</CardTitle>
          <CardDescription>Balance = Total Invoice − (Received + TDS + Deduction)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Particular</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-red-700">Invoice Amt</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-green-700">Received Amt</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-blue-700">TDS</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-orange-700">Deduct</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Remarks</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-slate-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">No ledger records found.</td>
                  </tr>
                ) : ledgerRows.map((row, index) => (
                  <tr key={`${row.particulars}-${index}`} className={`border-b ${row.type === 'invoice' ? 'bg-red-50/40' : 'bg-green-50/40'} hover:bg-blue-50/30`}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.particulars}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-600">
                      {row.invoice_amt ? row.invoice_amt.toFixed(2) : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">
                      {row.received_amt ? row.received_amt.toFixed(2) : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-blue-600">
                      {row.tds_amt ? row.tds_amt.toFixed(2) : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-orange-600">
                      {row.deduct_amt ? row.deduct_amt.toFixed(2) : ''}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{row.remarks || '-'}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-bold ${row.balance > 0 ? 'text-red-700' : row.balance < 0 ? 'text-green-700' : 'text-slate-500'}`}>
                      {Math.abs(row.balance).toFixed(2)}{' '}
                      <span className="text-xs">{row.balance > 0 ? 'Dr' : row.balance < 0 ? 'Cr' : ''}</span>
                    </td>
                  </tr>
                ))}
                {ledgerRows.length > 0 && (
                  <tr className="border-t-2 bg-slate-100 font-bold">
                    <td colSpan={2} className="px-3 py-2 text-slate-700">Closing Balance</td>
                    <td className="px-3 py-2 text-right text-red-700">{totals.invoice_amt.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{totals.received_amt.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{totals.tds_amt.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">{totals.deduct_amt.toFixed(2)}</td>
                    <td className="px-3 py-2"></td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right ${totals.closing_balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {Math.abs(totals.closing_balance).toFixed(2)}{' '}
                      <span className="text-xs">{totals.closing_balance > 0 ? 'Dr' : totals.closing_balance < 0 ? 'Cr' : ''}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ConsignorShell>
  );
}
