'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

interface AppUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function SettingsUsersPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'Operator',
  });

  const { data: users = [], mutate } = useSWR<AppUser[]>(
    '/api/settings/users',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({ email: '', first_name: '', last_name: '', role: 'Operator' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.email || !formData.first_name || !formData.last_name || !formData.role) {
        toast.error('Please fill all required fields');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/settings/users/${editingId}`, formData);
          toast.success('User updated successfully');
        } else {
          await apiClient.post('/api/settings/users', formData);
          toast.success('User created successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch {
        toast.error('Failed to save user');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (item: AppUser) => {
    setEditingId(item.id);
    setFormData({
      email: item.email,
      first_name: item.first_name,
      last_name: item.last_name,
      role: item.role,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient.delete(`/api/settings/users/${id}`);
      toast.success('User deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings - Users</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.first_name} {item.last_name}
                  </TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.role}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
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
