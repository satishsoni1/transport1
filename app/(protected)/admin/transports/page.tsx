'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, ChevronDown, ChevronRight, KeyRound, Eye, EyeOff } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';

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
  admin_user_id?: number;
  admin_email?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  subscription?: {
    status: 'active' | 'near_expiry' | 'expired';
    daysRemaining: number | null;
  };
};

type UserRow = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  platform_role: string;
  status: string;
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

function ResetPasswordDialog({
  transportId,
  user,
  onDone,
}: {
  transportId: number;
  user: UserRow;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/api/admin/transports/${transportId}/users`, {
        user_id: user.id,
        new_password: password,
      });
      toast.success(`Password reset for ${user.email}`);
      setPassword('');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <KeyRound className="h-3 w-3" />
          Reset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{user.email}</p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPw((p) => !p)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Reset Password'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransportUsersRow({ transport }: { transport: TransportRow }) {
  const [expanded, setExpanded] = useState(false);
  const { data: users = [], mutate } = useSWR<UserRow[]>(
    expanded ? `/api/admin/transports/${transport.id}/users` : null,
    apiClient.get
  );

  const subStatus = transport.subscription?.status;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400 inline mr-1" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 inline mr-1" />
          )}
          <span className="font-medium">{transport.company_name}</span>
          <div className="ml-5 text-xs text-slate-500">{transport.slug}</div>
        </TableCell>
        <TableCell>
          <div className="font-mono text-sm">{transport.admin_email || '-'}</div>
          <div className="text-xs text-slate-500">
            {[transport.admin_first_name, transport.admin_last_name].filter(Boolean).join(' ')}
          </div>
        </TableCell>
        <TableCell>{transport.contact_phone || '-'}</TableCell>
        <TableCell>{transport.subscription_plan}</TableCell>
        <TableCell>
          <div className="text-xs">
            {transport.subscription_start_date || '-'} → {transport.subscription_end_date || 'no expiry'}
          </div>
          <div className="text-xs text-slate-500">
            {transport.subscription?.daysRemaining === null
              ? 'No expiry set'
              : `${transport.subscription?.daysRemaining ?? '-'} day(s)`}
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant={
              subStatus === 'expired' ? 'destructive' :
              subStatus === 'near_expiry' ? 'outline' :
              'secondary'
            }
            className={
              subStatus === 'active' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
              subStatus === 'near_expiry' ? 'border-amber-300 text-amber-700 bg-amber-50' : ''
            }
          >
            {subStatus || transport.status}
          </Badge>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-slate-50 p-0">
            <div className="px-6 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Login Accounts — {transport.company_name}
              </p>
              {users.length === 0 ? (
                <p className="text-sm text-slate-500">No users found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-1 pr-4 font-medium">Email</th>
                      <th className="pb-1 pr-4 font-medium">Username</th>
                      <th className="pb-1 pr-4 font-medium">Name</th>
                      <th className="pb-1 pr-4 font-medium">Role</th>
                      <th className="pb-1 pr-4 font-medium">Status</th>
                      <th className="pb-1 font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-200">
                        <td className="py-1.5 pr-4 font-mono text-xs">{u.email}</td>
                        <td className="py-1.5 pr-4 font-mono text-xs">{u.username || '-'}</td>
                        <td className="py-1.5 pr-4">
                          {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className="text-xs">
                            {u.platform_role === 'transport_admin' ? (
                              <span className="font-semibold text-blue-700">Admin</span>
                            ) : u.role}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className={u.status === 'active' ? 'text-emerald-600 text-xs' : 'text-red-500 text-xs'}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-1.5">
                          <ResetPasswordDialog
                            transportId={transport.id}
                            user={u}
                            onDone={mutate}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

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
            Click any row to expand login accounts. Use Reset to change passwords.
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
                  type="text"
                  placeholder="Set initial password"
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transport</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Loading transport accounts...</TableCell>
                </TableRow>
              ) : transports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No transport accounts found.</TableCell>
                </TableRow>
              ) : (
                transports.map((item) => (
                  <TransportUsersRow key={item.id} transport={item} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
