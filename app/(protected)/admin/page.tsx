'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type DashboardResponse = {
  transports: {
    total: number;
    active: number;
    nearExpiry: number;
    expired: number;
    recent: Array<{
      id: number;
      company_name: string;
      slug: string;
      status: string;
      subscription_plan: string;
      created_at: string;
    }>;
  };
  totals: {
    lrCount: number;
    invoicedAmount: number;
    receivedAmount: number;
    transportAdminCount: number;
  };
  topTransportsByVolume: Array<{
    id: number;
    companyName: string;
    status: string;
    lrCount: number;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.platformRole === 'super_admin';

  const { data, isLoading } = useSWR<DashboardResponse>(
    isSuperAdmin ? '/api/admin/dashboard' : null,
    apiClient.get
  );

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Control Center</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Super admin access is required to view this page.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">Loading platform overview...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Control Center</h1>
        <p className="text-sm text-slate-600">Cross-tenant overview across every transport on the platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Transports</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.transports.total}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Active</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-emerald-600">{data.transports.active}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Near Expiry</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-amber-600">{data.transports.nearExpiry}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Expired</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">{data.transports.expired}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">L.R.s (all tenants)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{data.totals.lrCount.toLocaleString('en-IN')}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Invoiced (all tenants)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(data.totals.invoicedAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Received (all tenants)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(data.totals.receivedAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Transport Admins</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{data.totals.transportAdminCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recently Onboarded</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.transports.recent.length === 0 ? (
              <p className="text-sm text-slate-500">No transports yet.</p>
            ) : (
              data.transports.recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.company_name}</p>
                    <p className="text-xs text-slate-500">{t.slug} · {t.subscription_plan}</p>
                  </div>
                  <Badge variant={t.status === 'active' ? 'secondary' : 'outline'}>{t.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Transports by L.R. Volume</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topTransportsByVolume.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              data.topTransportsByVolume.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
                  <p className="text-sm font-medium">{t.companyName}</p>
                  <p className="text-sm text-slate-600">{t.lrCount.toLocaleString('en-IN')} LRs</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
