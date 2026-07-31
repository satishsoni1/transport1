'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';

import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CrossTenantUser = {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  platformRole: string;
  status: string;
  transportId: number | null;
  transportName: string | null;
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.platformRole === 'super_admin';
  const [transportFilter, setTransportFilter] = useState<string>('all');

  const { data, isLoading } = useSWR<{ success: boolean; users: CrossTenantUser[] }>(
    isSuperAdmin ? '/api/admin/users' : null,
    apiClient.get
  );

  const users = data?.users || [];

  const transportOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of users) {
      if (u.transportId && u.transportName) map.set(u.transportId, u.transportName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (transportFilter === 'all') return users;
    return users.filter((u) => String(u.transportId) === transportFilter);
  }, [users, transportFilter]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users — All Tenants</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Super admin access is required to view users across tenants.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users — All Tenants</h1>
          <p className="text-sm text-slate-600">
            Every login account across every transport. To reset a password, use the Transports page.
          </p>
        </div>

        <Select value={transportFilter} onValueChange={setTransportFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by transport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transports</SelectItem>
            {transportOptions.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transport</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading users...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No users found.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.transportName || '—'}</TableCell>
                    <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(' ')}</TableCell>
                    <TableCell className="font-mono text-xs">{u.email}</TableCell>
                    <TableCell>
                      {u.platformRole === 'super_admin' ? (
                        <Badge className="bg-indigo-600">Super Admin</Badge>
                      ) : u.platformRole === 'transport_admin' && u.role === 'Transport Admin' ? (
                        <Badge className="bg-blue-600">Transport Admin</Badge>
                      ) : (
                        <span className="text-sm">{u.role}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={u.status === 'active' ? 'text-emerald-600 text-xs' : 'text-red-500 text-xs'}>
                        {u.status}
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
