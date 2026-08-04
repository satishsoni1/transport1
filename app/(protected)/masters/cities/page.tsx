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
  city_name_hi?: string;
  city_name_mr?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  distance_km?: number;
  transit_time_hours?: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function CitiesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    city_name: '',
    city_name_hi: '',
    city_name_mr: '',
    taluka: '',
    district: '',
    state: '',
    pincode: '',
    distance_km: '0',
    transit_time_hours: '0',
  });

  const { data: cities = [], mutate } = useSWR<City[]>(
    '/api/masters/cities',
    apiClient.get
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      city_name: '',
      city_name_hi: '',
      city_name_mr: '',
      taluka: '',
      district: '',
      state: '',
      pincode: '',
      distance_km: '0',
      transit_time_hours: '0',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = formData.city_name.trim();
      if (!trimmed) {
        toast.error('City name is required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/cities/${editingId}`, {
            city_name: trimmed,
            city_name_hi: formData.city_name_hi.trim(),
            city_name_mr: formData.city_name_mr.trim(),
            taluka: formData.taluka.trim(),
            district: formData.district.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            distance_km: Number(formData.distance_km) || 0,
            transit_time_hours: Number(formData.transit_time_hours) || 0,
          });
          toast.success('City updated successfully');
        } else {
          await apiClient.post('/api/masters/cities', {
            city_name: trimmed,
            city_name_hi: formData.city_name_hi.trim(),
            city_name_mr: formData.city_name_mr.trim(),
            taluka: formData.taluka.trim(),
            district: formData.district.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            distance_km: Number(formData.distance_km) || 0,
            transit_time_hours: Number(formData.transit_time_hours) || 0,
          });
          toast.success('City added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error('Failed to save city');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (city: City) => {
    setEditingId(city.id);
    setFormData({
      city_name: city.city_name || '',
      city_name_hi: city.city_name_hi || '',
      city_name_mr: city.city_name_mr || '',
      taluka: city.taluka || '',
      district: city.district || '',
      state: city.state || '',
      pincode: city.pincode || '',
      distance_km: city.distance_km !== undefined ? String(city.distance_km) : '0',
      transit_time_hours: city.transit_time_hours !== undefined ? String(city.transit_time_hours) : '0',
    });
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit City' : 'Add New City'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="city_name">City Name English *</Label>
                <Input
                  id="city_name"
                  value={formData.city_name}
                  onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                  placeholder="Enter city name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city_name_hi">City Name Hindi</Label>
                  <Input
                    id="city_name_hi"
                    value={formData.city_name_hi}
                    onChange={(e) => setFormData({ ...formData, city_name_hi: e.target.value })}
                    placeholder="Hindi city name"
                  />
                </div>
                <div>
                  <Label htmlFor="city_name_mr">City Name Marathi</Label>
                  <Input
                    id="city_name_mr"
                    value={formData.city_name_mr}
                    onChange={(e) => setFormData({ ...formData, city_name_mr: e.target.value })}
                    placeholder="Marathi city name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taluka">Taluka</Label>
                  <Input id="taluka" value={formData.taluka} onChange={(e) => setFormData({ ...formData, taluka: e.target.value })} placeholder="Taluka" />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input id="district" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} placeholder="District" />
                </div>
                <div>
                  <Label htmlFor="distance_km">Distance (KM)</Label>
                  <Input id="distance_km" type="number" value={formData.distance_km} onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="Pincode" />
                </div>
                <div>
                  <Label htmlFor="transit_time_hours">Transit Time (hrs)</Label>
                  <Input id="transit_time_hours" type="number" value={formData.transit_time_hours} onChange={(e) => setFormData({ ...formData, transit_time_hours: e.target.value })} placeholder="0" />
                </div>
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
              <TableHead>Hindi</TableHead>
              <TableHead>Marathi</TableHead>
              <TableHead>Taluka</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Dist. KM</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No cities found
                </TableCell>
              </TableRow>
            ) : (
              cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.city_name}</TableCell>
                  <TableCell>{city.city_name_hi || '-'}</TableCell>
                  <TableCell>{city.city_name_mr || '-'}</TableCell>
                  <TableCell>{city.taluka || '-'}</TableCell>
                  <TableCell>{city.district || '-'}</TableCell>
                  <TableCell>{city.distance_km ? `${city.distance_km} km` : '-'}</TableCell>
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
