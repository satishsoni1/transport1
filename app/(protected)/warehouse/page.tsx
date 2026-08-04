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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface Warehouse {
  id: number;
  warehouse_name: string;
  address: string;
  city: string;
  capacity_sqft: number;
  status: 'active' | 'inactive';
}

interface WarehouseEntry {
  id: number;
  warehouse_id: number;
  warehouse_name: string;
  entry_type: 'inward' | 'outward';
  lr_no: string;
  item_description: string;
  quantity: number;
  unit: string;
  entry_date: string;
  remarks: string;
}

function WarehousesTab() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ warehouse_name: '', address: '', city: '', capacity_sqft: '' });
  const { data: warehouses = [], mutate } = useSWR<Warehouse[]>('/api/warehouses', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({ warehouse_name: '', address: '', city: '', capacity_sqft: '' });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.warehouse_name.trim()) {
        toast.error('Warehouse name is required');
        return;
      }
      try {
        const payload = { ...formData, capacity_sqft: Number(formData.capacity_sqft) || 0 };
        if (editingId) {
          await apiClient.put(`/api/warehouses/${editingId}`, payload);
          toast.success('Warehouse updated');
        } else {
          await apiClient.post('/api/warehouses', payload);
          toast.success('Warehouse added');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save warehouse');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setFormData({
      warehouse_name: warehouse.warehouse_name,
      address: warehouse.address || '',
      city: warehouse.city || '',
      capacity_sqft: warehouse.capacity_sqft ? String(warehouse.capacity_sqft) : '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this warehouse?')) return;
    try {
      await apiClient.delete(`/api/warehouses/${id}`);
      toast.success('Warehouse deleted');
      mutate();
    } catch {
      toast.error('Failed to delete warehouse');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Warehouse</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="warehouse_name">Warehouse Name *</Label>
                <Input id="warehouse_name" value={formData.warehouse_name} onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="capacity_sqft">Capacity (sqft)</Label>
                  <Input id="capacity_sqft" type="number" value={formData.capacity_sqft} onChange={(e) => setFormData({ ...formData, capacity_sqft: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
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
              <TableHead>City</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-4">No warehouses found</TableCell></TableRow>
            ) : (
              warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.warehouse_name}</TableCell>
                  <TableCell>{w.city}</TableCell>
                  <TableCell>{w.capacity_sqft ? `${w.capacity_sqft} sqft` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(w)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(w.id)}><Trash2 className="w-4 h-4" /></Button>
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

function EntriesTab() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    warehouse_id: '',
    entry_type: 'inward' as WarehouseEntry['entry_type'],
    lr_no: '',
    item_description: '',
    quantity: '',
    unit: 'pcs',
    entry_date: '',
    remarks: '',
  });
  const { data: entries = [], mutate } = useSWR<WarehouseEntry[]>('/api/warehouses/entries', apiClient.get);
  const { data: warehouses = [] } = useSWR<Warehouse[]>('/api/warehouses', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({ warehouse_id: '', entry_type: 'inward', lr_no: '', item_description: '', quantity: '', unit: 'pcs', entry_date: '', remarks: '' });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.warehouse_id || !formData.entry_date) {
        toast.error('Warehouse and entry date are required');
        return;
      }
      try {
        await apiClient.post('/api/warehouses/entries', {
          ...formData,
          warehouse_id: Number(formData.warehouse_id),
          quantity: Number(formData.quantity) || 0,
        });
        toast.success('Entry recorded');
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to record entry');
      }
    },
    [formData, mutate]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Inward / Outward Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warehouse *</Label>
                  <Select value={formData.warehouse_id} onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.warehouse_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Entry Type</Label>
                  <Select value={formData.entry_type} onValueChange={(value) => setFormData({ ...formData, entry_type: value as WarehouseEntry['entry_type'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inward">Inward</SelectItem>
                      <SelectItem value="outward">Outward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lr_no">L.R. No (optional)</Label>
                  <Input id="lr_no" value={formData.lr_no} onChange={(e) => setFormData({ ...formData, lr_no: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="entry_date">Date *</Label>
                  <Input id="entry_date" type="date" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="item_description">Item Description</Label>
                <Input id="item_description" value={formData.item_description} onChange={(e) => setFormData({ ...formData, item_description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
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
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4">No entries found</TableCell></TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.entry_date}</TableCell>
                  <TableCell className="font-medium">{entry.warehouse_name}</TableCell>
                  <TableCell className="capitalize">{entry.entry_type}</TableCell>
                  <TableCell>{entry.item_description}</TableCell>
                  <TableCell>{entry.quantity} {entry.unit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function WarehousePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Warehouse</h1>
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Inward / Outward</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="entries"><EntriesTab /></TabsContent>
        <TabsContent value="warehouses"><WarehousesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
