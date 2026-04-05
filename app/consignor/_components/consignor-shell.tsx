'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  clearConsignorSession,
  type ConsignorSessionUser,
} from '@/app/services/consignor-session';

const NAV_ITEMS = [
  { href: '/consignor/lrs', label: 'LR Desk' },
  { href: '/consignor/invoices', label: 'Invoices' },
  { href: '/consignor/ledger', label: 'Payment Ledger' },
];

interface ConsignorShellProps {
  consignor: ConsignorSessionUser | null;
  pendingPodLabel?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ConsignorShell({
  consignor,
  pendingPodLabel,
  title,
  description,
  children,
}: ConsignorShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearConsignorSession();
    router.replace('/consignor/login');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dcfce7_0%,#f0fdf4_36%,#ffffff_100%)] px-3 py-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                Consignor Portal
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
              <p className="text-sm leading-5 text-slate-600">
                {consignor?.name || 'Consignor'}
                {pendingPodLabel ? ` | ${pendingPodLabel}` : ''} | {description}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  pathname === item.href
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
