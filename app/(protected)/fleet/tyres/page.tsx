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
import { Edit2, Plus, History } from 'lucide-react';
import useSWR from 'swr';

interface Tyre {
  id: number;
  tyre_serial_no: string;
  brand: string;
  vehicle_id: number | null;
  vehicle_no: string | null;
  position: string;
  purchase_date: string;
  purchase_cost: number;
  status: 'in_use' | 'retreaded' | 'scrapped';
}

interface TyreEvent {
  id: number;
  event_type: 'allocation' | 'rotation' | 'retreading' | 'replacement';
  event_date: string;
  position: string;
  cost: number;
  remarks: string;
}

interface Vehicle {
  id: number;
  vehicle_no: string;
}

const STATUS_LABELS: Record<Tyre['status'], string> = {
  in_use: 'In Use',
  retreaded: 'Retreaded',
  scrapped: 'Scrapped',
};

const EVENT_TYPE_LABELS: Record<TyreEvent['event_type'], string> = {
  allocation: 'Allocation',
  rotation: 'Rotation',
  retreading: 'Retreading',
  replacement: 'Replacement',
};

const EMPTY_FORM = {
  tyre_serial_no: '',
  brand: '',
  vehicle_id: '',
  position: '',
  purchase_date: '',
  purchase_cost: '',
  status: 'in_use' as Tyre['status'],
};

const EMPTY_EVENT_FORM = {
  event_type: 'rotation' as TyreEvent['event_type'],
  event_date: '',
  vehicle_id: '',
  position: '',
  cost: '',
  remarks: '',
};

function TyreEventsDialog({ tyre, vehicles }: { tyre: Tyre; vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);

  const { data: events = [], mutate } = useSWR<TyreEvent[]>(
    open ? `/api/fleet/tyres/${tyre.id}/events` : null,
    apiClient.get
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_date) {
      toast.error('Event date is required');
      return;
    }
    try {
      await apiClient.post(`/api/fleet/tyres/${tyre.id}/events`, {
        ...form,
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        cost: Number(form.cost) || 0,
      });
      toast.success('Event added');
      setForm(EMPTY_EVENT_FORM);
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Tyre History">
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tyre History — {tyre.tyre_serial_no || `#${tyre.id}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 rounded-md border p-3">
          <div>
            <Label>Event Type</Label>
            <Select
              value={form.event_type}
              onValueChange={(value) => setForm({ ...form, event_type: value as TyreEvent['event_type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="event_date">Date</Label>
            <Input
              id="event_date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Vehicle</Label>
            <Select value={form.vehicle_id} onValueChange={(value) => setForm({ ...form, vehicle_id: value })}>
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
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="e.g. FL, FR, RL1"
            />
          </div>
          <div>
            <Label htmlFor="cost">Cost (₹)</Label>
            <Input
              id="cost"
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add Event
            </Button>
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-3">
                    No history yet
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.event_date}</TableCell>
                    <TableCell>{EVENT_TYPE_LABELS[event.event_type]}</TableCell>
                    <TableCell>{event.position}</TableCell>
                    <TableCell>₹{Number(event.cost).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TyresPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: tyres = [], mutate } = useSWR<Tyre[]>('/api/fleet/tyres', apiClient.get);
  const { data: vehicles = [] } = useSWR<Vehicle[]>('/api/masters/vehicles', apiClient.get);

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
        purchase_cost: Number(formData.purchase_cost) || 0,
      };
      try {
        if (editingId) {
          await apiClient.put(`/api/fleet/tyres/${editingId}`, payload);
          toast.success('Tyre updated');
        } else {
          await apiClient.post('/api/fleet/tyres', payload);
          toast.success('Tyre added');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save tyre');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (tyre: Tyre) => {
    setEditingId(tyre.id);
    setFormData({
      tyre_serial_no: tyre.tyre_serial_no || '',
      brand: tyre.brand || '',
      vehicle_id: tyre.vehicle_id ? String(tyre.vehicle_id) : '',
      position: tyre.position || '',
      purchase_date: tyre.purchase_date || '',
      purchase_cost: tyre.purchase_cost ? String(tyre.purchase_cost) : '',
      status: tyre.status,
    });
    setOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tyre Management</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Tyre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Tyre' : 'Add Tyre'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tyre_serial_no">Serial No</Label>
                  <Input
                    id="tyre_serial_no"
                    value={formData.tyre_serial_no}
                    onChange={(e) => setFormData({ ...formData, tyre_serial_no: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
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
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. FL, FR, RL1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_cost">Purchase Cost (₹)</Label>
                  <Input
                    id="purchase_cost"
                    type="number"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Tyre['status'] })}
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
              <TableHead>Serial No</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tyres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No tyres found
                </TableCell>
              </TableRow>
            ) : (
              tyres.map((tyre) => (
                <TableRow key={tyre.id}>
                  <TableCell className="font-medium">{tyre.tyre_serial_no || '-'}</TableCell>
                  <TableCell>{tyre.brand}</TableCell>
                  <TableCell>{tyre.vehicle_no || '-'}</TableCell>
                  <TableCell>{tyre.position}</TableCell>
                  <TableCell>{STATUS_LABELS[tyre.status]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(tyre)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <TyreEventsDialog tyre={tyre} vehicles={vehicles} />
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
