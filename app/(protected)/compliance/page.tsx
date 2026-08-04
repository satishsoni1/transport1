'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

interface ComplianceItem {
  entity_type: 'vehicle' | 'driver';
  entity_id: number;
  name: string;
  doc_type: string;
  expiry_date: string;
  days_remaining: number;
}

function rowClass(daysRemaining: number) {
  if (daysRemaining < 0) return 'bg-red-50 text-red-700';
  if (daysRemaining <= 7) return 'bg-orange-50 text-orange-700';
  return 'bg-amber-50 text-amber-700';
}

function statusLabel(daysRemaining: number) {
  if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)}d ago`;
  if (daysRemaining === 0) return 'Expires today';
  return `${daysRemaining}d remaining`;
}

export default function CompliancePage() {
  const { user } = useAuth();
  const [days, setDays] = useState('30');
  const [sending, setSending] = useState(false);

  const { data: items = [] } = useSWR<ComplianceItem[]>(
    `/api/compliance?days=${days}`,
    apiClient.get
  );

  const handleSendAlert = async () => {
    setSending(true);
    try {
      const result = await apiClient.post<{ sent: boolean; message?: string }>(
        `/api/compliance/send-alert?days=${days}`,
        {}
      );
      toast.success(result.sent ? 'Alert email sent' : result.message || 'Nothing to send');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send alert email');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  const expiredCount = items.filter((item) => item.days_remaining < 0).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compliance Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vehicle documents (RC, Insurance, Fitness, Permit, PUC, Road Tax) and driver licenses
            expiring soon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="60">Next 60 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleSendAlert} disabled={sending}>
            <Mail className="w-4 h-4" />
            Email This List
          </Button>
        </div>
      </div>

      {expiredCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {expiredCount} document{expiredCount === 1 ? '' : 's'} already expired
          </span>
        </div>
      ) : null}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Nothing expiring in this window
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={`${item.entity_type}-${item.entity_id}-${item.doc_type}-${index}`}>
                  <TableCell className="capitalize">{item.entity_type}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.doc_type}</TableCell>
                  <TableCell>{item.expiry_date}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rowClass(item.days_remaining)}`}>
                      {statusLabel(item.days_remaining)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
