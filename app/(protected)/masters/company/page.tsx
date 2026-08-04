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

interface Branch {
  id: number;
  branch_name: string;
  address: string;
  city: string;
  status: 'active' | 'inactive';
}

interface CostCenter {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

function BranchesTab() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ branch_name: '', address: '', city: '' });
  const { data: branches = [], mutate } = useSWR<Branch[]>('/api/masters/branches', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({ branch_name: '', address: '', city: '' });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.branch_name.trim()) {
        toast.error('Branch name is required');
        return;
      }
      try {
        if (editingId) {
          await apiClient.put(`/api/masters/branches/${editingId}`, formData);
          toast.success('Branch updated');
        } else {
          await apiClient.post('/api/masters/branches', formData);
          toast.success('Branch added');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save branch');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setFormData({ branch_name: branch.branch_name, address: branch.address || '', city: branch.city || '' });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this branch?')) return;
    try {
      await apiClient.delete(`/api/masters/branches/${id}`);
      toast.success('Branch deleted');
      mutate();
    } catch {
      toast.error('Failed to delete branch');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="branch_name">Branch Name *</Label>
                <Input id="branch_name" value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
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
              <TableHead>Branch Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-4">No branches found</TableCell></TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.branch_name}</TableCell>
                  <TableCell>{branch.city}</TableCell>
                  <TableCell>{branch.address}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(branch)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(branch.id)}><Trash2 className="w-4 h-4" /></Button>
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

function CostCentersTab() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { data: costCenters = [], mutate } = useSWR<CostCenter[]>('/api/masters/cost-centers', apiClient.get);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({ name: '', description: '' });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        toast.error('Name is required');
        return;
      }
      try {
        if (editingId) {
          await apiClient.put(`/api/masters/cost-centers/${editingId}`, formData);
          toast.success('Cost center updated');
        } else {
          await apiClient.post('/api/masters/cost-centers', formData);
          toast.success('Cost center added');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save cost center');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (cc: CostCenter) => {
    setEditingId(cc.id);
    setFormData({ name: cc.name, description: cc.description || '' });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this cost center?')) return;
    try {
      await apiClient.delete(`/api/masters/cost-centers/${id}`);
      toast.success('Cost center deleted');
      mutate();
    } catch {
      toast.error('Failed to delete cost center');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Cost Center
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Cost Center' : 'Add Cost Center'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCenters.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-4">No cost centers found</TableCell></TableRow>
            ) : (
              costCenters.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell className="font-medium">{cc.name}</TableCell>
                  <TableCell>{cc.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(cc)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(cc.id)}><Trash2 className="w-4 h-4" /></Button>
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

export default function CompanyStructurePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Company Structure</h1>
      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
        </TabsList>
        <TabsContent value="branches"><BranchesTab /></TabsContent>
        <TabsContent value="cost-centers"><CostCentersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
