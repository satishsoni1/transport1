'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/app/services/api-client';
import { useAuth } from '@/app/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  user_name: string;
  created_at: string;
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    from: '',
    to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.action) params.set('action', appliedFilters.action);
    if (appliedFilters.entity_type) params.set('entity_type', appliedFilters.entity_type);
    if (appliedFilters.from) params.set('from', appliedFilters.from);
    if (appliedFilters.to) params.set('to', appliedFilters.to);
    params.set('limit', '500');
    return `/api/admin/audit-log?${params.toString()}`;
  }, [appliedFilters]);

  const { data: logs = [], mutate, isLoading } = useSWR<AuditLog[]>(query, apiClient.get);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <Button variant="outline" onClick={() => mutate()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-5 gap-4">
          <div>
            <Label htmlFor="action">Action</Label>
            <Input
              id="action"
              placeholder="CREATE / UPDATE / DELETE"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="entity_type">Entity</Label>
            <Input
              id="entity_type"
              placeholder="e.g. invoice"
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button className="flex-1" onClick={() => setAppliedFilters(filters)}>
              Apply
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const reset = { action: '', entity_type: '', from: '', to: '' };
                setFilters(reset);
                setAppliedFilters(reset);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell>{log.entity_id || '-'}</TableCell>
                  <TableCell>{log.user_name || '-'}</TableCell>
                  <TableCell>{log.details || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
