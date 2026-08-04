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
import { Trash2, Plus } from 'lucide-react';
import useSWR from 'swr';

interface FuelEntry {
  id: number;
  vehicle_id: number;
  driver_id: number | null;
  vehicle_no: string;
  driver_name: string | null;
  entry_date: string;
  quantity_liters: number;
  rate_per_liter: number;
  amount: number;
  odometer_reading: number;
  fuel_station: string;
  payment_mode: string;
  mileage_kmpl: number | null;
}

interface Vehicle {
  id: number;
  vehicle_no: string;
}
interface Driver {
  id: number;
  driver_name: string;
}

const EMPTY_FORM = {
  vehicle_id: '',
  driver_id: '',
  entry_date: '',
  quantity_liters: '',
  rate_per_liter: '',
  odometer_reading: '',
  fuel_station: '',
  payment_mode: 'cash',
  remarks: '',
};

export default function FuelEntriesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: entries = [], mutate } = useSWR<FuelEntry[]>('/api/fleet/fuel', apiClient.get);
  const { data: vehicles = [] } = useSWR<Vehicle[]>('/api/masters/vehicles', apiClient.get);
  const { data: drivers = [] } = useSWR<Driver[]>('/api/masters/drivers', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setFormData(EMPTY_FORM);
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.vehicle_id || !formData.entry_date) {
        toast.error('Vehicle and date are required');
        return;
      }
      try {
        await apiClient.post('/api/fleet/fuel', {
          ...formData,
          vehicle_id: Number(formData.vehicle_id),
          driver_id: formData.driver_id ? Number(formData.driver_id) : null,
          quantity_liters: Number(formData.quantity_liters) || 0,
          rate_per_liter: Number(formData.rate_per_liter) || 0,
          odometer_reading: Number(formData.odometer_reading) || 0,
        });
        toast.success('Fuel entry added');
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save fuel entry');
      }
    },
    [formData, mutate]
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fuel entry?')) return;
    try {
      await apiClient.delete(`/api/fleet/fuel/${id}`);
      toast.success('Fuel entry deleted');
      mutate();
    } catch {
      toast.error('Failed to delete fuel entry');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fuel Management</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Fuel Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Fuel Entry</DialogTitle>
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
                  <Label htmlFor="entry_date">Date *</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
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
                  <Label htmlFor="quantity_liters">Quantity (Liters)</Label>
                  <Input
                    id="quantity_liters"
                    type="number"
                    value={formData.quantity_liters}
                    onChange={(e) => setFormData({ ...formData, quantity_liters: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rate_per_liter">Rate per Liter (₹)</Label>
                  <Input
                    id="rate_per_liter"
                    type="number"
                    value={formData.rate_per_liter}
                    onChange={(e) => setFormData({ ...formData, rate_per_liter: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuel_station">Fuel Station</Label>
                  <Input
                    id="fuel_station"
                    value={formData.fuel_station}
                    onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="card">Fuel Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <TableHead>Quantity (L)</TableHead>
              <TableHead>Amount (₹)</TableHead>
              <TableHead>Odometer</TableHead>
              <TableHead>Mileage (km/L)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No fuel entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.entry_date}</TableCell>
                  <TableCell className="font-medium">{entry.vehicle_no}</TableCell>
                  <TableCell>{entry.quantity_liters}</TableCell>
                  <TableCell>₹{Number(entry.amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{entry.odometer_reading}</TableCell>
                  <TableCell>
                    {entry.mileage_kmpl ? Number(entry.mileage_kmpl).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)}>
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
