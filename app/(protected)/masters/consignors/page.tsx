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

interface Consignor {
  id: number;
  name: string;
  address: string;
  city: string;
  gst_no: string;
  contact_person: string;
  mobile: string;
  bank_name?: string;
  account_no?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface City {
  id: number;
  city_name: string;
}

export default function ConsignorsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    gst_no: '',
    contact_person: '',
    mobile: '',
    bank_name: '',
    account_no: '',
  });

  const { data: consignors = [], mutate } = useSWR(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: cities = [] } = useSWR<City[]>(
    '/api/masters/cities',
    apiClient.get
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        gst_no: '',
        contact_person: '',
        mobile: '',
        bank_name: '',
        account_no: '',
      });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name || !formData.address || !formData.city) {
        toast.error('Please fill required fields: Name, Address, City');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/consignors/${editingId}`, formData);
          toast.success('Consignor updated successfully');
        } else {
          await apiClient.post('/api/masters/consignors', formData);
          toast.success('Consignor added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error('Failed to save consignor');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (consignor: Consignor) => {
    setEditingId(consignor.id);
    setFormData({
      name: consignor.name,
      address: consignor.address,
      city: consignor.city,
      gst_no: consignor.gst_no,
      contact_person: consignor.contact_person,
      mobile: consignor.mobile,
      bank_name: consignor.bank_name || '',
      account_no: consignor.account_no || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this consignor?')) return;

    try {
      await apiClient.delete(`/api/masters/consignors/${id}`);
      toast.success('Consignor deleted successfully');
      mutate();
    } catch (error) {
      toast.error('Failed to delete consignor');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consignors Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Consignor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Consignor' : 'Add New Consignor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Consignor name"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    list="consignor-city-options"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                  />
                  <datalist id="consignor-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst">GST Number</Label>
                  <Input
                    id="gst"
                    value={formData.gst_no}
                    onChange={(e) =>
                      setFormData({ ...formData, gst_no: e.target.value })
                    }
                    placeholder="GST No."
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input
                    id="contact"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_person: e.target.value,
                      })
                    }
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <Label htmlFor="bank">Bank Name</Label>
                  <Input
                    id="bank"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="Bank name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="account">Account Number</Label>
                <Input
                  id="account"
                  value={formData.account_no}
                  onChange={(e) =>
                    setFormData({ ...formData, account_no: e.target.value })
                  }
                  placeholder="Account number"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update' : 'Save'}
                </Button>
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
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>GST No.</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consignors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No consignors found
                </TableCell>
              </TableRow>
            ) : (
              consignors.map((consignor: Consignor) => (
                <TableRow key={consignor.id}>
                  <TableCell className="font-medium">{consignor.name}</TableCell>
                  <TableCell>{consignor.city}</TableCell>
                  <TableCell>{consignor.address}</TableCell>
                  <TableCell>{consignor.gst_no}</TableCell>
                  <TableCell>{consignor.contact_person}</TableCell>
                  <TableCell>{consignor.mobile}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(consignor)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(consignor.id)}
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
