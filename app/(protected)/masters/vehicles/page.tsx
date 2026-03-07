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

interface Vehicle {
  id: number;
  vehicle_no: string;
  owner_name: string;
  vehicle_type: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    vehicle_no: '',
    owner_name: '',
    vehicle_type: '',
  });

  const { data: vehicles = [], mutate } = useSWR<Vehicle[]>(
    '/api/masters/vehicles',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      vehicle_no: '',
      owner_name: '',
      vehicle_type: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.vehicle_no.trim()) {
        toast.error('Vehicle number is required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/vehicles/${editingId}`, formData);
          toast.success('Vehicle updated successfully');
        } else {
          await apiClient.post('/api/masters/vehicles', formData);
          toast.success('Vehicle added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save vehicle');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      vehicle_no: vehicle.vehicle_no,
      owner_name: vehicle.owner_name || '',
      vehicle_type: vehicle.vehicle_type || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await apiClient.delete(`/api/masters/vehicles/${id}`);
      toast.success('Vehicle deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete vehicle');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vehicles Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vehicle_no">Vehicle Number *</Label>
                <Input
                  id="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })
                  }
                  placeholder="MH12AB1234"
                />
              </div>
              <div>
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) =>
                    setFormData({ ...formData, owner_name: e.target.value })
                  }
                  placeholder="Owner name"
                />
              </div>
              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_type: e.target.value })
                  }
                  placeholder="Truck / Trailer / Tempo"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
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
              <TableHead>Vehicle No</TableHead>
              <TableHead>Owner Name</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.vehicle_no}</TableCell>
                  <TableCell>{vehicle.owner_name}</TableCell>
                  <TableCell>{vehicle.vehicle_type}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(vehicle)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(vehicle.id)}
                      >
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
