'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Menu, PanelLeftClose, Search, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

interface SearchParty {
  name?: string;
  name_mr?: string;
  address?: string;
  city?: string;
  city_mr?: string;
  mobile?: string;
}

interface SearchLrDetails {
  lr: {
    lr_no: string;
    lr_date?: string;
    from_city?: string;
    to_city?: string;
    truck_no?: string;
    driver_mobile?: string;
    driver_name?: string;
    freight?: number;
    advance?: number;
    goods_value?: number;
    total_cases?: number;
    status?: string;
    invoice_no?: string;
    eway_no?: string;
    remarks?: string;
    pod_received?: boolean;
    pod_image_url?: string;
  };
  consignor?: SearchParty | null;
  consignee?: SearchParty | null;
  challan?: {
    challan_no?: string;
    challan_date?: string;
    eway_no?: string;
    truck_no?: string;
    driver_mobile?: string;
    driver_name?: string;
  } | null;
  invoice?: {
    invoice_no?: string;
    invoice_date?: string;
    total_amount?: number;
  } | null;
  receipt?: {
    receipt_no?: string;
    receipt_date?: string;
    cheque_no?: string;
    matched_amount?: number;
  } | null;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN');
}

function amount(value?: number | null) {
  return Number(value || 0).toFixed(2);
}

function Field({
  label,
  value,
  accent = false,
}: {
  label: string;
  value?: string | number | null;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[118px_10px_1fr] items-center gap-y-1 text-sm">
      <div className={`font-bold ${accent ? 'text-red-600' : 'text-slate-900'}`}>{label}</div>
      <div className={`${accent ? 'text-red-600' : 'text-slate-900'}`}>:</div>
      <div
        className={`min-h-10 rounded-none border border-amber-300 px-3 py-2 font-semibold ${
          accent ? 'text-red-600' : 'text-blue-700'
        } bg-yellow-50`}
      >
        {value === undefined || value === null || value === '' ? '-' : value}
      </div>
    </div>
  );
}

interface HeaderProps {
  /** When set, show control to show/hide the main sidebar (protected layout). */
  sidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({ sidebarHidden, onToggleSidebar }: HeaderProps = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SearchLrDetails | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = async () => {
    const lrNo = searchValue.trim();
    if (!lrNo) {
      toast.error('Enter LR number');
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.get<SearchLrDetails>(
        `/api/search/lr-details?lr_no=${encodeURIComponent(lrNo)}`
      );
      setDetails(data);
      setSearchOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'LR not found');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = useMemo(() => {
    const status = details?.lr?.status || '';
    if (status === 'paid') return 'Paid';
    if (status === 'tbb') return 'TBB';
    return 'To Pay';
  }, [details]);

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-1 items-center gap-3">
          {onToggleSidebar ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
              aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
              onClick={onToggleSidebar}
            >
              {sidebarHidden ? <Menu size={18} /> : <PanelLeftClose size={18} />}
            </Button>
          ) : null}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <Input
              placeholder="Search LR No..."
              className="bg-slate-50 pl-10"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
          </div>
          <Button type="button" onClick={() => void handleSearch()} disabled={loading}>
            {loading ? 'Finding...' : 'Find LR'}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User size={18} />
                {user?.firstName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto p-0 sm:max-w-7xl" showCloseButton={false}>
          <div className="border-b bg-slate-100 px-5 py-3">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-2xl font-black text-slate-900">
                L.R. Search Details
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Complete LR, challan, invoice, receipt, and POD information.
              </DialogDescription>
            </DialogHeader>
          </div>

          {details ? (
            <div className="grid gap-0 xl:grid-cols-[1.15fr_1fr]">
              <div className="border-r p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="L.R. No." value={details.lr.lr_no} />
                  <Field label="Truck No." value={details.lr.truck_no || details.challan?.truck_no} />
                  <Field label="L.R. Date" value={formatDate(details.lr.lr_date)} />
                  <Field label="Driver MobNo" value={details.lr.driver_mobile || details.challan?.driver_mobile} />
                  <Field label="L.R. From" value={details.lr.from_city} />
                  <div className="grid grid-cols-[118px_10px_1fr_auto] items-center gap-y-1 text-sm">
                    <div className="font-bold text-slate-900">Freight</div>
                    <div>:</div>
                    <div className="min-h-10 rounded-none border border-amber-300 bg-yellow-50 px-3 py-2 font-semibold text-blue-700">
                      {amount(details.lr.freight)}
                    </div>
                    <div className="pl-3 text-3xl font-black text-red-600">{statusLabel}</div>
                  </div>
                  <Field label="L.R. To" value={details.lr.to_city} />
                  <Field label="Advance" value={amount(details.lr.advance)} />
                  <Field label="Cases" value={details.lr.total_cases} />
                  <Field label="Goods Value" value={amount(details.lr.goods_value)} />
                </div>

                <div className="mt-3 space-y-2">
                  <Field label="Consignor" value={details.consignor?.name} />
                  <Field label="Consignee" value={details.consignee?.name} />
                </div>

                <div className="mt-4 grid gap-0 border md:grid-cols-2">
                  <div className="space-y-2 border-b p-4 md:border-b-0 md:border-r">
                    <Field label="Challan No" value={details.challan?.challan_no} />
                    <Field label="Ch. Date" value={formatDate(details.challan?.challan_date)} />
                    <Field label="Eway No." value={details.challan?.eway_no || details.lr.eway_no} />
                    <Field label="Truck No." value={details.challan?.truck_no || details.lr.truck_no} />
                    <Field label="Driver MobNo" value={details.challan?.driver_mobile || details.lr.driver_mobile} />
                    <Field label="Driver Name" value={details.challan?.driver_name || details.lr.driver_name} />
                  </div>
                  <div className="space-y-2 p-4">
                    <Field label="Invoice No." value={details.invoice?.invoice_no || details.lr.invoice_no} accent />
                    <Field label="Inv. Date" value={formatDate(details.invoice?.invoice_date)} accent />
                    <Field label="Inv. Total" value={amount(details.invoice?.total_amount)} accent />
                    <Field label="Receipt No." value={details.receipt?.receipt_no} />
                    <Field label="Date" value={formatDate(details.receipt?.receipt_date)} />
                    <Field label="Amount" value={amount(details.receipt?.matched_amount)} />
                    <Field label="Cheque No." value={details.receipt?.cheque_no} />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3 text-3xl font-black text-slate-900">L.R. Acknowledgement</div>
                <div className="min-h-[520px] rounded-md border bg-white p-4">
                  {details.lr.pod_image_url ? (
                    <div className="space-y-3">
                      <div className="rounded-md border bg-slate-50 p-3 text-sm">
                        <div><b>POD Status:</b> {details.lr.pod_received ? 'Received' : 'Pending'}</div>
                        <div><b>Remarks:</b> {details.lr.remarks || '-'}</div>
                      </div>
                      <img
                        src={details.lr.pod_image_url}
                        alt={`POD ${details.lr.lr_no}`}
                        className="max-h-[420px] w-full rounded-md border object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[460px] items-center justify-center rounded-md border border-dashed text-sm text-slate-500">
                      No acknowledgement / POD image available for this LR.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setSearchOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
