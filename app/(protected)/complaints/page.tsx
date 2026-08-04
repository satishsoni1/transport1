'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import useSWR from 'swr';

interface Complaint {
  id: number;
  consignor_name: string | null;
  lr_no: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution_remarks: string;
  created_at: string;
}

const STATUS_LABELS: Record<Complaint['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_COLORS: Record<Complaint['status'], string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};

function ResolveDialog({ complaint, onResolved }: { complaint: Complaint; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Complaint['status']>(complaint.status);
  const [remarks, setRemarks] = useState(complaint.resolution_remarks || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/complaints/${complaint.id}`, { status, resolution_remarks: remarks });
      toast.success('Complaint updated');
      onResolved();
      setOpen(false);
    } catch {
      toast.error('Failed to update complaint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <MessageSquare className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve Complaint — {complaint.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{complaint.description}</p>
          <Select value={status} onValueChange={(value) => setStatus(value as Complaint['status'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Resolution remarks (visible to the consignor)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { data: complaints = [], mutate } = useSWR<Complaint[]>('/api/complaints', apiClient.get);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Complaints</h1>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consignor</TableHead>
              <TableHead>L.R. No</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No complaints found
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell>{complaint.consignor_name || '-'}</TableCell>
                  <TableCell>{complaint.lr_no || '-'}</TableCell>
                  <TableCell className="max-w-sm">{complaint.subject}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[complaint.status]}`}>
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ResolveDialog complaint={complaint} onResolved={() => mutate()} />
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
