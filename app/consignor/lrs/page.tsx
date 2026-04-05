'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface ConsignorLR {
  id: number;
  lr_no: string;
  lr_date: string;
  invoice_no?: string;
  from_city?: string;
  to_city?: string;
  delivery_address?: string;
  freight?: number;
  balance?: number;
  remarks?: string;
  return_status?: 'normal' | 'returned';
  return_remark?: string;
  pod_received?: boolean;
  pod_image_url?: string;
  pod_received_at?: string;
  pod_received_by_driver_name?: string;
  status?: string;
  consignee_name?: string;
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

    const init = async () => {
      try {
        const verify = await consignorFetch<{ consignor: ConsignorSessionUser }>(
          '/api/consignor-auth/verify'
        );
        setConsignor(verify.consignor);
        await loadLrs();
      } catch {
        clearConsignorSession();
        router.replace('/consignor/login');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [loadLrs, router]);

  const pendingCount = useMemo(
    () => lrs.filter((item) => !item.pod_received).length,
    [lrs]
  );

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      title="Consignor LR Desk"
      description="Track your LR records, POD updates, and delivery status."
    >
      <div className="space-y-3">
        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="space-y-2 pb-0">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Filters</CardTitle>
              <CardDescription className="mt-1 text-sm leading-5">
                Search LR by number, invoice, city, POD, and date range.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search LR / Invoice / Consignee"
                className="h-11 rounded-xl bg-white"
              />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Filter by city"
                className="h-11 rounded-xl bg-white"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
              >
                <option value="">All Status</option>
                <option value="to_pay">To Pay</option>
                <option value="paid">Paid</option>
                <option value="tbb">TBB</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
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
              <select
                value={pod}
                onChange={(e) => setPod(e.target.value)}
                className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
              >
                <option value="">All POD</option>
                <option value="pending">POD Pending</option>
                <option value="received">POD Received</option>
              </select>
              <Button type="button" className="h-11 rounded-xl" onClick={() => void loadLrs()}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lrs.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="p-6 text-center text-sm text-slate-500">
                No LR records found for this consignor.
              </CardContent>
            </Card>
          ) : (
            lrs.map((lr) => (
              <Card key={lr.id} className="gap-2 py-4 shadow-md">
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-black">{lr.lr_no}</CardTitle>
                      <CardDescription>
                        {lr.lr_date ? new Date(lr.lr_date).toLocaleDateString('en-IN') : '-'}
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        lr.pod_received
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {lr.pod_received ? 'POD Received' : 'POD Pending'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><b>Invoice:</b> {lr.invoice_no || '-'}</div>
                  <div><b>Route:</b> {lr.from_city || '-'} to {lr.to_city || '-'}</div>
                  <div><b>Consignee:</b> {lr.consignee_name || '-'}</div>
                  <div><b>Delivery:</b> {lr.delivery_address || '-'}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><b>Freight:</b> {Number(lr.freight || 0).toFixed(2)}</div>
                    <div><b>Balance:</b> {Number(lr.balance || 0).toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><b>Status:</b> {lr.status || '-'}</div>
                    <div><b>Return:</b> {lr.return_status || '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><b>POD Date:</b> {formatDateTime(lr.pod_received_at)}</div>
                    <div><b>Received By:</b> {lr.pod_received_by_driver_name || '-'}</div>
                  </div>
                  {lr.return_remark ? <div><b>Return Remark:</b> {lr.return_remark}</div> : null}
                  {lr.remarks ? <div><b>Remarks:</b> {lr.remarks}</div> : null}
                  {lr.pod_image_url ? (
                    <a
                      href={lr.pod_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border bg-slate-50"
                    >
                      <img
                        src={lr.pod_image_url}
                        alt={`POD ${lr.lr_no}`}
                        className="h-40 w-full object-cover"
                      />
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ConsignorShell>
  );
}
