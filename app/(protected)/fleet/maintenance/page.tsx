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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Trash2, Plus } from 'lucide-react';
import useSWR from 'swr';

interface MaintenanceRecord {
  id: number;
  vehicle_id: number;
  vendor_id: number | null;
  vehicle_no: string;
  vendor_name: string | null;
  service_type: string;
  service_date: string;
  odometer_reading: number;
  cost: number;
  is_breakdown: boolean;
  next_due_date: string;
  next_due_odometer: number;
  remarks: string;
}

interface Vehicle {
  id: number;
  vehicle_no: string;
}
interface Vendor {
  id: number;
  vendor_name: string;
}

const EMPTY_FORM = {
  vehicle_id: '',
  vendor_id: '',
  service_type: '',
  service_date: '',
  odometer_reading: '',
  cost: '',
  is_breakdown: false,
  next_due_date: '',
  next_due_odometer: '',
  remarks: '',
};

function isOverdue(record: MaintenanceRecord) {
  if (record.next_due_date) {
    return new Date(record.next_due_date) < new Date(new Date().toDateString());
  }
  return false;
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: records = [], mutate } = useSWR<MaintenanceRecord[]>('/api/fleet/maintenance', apiClient.get);
  const { data: vehicles = [] } = useSWR<Vehicle[]>('/api/masters/vehicles', apiClient.get);
  const { data: vendors = [] } = useSWR<Vendor[]>('/api/masters/vendors', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setFormData(EMPTY_FORM);
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.vehicle_id || !formData.service_date) {
        toast.error('Vehicle and service date are required');
        return;
      }
      try {
        await apiClient.post('/api/fleet/maintenance', {
          ...formData,
          vehicle_id: Number(formData.vehicle_id),
          vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
          odometer_reading: Number(formData.odometer_reading) || 0,
          cost: Number(formData.cost) || 0,
          next_due_odometer: Number(formData.next_due_odometer) || 0,
        });
        toast.success('Maintenance record added');
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save record');
      }
    },
    [formData, mutate]
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this maintenance record?')) return;
    try {
      await apiClient.delete(`/api/fleet/maintenance/${id}`);
      toast.success('Record deleted');
      mutate();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workshop &amp; Preventive Maintenance</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Maintenance Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.vehicle_no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Workshop Vendor</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.vendor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="service_type">Service Type</Label>
                <Input
                  id="service_type"
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="Engine Oil / Filter / Greasing / Battery / Repair / AMC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service_date">Service Date *</Label>
                  <Input
                    id="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="odometer_reading">Odometer (km)</Label>
                  <Input
                    id="odometer_reading"
                    type="number"
                    value={formData.odometer_reading}
                    onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost">Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="is_breakdown"
                    checked={formData.is_breakdown}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_breakdown: Boolean(checked) })}
                  />
                  <Label htmlFor="is_breakdown">This was a breakdown</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="next_due_date">Next Due Date</Label>
                  <Input
                    id="next_due_date"
                    type="date"
                    value={formData.next_due_date}
                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="next_due_odometer">Next Due Odometer</Label>
                  <Input
                    id="next_due_odometer"
                    type="number"
                    value={formData.next_due_odometer}
                    onChange={(e) => setFormData({ ...formData, next_due_odometer: e.target.value })}
                  />
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
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Cost (₹)</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No maintenance records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className={isOverdue(record) ? 'bg-red-50' : undefined}>
                  <TableCell>{record.service_date}</TableCell>
                  <TableCell className="font-medium">{record.vehicle_no}</TableCell>
                  <TableCell>
                    {record.service_type}
                    {record.is_breakdown ? (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        Breakdown
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>₹{Number(record.cost).toLocaleString('en-IN')}</TableCell>
                  <TableCell className={isOverdue(record) ? 'font-medium text-red-700' : ''}>
                    {record.next_due_date || '-'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
