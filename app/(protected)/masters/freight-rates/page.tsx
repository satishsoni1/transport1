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

interface FreightRate {
  id: number;
  from_city: string;
  to_city: string;
  rate_per_kg: number;
  min_rate: number;
  vehicle_type: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface City {
  id: number;
  city_name: string;
}

export default function FreightRatesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    from_city: '',
    to_city: '',
    rate_per_kg: '',
    min_rate: '',
    vehicle_type: '',
  });

  const { data: rates = [], mutate } = useSWR<FreightRate[]>(
    '/api/masters/freight-rates',
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
        from_city: '',
        to_city: '',
        rate_per_kg: '',
        min_rate: '',
        vehicle_type: '',
      });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (
        !formData.from_city ||
        !formData.to_city ||
        !formData.rate_per_kg ||
        !formData.min_rate
      ) {
        toast.error(
          'Please fill required fields: From City, To City, Rate/KG, Min Rate'
        );
        return;
      }

      try {
        const payload = {
          from_city: formData.from_city,
          to_city: formData.to_city,
          rate_per_kg: parseFloat(formData.rate_per_kg),
          min_rate: parseFloat(formData.min_rate),
          vehicle_type: formData.vehicle_type,
        };

        if (editingId) {
          await apiClient.put(`/api/masters/freight-rates/${editingId}`, payload);
          toast.success('Freight rate updated successfully');
        } else {
          await apiClient.post('/api/masters/freight-rates', payload);
          toast.success('Freight rate added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error('Failed to save freight rate');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (rate: FreightRate) => {
    setEditingId(rate.id);
    setFormData({
      from_city: rate.from_city,
      to_city: rate.to_city,
      rate_per_kg: rate.rate_per_kg.toString(),
      min_rate: rate.min_rate.toString(),
      vehicle_type: rate.vehicle_type,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this freight rate?')) return;

    try {
      await apiClient.delete(`/api/masters/freight-rates/${id}`);
      toast.success('Freight rate deleted successfully');
      mutate();
    } catch (error) {
      toast.error('Failed to delete freight rate');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Freight Rates Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Freight Rate' : 'Add New Freight Rate'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City *</Label>
                  <Input
                    id="from_city"
                    list="freight-from-city-options"
                    value={formData.from_city}
                    onChange={(e) =>
                      setFormData({ ...formData, from_city: e.target.value })
                    }
                    placeholder="Origin city"
                  />
                  <datalist id="freight-from-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="to_city">To City *</Label>
                  <Input
                    id="to_city"
                    list="freight-to-city-options"
                    value={formData.to_city}
                    onChange={(e) =>
                      setFormData({ ...formData, to_city: e.target.value })
                    }
                    placeholder="Destination city"
                  />
                  <datalist id="freight-to-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate_per_kg">Rate Per KG *</Label>
                  <Input
                    id="rate_per_kg"
                    type="number"
                    step="0.01"
                    value={formData.rate_per_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, rate_per_kg: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="min_rate">Minimum Rate *</Label>
                  <Input
                    id="min_rate"
                    type="number"
                    step="0.01"
                    value={formData.min_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, min_rate: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehicle_type: e.target.value,
                    })
                  }
                  placeholder="E.g., Truck, Auto, Tempo"
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
              <TableHead>From City</TableHead>
              <TableHead>To City</TableHead>
              <TableHead>Rate/KG</TableHead>
              <TableHead>Min Rate</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No freight rates found
                </TableCell>
              </TableRow>
            ) : (
              rates.map((rate: FreightRate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.from_city}</TableCell>
                  <TableCell>{rate.to_city}</TableCell>
                  <TableCell>₹{rate.rate_per_kg.toFixed(2)}</TableCell>
                  <TableCell>₹{rate.min_rate.toFixed(2)}</TableCell>
                  <TableCell>{rate.vehicle_type}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(rate)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(rate.id)}
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
