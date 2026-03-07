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

interface Driver {
  id: number;
  driver_name: string;
  mobile: string;
  license_no: string;
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
  });

  const { data: drivers = [], mutate } = useSWR<Driver[]>(
    '/api/masters/drivers',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({ driver_name: '', mobile: '', license_no: '' });
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
    });
    setOpen(true);
  };

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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.driver_name}</TableCell>
                  <TableCell>{driver.mobile}</TableCell>
                  <TableCell>{driver.license_no}</TableCell>
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
