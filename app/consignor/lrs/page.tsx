'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConsignorShell } from '@/app/consignor/_components/consignor-shell';
import {
  clearConsignorSession,
  consignorFetch,
  getConsignorToken,
  getConsignorUser,
  type ConsignorSessionUser,
} from '@/app/services/consignor-session';
import {
  generateLRPrintHTML,
  printHTML,
  downloadPDF,
  type CompanyPrintData,
} from '@/app/services/print-service';

interface ConsignorLR {
  id: number;
  lr_no: string;
  lr_date: string;
  invoice_no?: string;
  from_city?: string;
  to_city?: string;
  delivery_address?: string;
  freight?: number;
  hamali?: number;
  lr_charge?: number;
  advance?: number;
  balance?: number;
  eway_no?: string;
  truck_no?: string;
  driver_name?: string;
  driver_mobile?: string;
  goods_items?: unknown[];
  remarks?: string;
  return_status?: 'normal' | 'returned';
  return_remark?: string;
  pod_received?: boolean;
  pod_image_url?: string;
  pod_received_at?: string;
  pod_received_by_driver_name?: string;
  status?: string;
  // consignee
  consignee_name?: string;
  consignee_name_mr?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_city_mr?: string;
  consignee_mobile?: string;
  consignee_gst?: string;
  // consignor
  consignor_name?: string;
  consignor_name_mr?: string;
  consignor_address?: string;
  consignor_city?: string;
  consignor_mobile?: string;
  consignor_gst?: string;
  consignor_lr_instructions?: string;
  // challan
  challan_no?: string;
  challan_date?: string | null;
  vehicle_no?: string;
  challan_driver_name?: string;
  challan_driver_mobile?: string;
}

export default function ConsignorLrsPage() {
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [pod, setPod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lrs, setLrs] = useState<ConsignorLR[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sessionVerified, setSessionVerified] = useState(false);
  const settingsRef = useRef<CompanyPrintData | null>(null);

  const loadLrs = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (city.trim()) params.set('city', city.trim());
    if (status) params.set('status', status);
    if (pod) params.set('pod', pod);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const data = await consignorFetch<ConsignorLR[]>(
      `/api/consignor/lrs${params.toString() ? `?${params.toString()}` : ''}`
    );
    setLrs(data);
  }, [search, city, status, pod, dateFrom, dateTo]);

  useEffect(() => {
    if (!getConsignorToken()) {
      router.replace('/consignor/login');
      return;
    }

    const saved = getConsignorUser();
    if (saved) setConsignor(saved);

    let cancelled = false;
    const init = async () => {
      try {
        const [verify, appSettings] = await Promise.all([
          consignorFetch<{ consignor: ConsignorSessionUser }>('/api/consignor-auth/verify'),
          fetch('/api/admin/settings').then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        setConsignor(verify.consignor);
        settingsRef.current = appSettings;
        setSessionVerified(true);
      } catch {
        setSessionVerified(false);
        clearConsignorSession();
        router.replace('/consignor/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (loading || !sessionVerified) return;
    void loadLrs();
  }, [loading, sessionVerified, loadLrs]);

  const pendingCount = useMemo(() => lrs.filter((item) => !item.pod_received).length, [lrs]);

  const buildPrintPayload = useCallback((lr: ConsignorLR) => {
    const settings = settingsRef.current;
    return {
      lr_no: lr.lr_no,
      lr_date: lr.lr_date,
      consignor: lr.consignor_name || '',
      consignor_name_mr: lr.consignor_name_mr || '',
      consignor_address: lr.consignor_address || '',
      consignor_city: lr.consignor_city || '',
      consignor_mobile: lr.consignor_mobile || '',
      consignor_gst: lr.consignor_gst || '',
      consignee: lr.consignee_name || '',
      consignee_name_mr: lr.consignee_name_mr || '',
      consignee_address: lr.consignee_address || '',
      consignee_city: lr.consignee_city || '',
      consignee_city_mr: lr.consignee_city_mr || '',
      consignee_mobile: lr.consignee_mobile || '',
      consignee_gst: lr.consignee_gst || '',
      delivery_address: lr.delivery_address || '',
      from_city: lr.from_city || '',
      to_city: lr.to_city || '',
      goods_items: lr.goods_items || [],
      freight: Number(lr.freight) || 0,
      hamali: Number(lr.hamali) || 0,
      lr_charge: Number(lr.lr_charge) || 0,
      advance: Number(lr.advance) || 0,
      balance: Number(lr.balance) || 0,
      invoice_no: lr.invoice_no || '',
      remarks: lr.remarks || '',
      return_remark: lr.return_remark || '',
      truck_no: lr.truck_no || '',
      driver_name: lr.driver_name || '',
      driver_mobile: lr.driver_mobile || '',
      eway_no: lr.eway_no || '',
      freight_type: (lr.status as 'to_pay' | 'paid' | 'tbb') || 'to_pay',
      format: settings?.lr_print_format || 'classic',
      company: {
        ...settings,
        lr_print_instructions:
          lr.consignor_lr_instructions || settings?.lr_print_instructions || '',
      },
    };
  }, []);

  const handlePrint = useCallback((lr: ConsignorLR, e: React.MouseEvent) => {
    e.stopPropagation();
    const html = generateLRPrintHTML(buildPrintPayload(lr));
    printHTML(html);
  }, [buildPrintPayload]);

  const handleDownload = useCallback(async (lr: ConsignorLR, e: React.MouseEvent) => {
    e.stopPropagation();
    const html = generateLRPrintHTML(buildPrintPayload(lr));
    await downloadPDF(html, `LR-${lr.lr_no}`);
  }, [buildPrintPayload]);

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
      pendingPodLabel={`Pending POD: ${pendingCount}`}
      title="LR Desk"
      description="Track your LR records, POD updates, and delivery status."
    >
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-xs text-slate-500">Total LRs</span>
          <div className="text-xl font-black text-slate-900">{lrs.length}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 shadow-sm">
          <span className="text-xs text-amber-700">POD Pending</span>
          <div className="text-xl font-black text-amber-800">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 shadow-sm">
          <span className="text-xs text-emerald-700">POD Received</span>
          <div className="text-xl font-black text-emerald-800">{lrs.length - pendingCount}</div>
        </div>
      </div>

      {/* Filters */}
      <Card className="gap-3 py-4 shadow-lg">
        <CardHeader className="space-y-1 pb-0">
          <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
          <CardDescription className="text-sm">Search by LR, invoice, city, POD status, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search LR / Invoice / Consignee" className="h-11 rounded-xl bg-white" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Filter by city" className="h-11 rounded-xl bg-white" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              <option value="">All Status</option>
              <option value="to_pay">To Pay</option>
              <option value="paid">Paid</option>
              <option value="tbb">TBB</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 rounded-xl bg-white" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 rounded-xl bg-white" />
            <select value={pod} onChange={(e) => setPod(e.target.value)} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              <option value="">All POD</option>
              <option value="pending">POD Pending</option>
              <option value="received">POD Received</option>
            </select>
            <Button type="button" className="h-11 rounded-xl" onClick={() => void loadLrs()}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* LR Table */}
      <Card className="gap-3 py-4 shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-black">LR Records</CardTitle>
          <CardDescription>Click any row to expand full details and print options.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-[480px] w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">LR No</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap hidden sm:table-cell">Date</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Consignee</th>
                  <th className="border-b px-3 py-2 text-left font-semibold text-slate-600 hidden md:table-cell">Route</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-slate-600">Freight</th>
                  <th className="border-b px-3 py-2 text-center font-semibold text-slate-600">POD</th>
                  <th className="border-b px-3 py-2 text-center font-semibold text-slate-600 hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {lrs.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No LR records found.</td></tr>
                ) : lrs.map((lr) => (
                  <>
                    <tr
                      key={lr.id}
                      className="cursor-pointer border-b hover:bg-blue-50/40 transition-colors"
                      onClick={() => setExpandedId(expandedId === lr.id ? null : lr.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{lr.lr_no}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 hidden sm:table-cell">{fmt(lr.lr_date)}</td>
                      <td className="px-3 py-2 text-slate-700">{lr.consignee_name || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 hidden md:table-cell">{lr.from_city || '-'} → {lr.to_city || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-800">{Number(lr.freight || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lr.pod_received ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {lr.pod_received ? 'Rcvd' : 'Pend'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center hidden sm:table-cell">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{lr.status || '-'}</span>
                      </td>
                    </tr>
                    {expandedId === lr.id && (
                      <tr key={`${lr.id}-detail`} className="bg-slate-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
                              <div><span className="font-semibold text-slate-600">Invoice No:</span> {lr.invoice_no || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Challan No:</span> {lr.challan_no || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Challan Date:</span> {fmt(lr.challan_date || undefined)}</div>
                              <div><span className="font-semibold text-slate-600">Vehicle:</span> {lr.vehicle_no || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Driver:</span> {lr.challan_driver_name || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Driver Mobile:</span> {lr.challan_driver_mobile || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Delivery Address:</span> {lr.delivery_address || '-'}</div>
                              <div><span className="font-semibold text-slate-600">Balance:</span> {Number(lr.balance || 0).toFixed(2)}</div>
                              <div><span className="font-semibold text-slate-600">Return Status:</span> {lr.return_status || '-'}</div>
                              {lr.return_remark && <div className="sm:col-span-2"><span className="font-semibold text-slate-600">Return Remark:</span> {lr.return_remark}</div>}
                              {lr.remarks && <div className="sm:col-span-2"><span className="font-semibold text-slate-600">Remarks:</span> {lr.remarks}</div>}
                              {lr.pod_received && (
                                <>
                                  <div><span className="font-semibold text-slate-600">POD Date:</span> {lr.pod_received_at ? new Date(lr.pod_received_at).toLocaleString('en-IN') : '-'}</div>
                                  <div><span className="font-semibold text-slate-600">Received By:</span> {lr.pod_received_by_driver_name || '-'}</div>
                                </>
                              )}
                              {lr.pod_image_url && (
                                <div className="sm:col-span-3">
                                  <a href={lr.pod_image_url} target="_blank" rel="noreferrer" className="inline-block overflow-hidden rounded-lg border">
                                    <img src={lr.pod_image_url} alt={`POD ${lr.lr_no}`} className="h-32 object-cover" />
                                  </a>
                                </div>
                              )}
                            </div>
                            {/* Print / Download buttons */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={(e) => handlePrint(lr, e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                Print LR
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={(e) => void handleDownload(lr, e)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download PDF
                              </Button>
                            </div>
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
