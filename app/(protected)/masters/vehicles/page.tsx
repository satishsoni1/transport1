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
import { Edit2, Trash2, Plus } from 'lucide-react';
import useSWR from 'swr';

interface Vehicle {
  id: number;
  vehicle_no: string;
  owner_name: string;
  vehicle_type: string;
  vendor_id: number | null;
  rc_expiry: string;
  insurance_expiry: string;
  fitness_expiry: string;
  permit_expiry: string;
  national_permit_expiry: string;
  puc_expiry: string;
  road_tax_expiry: string;
  fastag_id: string;
  gps_device_id: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Vendor {
  id: number;
  vendor_name: string;
}

const EMPTY_VEHICLE_FORM = {
  vehicle_no: '',
  owner_name: '',
  vehicle_type: '',
  vendor_id: '',
  rc_expiry: '',
  insurance_expiry: '',
  fitness_expiry: '',
  permit_expiry: '',
  national_permit_expiry: '',
  puc_expiry: '',
  road_tax_expiry: '',
  fastag_id: '',
  gps_device_id: '',
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_VEHICLE_FORM);

  const { data: vehicles = [], mutate } = useSWR<Vehicle[]>(
    '/api/masters/vehicles',
    apiClient.get
  );
  const { data: vendors = [] } = useSWR<Vendor[]>('/api/masters/vendors', apiClient.get);

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_VEHICLE_FORM);
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
      vendor_id: vehicle.vendor_id ? String(vehicle.vendor_id) : '',
      rc_expiry: vehicle.rc_expiry || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      fitness_expiry: vehicle.fitness_expiry || '',
      permit_expiry: vehicle.permit_expiry || '',
      national_permit_expiry: vehicle.national_permit_expiry || '',
      puc_expiry: vehicle.puc_expiry || '',
      road_tax_expiry: vehicle.road_tax_expiry || '',
      fastag_id: vehicle.fastag_id || '',
      gps_device_id: vehicle.gps_device_id || '',
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <Label>Vendor (Owner Account)</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={String(vendor.id)}>
                        {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fastag_id">Fastag ID</Label>
                  <Input
                    id="fastag_id"
                    value={formData.fastag_id}
                    onChange={(e) => setFormData({ ...formData, fastag_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gps_device_id">GPS Device ID</Label>
                  <Input
                    id="gps_device_id"
                    value={formData.gps_device_id}
                    onChange={(e) => setFormData({ ...formData, gps_device_id: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground pt-1">Compliance Document Expiry</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rc_expiry">RC Expiry</Label>
                  <Input
                    id="rc_expiry"
                    type="date"
                    value={formData.rc_expiry}
                    onChange={(e) => setFormData({ ...formData, rc_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                  <Input
                    id="insurance_expiry"
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fitness_expiry">Fitness Expiry</Label>
                  <Input
                    id="fitness_expiry"
                    type="date"
                    value={formData.fitness_expiry}
                    onChange={(e) => setFormData({ ...formData, fitness_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="permit_expiry">Permit Expiry</Label>
                  <Input
                    id="permit_expiry"
                    type="date"
                    value={formData.permit_expiry}
                    onChange={(e) => setFormData({ ...formData, permit_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="national_permit_expiry">National Permit Expiry</Label>
                  <Input
                    id="national_permit_expiry"
                    type="date"
                    value={formData.national_permit_expiry}
                    onChange={(e) => setFormData({ ...formData, national_permit_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="puc_expiry">PUC Expiry</Label>
                  <Input
                    id="puc_expiry"
                    type="date"
                    value={formData.puc_expiry}
                    onChange={(e) => setFormData({ ...formData, puc_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="road_tax_expiry">Road Tax Expiry</Label>
                  <Input
                    id="road_tax_expiry"
                    type="date"
                    value={formData.road_tax_expiry}
                    onChange={(e) => setFormData({ ...formData, road_tax_expiry: e.target.value })}
                  />
                </div>
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
