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

interface GoodsNature {
  id: number;
  nature_name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function GoodsNaturesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nature_name: '',
    description: '',
  });

  const { data: goodsNatures = [], mutate } = useSWR<GoodsNature[]>(
    '/api/masters/goods-natures',
    apiClient.get
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({
        nature_name: '',
        description: '',
      });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.nature_name) {
        toast.error('Please enter nature name');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/goods-natures/${editingId}`, formData);
          toast.success('Goods nature updated successfully');
        } else {
          await apiClient.post('/api/masters/goods-natures', formData);
          toast.success('Goods nature added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save goods nature');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (nature: GoodsNature) => {
    setEditingId(nature.id);
    setFormData({
      nature_name: nature.nature_name,
      description: nature.description,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this goods nature?')) return;

    try {
      await apiClient.delete(`/api/masters/goods-natures/${id}`);
      toast.success('Goods nature deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete goods nature');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Goods Nature Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Nature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Goods Nature' : 'Add New Goods Nature'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nature_name">Nature Name *</Label>
                <Input
                  id="nature_name"
                  value={formData.nature_name}
                  onChange={(e) =>
                    setFormData({ ...formData, nature_name: e.target.value })
                  }
                  placeholder="E.g., Loose, Packed, Fragile"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description"
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
              <TableHead>Nature Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goodsNatures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No goods natures found
                </TableCell>
              </TableRow>
            ) : (
              goodsNatures.map((nature) => (
                <TableRow key={nature.id}>
                  <TableCell className="font-medium">{nature.nature_name}</TableCell>
                  <TableCell>{nature.description}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        nature.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {nature.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(nature)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(nature.id)}
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
