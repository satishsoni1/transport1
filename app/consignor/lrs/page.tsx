'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Download, FileImage, Printer } from 'lucide-react';
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
  printImageDocument,
  printPodImagesBatch,
  type CompanyPrintData,
} from '@/app/services/print-service';

interface GoodsItem {
  qty: number;
  type: string;
  nature: string;
  weight_kg: number;
  rate: number;
  amount: number;
}

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
  goods_items?: GoodsItem[];
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

const freightTypeOptions = [
  { value: 'to_pay', label: 'To Pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'tbb', label: 'TBB' },
];

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function ConsignorLrsPage() {
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);
  const settingsRef = useRef<CompanyPrintData | null>(null);

  const [lrs, setLrs] = useState<ConsignorLR[]>([]);

  // Server-side filter state
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Client-side filter state
  const [filterLrStatus, setFilterLrStatus] = useState('');
  const [filterConsignee, setFilterConsignee] = useState('');

  // Batch selection
  const [lrPrintSelection, setLrPrintSelection] = useState<Set<number>>(new Set());
  const [podPrintSelection, setPodPrintSelection] = useState<Set<number>>(new Set());

  // Scroll sync
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);

  const loadLrs = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (filterStatus) params.set('status', filterStatus);
    const data = await consignorFetch<ConsignorLR[]>(
      `/api/consignor/lrs${params.toString() ? `?${params.toString()}` : ''}`
    );
    setLrs(data);
    setLrPrintSelection(new Set());
    setPodPrintSelection(new Set());
  }, [search, dateFrom, dateTo, filterStatus]);

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

  // Scroll sync
  useEffect(() => {
    const tableContainer = tableScrollRef.current;
    if (!tableContainer) return;
    const updateWidth = () => setTableWidth(tableContainer.scrollWidth);
    updateWidth();
    const tableEl = tableContainer.querySelector('table');
    if (!tableEl) return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tableEl);
    return () => observer.disconnect();
  }, [lrs]);

  const handleTopScroll = useCallback(() => {
    if (tableScrollRef.current && topScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }, []);

  const handleTableScroll = useCallback(() => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  }, []);

  const scrollTable = useCallback((dir: 'left' | 'right') => {
    tableScrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  const uniqueConsignees = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const lr of lrs) {
      if (lr.consignee_name && !seen.has(lr.consignee_name)) {
        seen.add(lr.consignee_name);
        result.push(lr.consignee_name);
      }
    }
    return result.sort();
  }, [lrs]);

  const filteredLrs = useMemo(() => {
    return lrs.filter((lr) => {
      if (filterConsignee && lr.consignee_name !== filterConsignee) return false;
      if (filterLrStatus) {
        const hasChallan = lr.challan_no && lr.challan_no !== '-';
        const delivered = lr.pod_received;
        if (filterLrStatus === 'godown' && (hasChallan || delivered)) return false;
        if (filterLrStatus === 'transit' && (!hasChallan || delivered)) return false;
        if (filterLrStatus === 'pending' && delivered) return false;
        if (filterLrStatus === 'received' && !delivered) return false;
      }
      return true;
    });
  }, [lrs, filterConsignee, filterLrStatus]);

  const listPrintablePodRows = useMemo(
    () => filteredLrs.filter((e) => e.pod_image_url?.trim()),
    [filteredLrs]
  );

  const pendingCount = useMemo(() => lrs.filter((lr) => !lr.pod_received).length, [lrs]);

  const toggleLrSelect = useCallback((id: number, checked: boolean) => {
    setLrPrintSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const togglePodSelect = useCallback((id: number, checked: boolean) => {
    setPodPrintSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const selectAllLrs = useCallback((checked: boolean) => {
    if (checked) setLrPrintSelection(new Set(filteredLrs.map((e) => e.id)));
    else setLrPrintSelection(new Set());
  }, [filteredLrs]);

  const selectAllPods = useCallback((checked: boolean) => {
    if (checked) setPodPrintSelection(new Set(listPrintablePodRows.map((e) => e.id)));
    else setPodPrintSelection(new Set());
  }, [listPrintablePodRows]);

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

  const handlePrint = useCallback((lr: ConsignorLR) => {
    const html = generateLRPrintHTML(buildPrintPayload(lr));
    printHTML(html);
  }, [buildPrintPayload]);

  const handleDownload = useCallback(async (lr: ConsignorLR) => {
    const html = generateLRPrintHTML(buildPrintPayload(lr));
    await downloadPDF(html, `LR-${lr.lr_no}`);
  }, [buildPrintPayload]);

  const printSelectedLrs = useCallback(() => {
    const selected = filteredLrs.filter((e) => lrPrintSelection.has(e.id));
    for (const lr of selected) {
      printHTML(generateLRPrintHTML(buildPrintPayload(lr)));
    }
  }, [filteredLrs, lrPrintSelection, buildPrintPayload]);

  const printSelectedPods = useCallback(() => {
    const items = filteredLrs
      .filter((e) => podPrintSelection.has(e.id) && e.pod_image_url?.trim())
      .map((e) => ({ title: `POD ${e.lr_no}`, imageUrl: e.pod_image_url! }));
    if (items.length === 0) return;
    if (items.length === 1) printImageDocument(items[0].title, items[0].imageUrl);
    else printPodImagesBatch(items);
  }, [filteredLrs, podPrintSelection]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setFilterStatus('');
    setFilterLrStatus('');
    setFilterConsignee('');
  }, []);

  const fmt = (v?: string | null) => {
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
      <Card className="py-4 shadow-sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg">List filters</CardTitle>
          <CardDescription>
            Filter by date range, consignee, payment type, LR status, or free-text search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="lr-search">Search</Label>
              <Input
                id="lr-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="LR no, invoice, consignee…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lr-from">From date</Label>
              <Input
                id="lr-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lr-to">To date</Label>
              <Input
                id="lr-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lr-lrstatus">LR Status</Label>
              <select
                id="lr-lrstatus"
                value={filterLrStatus}
                onChange={(e) => setFilterLrStatus(e.target.value)}
                className={selectClass}
              >
                <option value="">All LR Status</option>
                <option value="godown">In Godown</option>
                <option value="transit">In Transit</option>
                <option value="pending">POD Pending</option>
                <option value="received">Delivered (POD received)</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="lr-consignee">Consignee</Label>
              <select
                id="lr-consignee"
                value={filterConsignee}
                onChange={(e) => setFilterConsignee(e.target.value)}
                className={selectClass}
              >
                <option value="">All consignees</option>
                {uniqueConsignees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lr-status">Payment Type</Label>
              <select
                id="lr-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={selectClass}
              >
                <option value="">All payment types</option>
                <option value="to_pay">To Pay</option>
                <option value="paid">Paid</option>
                <option value="tbb">TBB</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button type="button" className="flex-1" onClick={() => void loadLrs()}>
                  Apply
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch print bar */}
      {filteredLrs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="lr-select-all"
              checked={filteredLrs.length > 0 && filteredLrs.every((r) => lrPrintSelection.has(r.id))}
              onCheckedChange={(v) => selectAllLrs(v === true)}
            />
            <Label htmlFor="lr-select-all" className="cursor-pointer text-sm font-medium">
              Select LRs ({filteredLrs.length})
            </Label>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={lrPrintSelection.size === 0}
            onClick={printSelectedLrs}
          >
            Print selected LRs ({lrPrintSelection.size})
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="pod-select-all"
              checked={
                listPrintablePodRows.length > 0 &&
                listPrintablePodRows.every((r) => podPrintSelection.has(r.id))
              }
              onCheckedChange={(v) => selectAllPods(v === true)}
            />
            <Label htmlFor="pod-select-all" className="cursor-pointer text-sm font-medium">
              Select PODs ({listPrintablePodRows.length} with image)
            </Label>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={podPrintSelection.size === 0}
            onClick={printSelectedPods}
          >
            Print selected PODs ({podPrintSelection.size})
          </Button>
        </div>
      )}

      {/* Scroll buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => scrollTable('left')}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Left
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => scrollTable('right')}>
          Right <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Dummy top scrollbar */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto rounded-t-lg border-x border-t bg-white [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100"
        style={{ scrollbarWidth: 'auto', scrollbarColor: '#94a3b8 #f1f5f9' }}
        onScroll={handleTopScroll}
      >
        <div style={{ width: `${tableWidth}px` }} className="h-[1px] pt-[1px]" />
      </div>

      {/* LR Table */}
      <div
        ref={tableScrollRef}
        className="overflow-x-auto rounded-b-lg border bg-white [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100 [&>div]:overflow-visible"
        style={{ scrollbarWidth: 'auto', scrollbarColor: '#94a3b8 #f1f5f9' }}
        onScroll={handleTableScroll}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">POD</TableHead>
              <TableHead className="w-10 pr-0">Print</TableHead>
              <TableHead>L.R. No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Consignee</TableHead>
              <TableHead>Ch. No</TableHead>
              <TableHead>Ch. Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Driver Mob</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Freight</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>LR Status</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLrs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="py-4 text-center text-slate-500">
                  No L.R. entries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLrs.map((lr) => {
                const hasChallan = lr.challan_no && lr.challan_no !== '-';
                const lrOpStatus = lr.pod_received
                  ? 'Delivered'
                  : hasChallan
                    ? 'In Transit'
                    : 'In Godown';
                const totalQty = (lr.goods_items || []).reduce(
                  (sum, item) => sum + (Number(item.qty) || 0),
                  0
                );
                const consigneeName = lr.consignee_name || '-';

                return (
                  <TableRow key={lr.id}>
                    <TableCell className="pr-0">
                      {lr.pod_image_url ? (
                        <Checkbox
                          checked={podPrintSelection.has(lr.id)}
                          onCheckedChange={(v) => togglePodSelect(lr.id, v === true)}
                          aria-label={`Select POD ${lr.lr_no}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-0">
                      <Checkbox
                        checked={lrPrintSelection.has(lr.id)}
                        onCheckedChange={(v) => toggleLrSelect(lr.id, v === true)}
                        aria-label={`Select LR ${lr.lr_no}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{lr.lr_no}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(lr.lr_date)}</TableCell>
                    <TableCell title={consigneeName}>
                      {consigneeName.length > 15 ? `${consigneeName.slice(0, 15)}…` : consigneeName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{lr.challan_no || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(lr.challan_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{lr.vehicle_no || '-'}</TableCell>
                    <TableCell>{lr.challan_driver_name || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{lr.challan_driver_mobile || '-'}</TableCell>
                    <TableCell>{totalQty}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      ₹{Number(lr.freight || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {freightTypeOptions.find((o) => o.value === lr.status)?.label || lr.status || '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold ${
                          lrOpStatus === 'Delivered'
                            ? 'text-emerald-600'
                            : lrOpStatus === 'In Transit'
                              ? 'text-blue-600'
                              : 'text-amber-600'
                        }`}
                      >
                        {lrOpStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lr.return_status === 'returned' ? (
                        <div className="text-xs font-semibold text-red-600">
                          Returned: {lr.return_remark || '-'}
                        </div>
                      ) : lr.remarks ? (
                        <div className="text-xs font-semibold text-red-600">{lr.remarks}</div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1" style={{ width: '130px' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => handlePrint(lr)}
                          title="Print LR"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="text-xs">Print</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDownload(lr)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!lr.pod_received || !lr.pod_image_url}
                          onClick={() =>
                            printImageDocument(`POD ${lr.lr_no}`, lr.pod_image_url || '')
                          }
                          title={
                            lr.pod_received && lr.pod_image_url
                              ? 'Print POD image'
                              : 'POD image not available'
                          }
                        >
                          <FileImage className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </ConsignorShell>
  );
}
