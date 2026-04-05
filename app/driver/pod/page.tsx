'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Printer } from 'lucide-react';
import { generateLRPrintHTML, printHTML } from '@/app/services/print-service';
import { transliterateToMarathi } from '@/app/services/marathi';
import { clearDriverSession, driverFetch, getDriverToken, getDriverUser, type DriverSessionUser } from '@/app/services/driver-session';

interface DriverLR {
  id: number;
  lr_no: string;
  lr_date: string;
  invoice_no?: string;
  from_city?: string;
  to_city?: string;
  delivery_address?: string;
  pod_received?: boolean;
  pod_image_url?: string;
  remarks?: string;
  return_remark?: string;
  status?: string;
}

interface LrPrintEntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  consignee_id: number;
  from_city: string;
  to_city: string;
  delivery_address?: string;
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  invoice_no: string;
  remarks?: string;
  goods_items: any[];
  status: 'to_pay' | 'paid' | 'tbb';
}

interface PartyMaster {
  id: number;
  name: string;
  name_mr?: string;
  address?: string;
  city?: string;
  city_mr?: string;
  gst_no?: string;
  mobile?: string;
}

interface AdminSettings {
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  address?: string;
  gst_no?: string;
  logo_url?: string;
  signature_url?: string;
  transporter_qr_url?: string;
  transporter_name_font?: string;
  lr_print_format?: 'classic' | 'compact' | 'detailed';
}

function normalizeScanValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const prefixedMatch = trimmed.match(/LR\s*[:\-]\s*([A-Z0-9/_-]+)/i);
  if (prefixedMatch?.[1]) {
    return prefixedMatch[1].trim();
  }

  try {
    const parsed = new URL(trimmed);
    const lrFromParams =
      parsed.searchParams.get('lr_no') ||
      parsed.searchParams.get('lrNo') ||
      parsed.searchParams.get('lr') ||
      parsed.searchParams.get('no');
    if (lrFromParams) {
      return lrFromParams.trim();
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      return lastPart.trim();
    }
  } catch {
    // Not a URL, so keep evaluating plain scan values.
  }

  return trimmed;
}

export default function DriverPodPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [lrs, setLrs] = useState<DriverLR[]>([]);
  const [selectedLR, setSelectedLR] = useState<DriverLR | null>(null);
  const [podImageUrl, setPodImageUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  const loadLrs = useCallback(async (query = '') => {
    const data = await driverFetch<DriverLR[]>(`/api/driver/lrs?search=${encodeURIComponent(query)}`);
    setLrs(data);
    setSelectedLR((prev) => {
      if (!prev) return prev;
      return data.find((item) => item.lr_no === prev.lr_no) || null;
    });
  }, []);

  useEffect(() => {
    if (!getDriverToken()) {
      router.replace('/driver/login');
      return;
    }

    const savedDriver = getDriverUser();
    if (savedDriver) setDriver(savedDriver);

    const init = async () => {
      try {
        const verify = await driverFetch<{ driver: DriverSessionUser }>('/api/driver-auth/verify');
        setDriver(verify.driver);
        await loadLrs();
      } catch {
        clearDriverSession();
        router.replace('/driver/login');
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

  const handleSearch = async () => {
    const normalizedSearch = normalizeScanValue(search);
    setSearch(normalizedSearch);
    const data = await driverFetch<DriverLR[]>(
      `/api/driver/lrs?search=${encodeURIComponent(normalizedSearch)}`
    );
    setLrs(data);

    const exactMatch = data.find(
      (item) => item.lr_no.trim().toUpperCase() === normalizedSearch.trim().toUpperCase()
    );

    if (exactMatch) {
      handleSelect(exactMatch);
      return;
    }

    setSelectedLR((prev) => {
      if (!prev) return null;
      return data.find((item) => item.lr_no === prev.lr_no) || null;
    });

    if (normalizedSearch && data.length === 0) {
      toast.error('No LR found for this driver');
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPodImageUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSelect = (lr: DriverLR) => {
    setSelectedLR(lr);
    setSearch(lr.lr_no);
    setPodImageUrl(lr.pod_image_url || '');
    setRemarks(lr.remarks || '');
  };

  const handlePrint = useCallback(async () => {
    if (!selectedLR) {
      toast.error('Select LR first');
      return;
    }

    try {
      const [lrEntries, consignors, consignees, settings] = await Promise.all([
        fetch('/api/daily-entry/lr-entries', { cache: 'no-store' }).then((res) => res.json()),
        fetch('/api/masters/consignors', { cache: 'no-store' }).then((res) => res.json()),
        fetch('/api/masters/consignees', { cache: 'no-store' }).then((res) => res.json()),
        fetch('/api/admin/settings', { cache: 'no-store' }).then((res) => res.json()),
      ]);

      const lr = (lrEntries as LrPrintEntry[]).find((item) => item.lr_no === selectedLR.lr_no);
      if (!lr) {
        toast.error('Full LR details not found');
        return;
      }

      const consignor = (consignors as PartyMaster[]).find((item) => item.id === lr.consignor_id);
      const consignee = (consignees as PartyMaster[]).find((item) => item.id === lr.consignee_id);
      const html = generateLRPrintHTML({
        ...lr,
        consignor: consignor?.name || '',
        consignor_name_mr: consignor?.name_mr || transliterateToMarathi(consignor?.name || ''),
        consignor_address: consignor?.address || '',
        consignor_city: consignor?.city || '',
        consignor_mobile: consignor?.mobile || '',
        consignor_gst: consignor?.gst_no || '',
        consignee: consignee?.name || '',
        consignee_name_mr: consignee?.name_mr || transliterateToMarathi(consignee?.name || ''),
        consignee_address: consignee?.address || '',
        consignee_city: consignee?.city || '',
        consignee_city_mr: consignee?.city_mr || transliterateToMarathi(consignee?.city || ''),
        from_city_mr: transliterateToMarathi(lr.from_city || ''),
        to_city_mr: consignee?.city_mr || transliterateToMarathi(lr.to_city || consignee?.city || ''),
        consignee_mobile: consignee?.mobile || '',
        consignee_gst: consignee?.gst_no || '',
        freight_type: lr.status,
        format: (settings as AdminSettings)?.lr_print_format || 'classic',
        company: settings as AdminSettings,
      });

      printHTML(html);
    } catch {
      toast.error('Failed to print LR');
    }
  }, [selectedLR]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLR) {
      toast.error('Select LR first');
      return;
    }
    if (!podImageUrl) {
      toast.error('Upload signed POD image');
      return;
    }

    setSubmitting(true);
    try {
      await driverFetch('/api/driver/pod', {
        method: 'POST',
        body: JSON.stringify({
          lr_no: selectedLR.lr_no,
          pod_image_url: podImageUrl,
          remarks,
        }),
      });
      toast.success('POD uploaded and marked as received');
      await loadLrs(normalizeScanValue(search));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload POD');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearDriverSession();
    router.replace('/driver/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dbeafe_0%,#eff6ff_28%,#ffffff_100%)] px-3 py-4">
      <div className="mx-auto max-w-md space-y-3">
        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="space-y-2 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Driver POD Desk</CardTitle>
                <CardDescription className="mt-1 text-sm leading-5">
                  {driver?.driver_name || 'Driver'} | Pending POD: {pendingCount}
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              Scan LR QR into the field below or type the LR number manually.
            </div>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={(e) => setSearch(normalizeScanValue(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder="Scan QR / Enter LR No"
                className="h-11 rounded-xl bg-white"
                inputMode="search"
              />
              <Button type="button" className="h-11 rounded-xl px-4" onClick={() => void handleSearch()}>
                Find
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">Assigned LRs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lrs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                No LRs found for this driver.
              </div>
            ) : (
              lrs.map((lr) => (
                <button
                  key={lr.id}
                  type="button"
                  onClick={() => handleSelect(lr)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedLR?.id === lr.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{lr.lr_no}</div>
                    <div className={`text-xs font-semibold ${selectedLR?.id === lr.id ? 'text-slate-200' : lr.pod_received ? 'text-green-600' : 'text-amber-600'}`}>
                      {lr.pod_received ? 'POD Received' : 'Pending'}
                    </div>
                  </div>
                  <div className={`mt-1 text-sm ${selectedLR?.id === lr.id ? 'text-slate-200' : 'text-slate-600'}`}>
                    {lr.from_city || '-'} to {lr.to_city || '-'}
                  </div>
                  <div className={`mt-1 text-xs font-semibold uppercase ${selectedLR?.id === lr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    Status: {lr.status || '-'}
                  </div>
                  {lr.remarks || lr.return_remark ? (
                    <div className={`mt-1 text-xs ${selectedLR?.id === lr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      Remarks: {lr.return_remark || lr.remarks}
                    </div>
                  ) : null}
                  <div className={`mt-1 text-xs ${selectedLR?.id === lr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    Delivery: {lr.delivery_address || '-'}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">Upload Signed POD</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="selected_lr" className="text-sm font-semibold text-slate-700">
                  Selected LR
                </label>
                <Input id="selected_lr" value={selectedLR?.lr_no || ''} readOnly className="h-11 rounded-xl bg-slate-50" />
              </div>
              {selectedLR ? (
                <div className="rounded-2xl border bg-slate-50 p-3 text-sm text-slate-700">
                  <div><b>Status:</b> {selectedLR.status || '-'}</div>
                  <div><b>Route:</b> {selectedLR.from_city || '-'} to {selectedLR.to_city || '-'}</div>
                  <div><b>Remarks:</b> {selectedLR.return_remark || selectedLR.remarks || '-'}</div>
                  <div><b>POD:</b> {selectedLR.pod_received ? 'Available' : 'Pending'}</div>
                </div>
              ) : null}
              {selectedLR?.pod_image_url ? (
                <img
                  src={selectedLR.pod_image_url}
                  alt={`POD ${selectedLR.lr_no}`}
                  className="h-40 w-full rounded-2xl border object-cover"
                />
              ) : null}
              <div className="space-y-2">
                <label htmlFor="pod_file" className="text-sm font-semibold text-slate-700">
                  POD Image
                </label>
                <Input
                  id="pod_file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                  className="h-11 rounded-xl bg-white"
                />
              </div>
              {podImageUrl ? (
                <img src={podImageUrl} alt="POD preview" className="h-48 w-full rounded-2xl border object-cover" />
              ) : null}
              <div className="space-y-2">
                <label htmlFor="driver_remarks" className="text-sm font-semibold text-slate-700">
                  Remarks
                </label>
                <Textarea
                  id="driver_remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional POD notes"
                  className="rounded-2xl bg-white"
                />
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl text-base font-semibold" disabled={submitting || !selectedLR}>
                {submitting ? 'Uploading...' : 'Upload POD'}
              </Button>
              <Button type="button" variant="outline" className="h-11 w-full rounded-xl text-base font-semibold" disabled={!selectedLR} onClick={() => void handlePrint()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Selected LR
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
