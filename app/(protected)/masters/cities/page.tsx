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

interface City {
  id: number;
  city_name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function CitiesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cityName, setCityName] = useState('');

  const { data: cities = [], mutate } = useSWR<City[]>(
    '/api/masters/cities',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setCityName('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = cityName.trim();
      if (!trimmed) {
        toast.error('City name is required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/cities/${editingId}`, {
            city_name: trimmed,
          });
          toast.success('City updated successfully');
        } else {
          await apiClient.post('/api/masters/cities', { city_name: trimmed });
          toast.success('City added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error('Failed to save city');
      }
    },
    [editingId, cityName, mutate]
  );

  const handleEdit = (city: City) => {
    setEditingId(city.id);
    setCityName(city.city_name);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
      await apiClient.delete(`/api/masters/cities/${id}`);
      toast.success('City deleted successfully');
      mutate();
    } catch (error) {
      toast.error('Failed to delete city');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cities Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit City' : 'Add New City'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="city_name">City Name *</Label>
                <Input
                  id="city_name"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Enter city name"
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
              <TableHead>City Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-4">
                  No cities found
                </TableCell>
              </TableRow>
            ) : (
              cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.city_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(city)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(city.id)}
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
