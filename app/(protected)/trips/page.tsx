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

interface Trip {
  id: number;
  trip_no: string;
  vehicle_id: number | null;
  driver_id: number | null;
  vehicle_no: string | null;
  driver_name: string | null;
  from_city: string;
  to_city: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  total_revenue: number;
  total_expense: number;
  remarks: string;
  created_at: string;
}

interface Vehicle {
  id: number;
  vehicle_no: string;
}
interface Driver {
  id: number;
  driver_name: string;
}

const STATUS_LABELS: Record<Trip['status'], string> = {
  planned: 'Planned',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<Trip['status'], string> = {
  planned: 'bg-slate-100 text-slate-700',
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = {
  vehicle_id: '',
  driver_id: '',
  from_city: '',
  to_city: '',
  start_date: '',
  end_date: '',
  status: 'planned' as Trip['status'],
  total_revenue: '',
  total_expense: '',
  remarks: '',
};

export default function TripsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: trips = [], mutate } = useSWR<Trip[]>('/api/trips', apiClient.get);
  const { data: vehicles = [] } = useSWR<Vehicle[]>('/api/masters/vehicles', apiClient.get);
  const { data: drivers = [] } = useSWR<Driver[]>('/api/masters/drivers', apiClient.get);

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
        vehicle_id: formData.vehicle_id ? Number(formData.vehicle_id) : null,
        driver_id: formData.driver_id ? Number(formData.driver_id) : null,
        total_revenue: Number(formData.total_revenue) || 0,
        total_expense: Number(formData.total_expense) || 0,
      };

      try {
        if (editingId) {
          await apiClient.put(`/api/trips/${editingId}`, payload);
          toast.success('Trip updated successfully');
        } else {
          await apiClient.post('/api/trips', payload);
          toast.success('Trip created successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save trip');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setFormData({
      vehicle_id: trip.vehicle_id ? String(trip.vehicle_id) : '',
      driver_id: trip.driver_id ? String(trip.driver_id) : '',
      from_city: trip.from_city || '',
      to_city: trip.to_city || '',
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      status: trip.status,
      total_revenue: trip.total_revenue ? String(trip.total_revenue) : '',
      total_expense: trip.total_expense ? String(trip.total_expense) : '',
      remarks: trip.remarks || '',
    });
    setOpen(true);
  };

  const handleStatusChange = async (trip: Trip, status: Trip['status']) => {
    try {
      await apiClient.put(`/api/trips/${trip.id}`, { status });
      toast.success(`Trip marked as ${STATUS_LABELS[status]}`);
      mutate();
    } catch {
      toast.error('Failed to update trip status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    try {
      await apiClient.delete(`/api/trips/${id}`);
      toast.success('Trip deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete trip');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trip Management</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Trip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Trip' : 'Create Trip'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle</Label>
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
                  <Label>Driver</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.driver_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Trip['status'] })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_revenue">Revenue (₹)</Label>
                  <Input
                    id="total_revenue"
                    type="number"
                    value={formData.total_revenue}
                    onChange={(e) => setFormData({ ...formData, total_revenue: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="total_expense">Expense (₹)</Label>
                  <Input
                    id="total_expense"
                    type="number"
                    value={formData.total_expense}
                    onChange={(e) => setFormData({ ...formData, total_expense: e.target.value })}
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
              <TableHead>Trip No</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No trips found
                </TableCell>
              </TableRow>
            ) : (
              trips.map((trip) => {
                const profit = Number(trip.total_revenue) - Number(trip.total_expense);
                return (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.trip_no}</TableCell>
                    <TableCell>{trip.vehicle_no || '-'}</TableCell>
                    <TableCell>{trip.driver_name || '-'}</TableCell>
                    <TableCell>
                      {trip.from_city} → {trip.to_city}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={trip.status}
                        onValueChange={(value) => handleStatusChange(trip, value as Trip['status'])}
                      >
                        <SelectTrigger className={`h-7 w-32 border-0 text-xs font-medium ${STATUS_COLORS[trip.status]}`}>
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
                    <TableCell className={profit < 0 ? 'text-red-600' : 'text-emerald-700'}>
                      ₹{profit.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(trip)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(trip.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
