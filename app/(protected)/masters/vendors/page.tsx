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

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_type: 'owner' | 'broker' | 'fuel' | 'workshop' | 'toll';
  contact_person: string;
  mobile: string;
  email: string;
  address: string;
  gst_no: string;
  bank_name: string;
  account_no: string;
  username?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const VENDOR_TYPE_LABELS: Record<Vendor['vendor_type'], string> = {
  owner: 'Vehicle Owner',
  broker: 'Broker',
  fuel: 'Fuel Vendor',
  workshop: 'Workshop Vendor',
  toll: 'Toll Vendor',
};

const EMPTY_FORM = {
  vendor_name: '',
  vendor_type: 'owner' as Vendor['vendor_type'],
  contact_person: '',
  mobile: '',
  email: '',
  address: '',
  gst_no: '',
  bank_name: '',
  account_no: '',
  username: '',
  password: '',
};

export default function VendorsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: vendors = [], mutate } = useSWR<Vendor[]>('/api/masters/vendors', apiClient.get);

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
      if (!formData.vendor_name.trim()) {
        toast.error('Vendor name is required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/vendors/${editingId}`, formData);
          toast.success('Vendor updated successfully');
        } else {
          await apiClient.post('/api/masters/vendors', formData);
          toast.success('Vendor added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save vendor');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setFormData({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      contact_person: vendor.contact_person || '',
      mobile: vendor.mobile || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gst_no: vendor.gst_no || '',
      bank_name: vendor.bank_name || '',
      account_no: vendor.account_no || '',
      username: vendor.username || '',
      password: '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await apiClient.delete(`/api/masters/vendors/${id}`);
      toast.success('Vendor deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete vendor');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vendors Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_name">Vendor Name *</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="vendor_type">Vendor Type</Label>
                  <Select
                    value={formData.vendor_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vendor_type: value as Vendor['vendor_type'] })
                    }
                  >
                    <SelectTrigger id="vendor_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VENDOR_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gst_no">GST No</Label>
                  <Input
                    id="gst_no"
                    value={formData.gst_no}
                    onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="account_no">Account No</Label>
                  <Input
                    id="account_no"
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground pt-1">Vendor Portal Login (optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingId ? 'Leave blank to keep current' : ''}
                  />
                </div>
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
              <TableHead>Vendor Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>GST No</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell>{VENDOR_TYPE_LABELS[vendor.vendor_type]}</TableCell>
                  <TableCell>{vendor.contact_person}</TableCell>
                  <TableCell>{vendor.mobile}</TableCell>
                  <TableCell>{vendor.gst_no}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(vendor)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(vendor.id)}>
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
