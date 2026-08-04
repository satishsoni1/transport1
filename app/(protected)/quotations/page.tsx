'use client';

import { useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Edit2, Trash2, Plus } from 'lucide-react';
import useSWR from 'swr';

interface Quotation {
  id: number;
  quotation_no: string;
  consignor_id: number | null;
  consignor_name: string | null;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  rate: number;
  fuel_surcharge_percent: number;
  valid_until: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  remarks: string;
}

interface Consignor {
  id: number;
  name: string;
}

const STATUS_LABELS: Record<Quotation['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const STATUS_COLORS: Record<Quotation['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

const EMPTY_FORM = {
  consignor_id: '',
  from_city: '',
  to_city: '',
  vehicle_type: '',
  rate: '',
  fuel_surcharge_percent: '',
  valid_until: '',
  status: 'draft' as Quotation['status'],
  remarks: '',
};

export default function QuotationsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: quotations = [], mutate } = useSWR<Quotation[]>('/api/quotations', apiClient.get);
  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
        ...formData,
        consignor_id: formData.consignor_id ? Number(formData.consignor_id) : null,
        rate: Number(formData.rate) || 0,
        fuel_surcharge_percent: Number(formData.fuel_surcharge_percent) || 0,
      };
      try {
        if (editingId) {
          await apiClient.put(`/api/quotations/${editingId}`, payload);
          toast.success('Quotation updated');
        } else {
          await apiClient.post('/api/quotations', payload);
          toast.success('Quotation created');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save quotation');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (quotation: Quotation) => {
    setEditingId(quotation.id);
    setFormData({
      consignor_id: quotation.consignor_id ? String(quotation.consignor_id) : '',
      from_city: quotation.from_city || '',
      to_city: quotation.to_city || '',
      vehicle_type: quotation.vehicle_type || '',
      rate: quotation.rate ? String(quotation.rate) : '',
      fuel_surcharge_percent: quotation.fuel_surcharge_percent ? String(quotation.fuel_surcharge_percent) : '',
      valid_until: quotation.valid_until || '',
      status: quotation.status,
      remarks: quotation.remarks || '',
    });
    setOpen(true);
  };

  const handleStatusChange = async (quotation: Quotation, status: Quotation['status']) => {
    try {
      await apiClient.put(`/api/quotations/${quotation.id}`, { status });
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
      mutate();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this quotation?')) return;
    try {
      await apiClient.delete(`/api/quotations/${id}`);
      toast.success('Quotation deleted');
      mutate();
    } catch {
      toast.error('Failed to delete quotation');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quotations</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Quotation' : 'Create Quotation'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Consignor</Label>
                <Select
                  value={formData.consignor_id}
                  onValueChange={(value) => setFormData({ ...formData, consignor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select consignor" />
                  </SelectTrigger>
                  <SelectContent>
                    {consignors.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City</Label>
                  <Input
                    id="from_city"
                    value={formData.from_city}
                    onChange={(e) => setFormData({ ...formData, from_city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="to_city">To City</Label>
                  <Input
                    id="to_city"
                    value={formData.to_city}
                    onChange={(e) => setFormData({ ...formData, to_city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  placeholder="Truck / Trailer / Tempo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate (₹)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fuel_surcharge_percent">Fuel Surcharge (%)</Label>
                  <Input
                    id="fuel_surcharge_percent"
                    type="number"
                    value={formData.fuel_surcharge_percent}
                    onChange={(e) => setFormData({ ...formData, fuel_surcharge_percent: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Quotation['status'] })}
                  >
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
                </div>
              </div>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation No</TableHead>
              <TableHead>Consignor</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Rate (₹)</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No quotations found
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                  <TableCell>{quotation.consignor_name || '-'}</TableCell>
                  <TableCell>
                    {quotation.from_city} → {quotation.to_city}
                  </TableCell>
                  <TableCell>₹{Number(quotation.rate).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{quotation.valid_until || '-'}</TableCell>
                  <TableCell>
                    <Select
                      value={quotation.status}
                      onValueChange={(value) => handleStatusChange(quotation, value as Quotation['status'])}
                    >
                      <SelectTrigger className={`h-7 w-28 border-0 text-xs font-medium ${STATUS_COLORS[quotation.status]}`}>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(quotation)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(quotation.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
