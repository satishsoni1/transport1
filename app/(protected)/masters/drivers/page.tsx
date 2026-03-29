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

interface Driver {
  id: number;
  driver_name: string;
  mobile: string;
  license_no: string;
  address: string;
  vehicle_no: string;
  license_valid_from: string;
  license_valid_to: string;
  renewal_date: string;
  passport_photo_url: string;
  thumb_image_url: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function DriversPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    driver_name: '',
    mobile: '',
    license_no: '',
    address: '',
    vehicle_no: '',
    license_valid_from: '',
    license_valid_to: '',
    renewal_date: '',
    passport_photo_url: '',
    thumb_image_url: '',
    status: 'active' as 'active' | 'inactive',
  });

  const { data: drivers = [], mutate } = useSWR<Driver[]>(
    '/api/masters/drivers',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      driver_name: '',
      mobile: '',
      license_no: '',
      address: '',
      vehicle_no: '',
      license_valid_from: '',
      license_valid_to: '',
      renewal_date: '',
      passport_photo_url: '',
      thumb_image_url: '',
      status: 'active',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.driver_name.trim()) {
        toast.error('Driver name is required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/drivers/${editingId}`, formData);
          toast.success('Driver updated successfully');
        } else {
          await apiClient.post('/api/masters/drivers', formData);
          toast.success('Driver added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save driver');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setFormData({
      driver_name: driver.driver_name,
      mobile: driver.mobile || '',
      license_no: driver.license_no || '',
      address: driver.address || '',
      vehicle_no: driver.vehicle_no || '',
      license_valid_from: driver.license_valid_from || '',
      license_valid_to: driver.license_valid_to || '',
      renewal_date: driver.renewal_date || '',
      passport_photo_url: driver.passport_photo_url || '',
      thumb_image_url: driver.thumb_image_url || '',
      status: driver.status || 'active',
    });
    setOpen(true);
  };

  const handleFileUpload = useCallback(
    (field: 'passport_photo_url' | 'thumb_image_url', file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, [field]: String(reader.result || '') }));
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      await apiClient.delete(`/api/masters/drivers/${id}`);
      toast.success('Driver deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete driver');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Drivers Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driver_name">Driver Name *</Label>
                <Input
                  id="driver_name"
                  value={formData.driver_name}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="license_no">License No</Label>
                <Input
                  id="license_no"
                  value={formData.license_no}
                  onChange={(e) =>
                    setFormData({ ...formData, license_no: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="vehicle_no">Vehicle No</Label>
                <Input
                  id="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="license_valid_from">Valid From</Label>
                <Input
                  id="license_valid_from"
                  type="date"
                  value={formData.license_valid_from}
                  onChange={(e) =>
                    setFormData({ ...formData, license_valid_from: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="license_valid_to">Valid To</Label>
                <Input
                  id="license_valid_to"
                  type="date"
                  value={formData.license_valid_to}
                  onChange={(e) =>
                    setFormData({ ...formData, license_valid_to: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="renewal_date">Renewal Date</Label>
                <Input
                  id="renewal_date"
                  type="date"
                  value={formData.renewal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, renewal_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label htmlFor="passport_photo_url">Passport Photo</Label>
                <Input
                  id="passport_photo_url"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileUpload('passport_photo_url', e.target.files?.[0] || null)
                  }
                />
                {formData.passport_photo_url ? (
                  <img src={formData.passport_photo_url} alt="Passport" className="mt-2 h-20 w-16 rounded border object-cover" />
                ) : null}
              </div>
              <div>
                <Label htmlFor="thumb_image_url">Thumb</Label>
                <Input
                  id="thumb_image_url"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileUpload('thumb_image_url', e.target.files?.[0] || null)
                  }
                />
                {formData.thumb_image_url ? (
                  <img src={formData.thumb_image_url} alt="Thumb" className="mt-2 h-20 w-16 rounded border object-cover" />
                ) : null}
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
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
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Valid To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.driver_name}</TableCell>
                  <TableCell>{driver.mobile}</TableCell>
                  <TableCell>{driver.license_no}</TableCell>
                  <TableCell>{driver.vehicle_no || '-'}</TableCell>
                  <TableCell>{driver.license_valid_to || '-'}</TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {driver.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(driver)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(driver.id)}
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
