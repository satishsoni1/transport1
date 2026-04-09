'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TransportRow = {
  id: number;
  company_name: string;
  slug: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  subscription_plan: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_warning_days: number;
  admin_email?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  subscription?: {
    status: 'active' | 'near_expiry' | 'expired';
    daysRemaining: number | null;
  };
};

const EMPTY_FORM = {
  company_name: '',
  admin_email: '',
  admin_password: '',
  admin_first_name: '',
  admin_last_name: '',
  contact_phone: '',
  subscription_plan: 'standard',
  subscription_start_date: '',
  subscription_end_date: '',
  subscription_warning_days: '7',
};

export default function AdminTransportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.platformRole === 'super_admin' || user?.role === 'Super Admin';
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: transports = [], mutate, isLoading } = useSWR<TransportRow[]>(
    isSuperAdmin ? '/api/admin/transports' : null,
    apiClient.get
  );

  const summary = useMemo(() => {
    return transports.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.subscription?.status === 'expired') acc.expired += 1;
        if (item.subscription?.status === 'near_expiry') acc.nearExpiry += 1;
        return acc;
      },
      { total: 0, nearExpiry: 0, expired: 0 }
    );
  }, [transports]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transport Accounts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Super admin access is required to manage transport accounts.
        </CardContent>
      </Card>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/admin/transports', {
        ...formData,
        subscription_warning_days: Number(formData.subscription_warning_days) || 7,
      });
      toast.success('Transport account created');
      setFormData(EMPTY_FORM);
      setOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transport');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transport Accounts</h1>
          <p className="text-sm text-slate-600">
            Create transport logins and monitor subscription status.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Transport Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Transport Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="admin_email">Admin Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, admin_email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin_password">Admin Password</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, admin_password: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin_first_name">Admin First Name</Label>
                <Input
                  id="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, admin_first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin_last_name">Admin Last Name</Label>
                <Input
                  id="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, admin_last_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subscription_plan">Plan</Label>
                <Input
                  id="subscription_plan"
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_plan: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="subscription_warning_days">Warning Days</Label>
                <Input
                  id="subscription_warning_days"
                  type="number"
                  value={formData.subscription_warning_days}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_warning_days: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="subscription_start_date">Subscription Start</Label>
                <Input
                  id="subscription_start_date"
                  type="date"
                  value={formData.subscription_start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="subscription_end_date">Subscription End</Label>
                <Input
                  id="subscription_end_date"
                  type="date"
                  value={formData.subscription_end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_end_date: e.target.value }))}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Transport</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Near Expiry</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-amber-600">{summary.nearExpiry}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expired</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">{summary.expired}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transport Logins</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transport</TableHead>
                <TableHead>Admin Login</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading transport accounts...</TableCell>
                </TableRow>
              ) : transports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No transport accounts found.</TableCell>
                </TableRow>
              ) : (
                transports.map((item) => (
                  <TableRow key={`${item.id}-${item.admin_email || 'admin'}`}>
                    <TableCell>
                      <div className="font-medium">{item.company_name}</div>
                      <div className="text-xs text-slate-500">{item.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div>{item.admin_email || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {[item.admin_first_name, item.admin_last_name].filter(Boolean).join(' ')}
                      </div>
                    </TableCell>
                    <TableCell>{item.subscription_plan}</TableCell>
                    <TableCell>
                      <div>{item.subscription_start_date || '-'} to {item.subscription_end_date || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {item.subscription?.daysRemaining === null
                          ? 'No expiry set'
                          : `${item.subscription.daysRemaining} day(s) remaining`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          item.subscription?.status === 'expired'
                            ? 'font-semibold text-red-600'
                            : item.subscription?.status === 'near_expiry'
                              ? 'font-semibold text-amber-600'
                              : 'font-semibold text-emerald-600'
                        }
                      >
                        {item.subscription?.status || item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
