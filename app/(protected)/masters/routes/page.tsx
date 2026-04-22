'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RouteRow {
  id: number;
  route_name: string;
  cities: string[];
  from_city: string;
  to_city: string;
  consignor_id?: number | null;
  consignee_id?: number | null;
  consignor_name?: string;
  consignee_name?: string;
}

interface City {
  id: number;
  city_name: string;
  district?: string;
}

export default function RoutesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    route_name: '',
    cities: [] as string[],
    cityInput: '',
  });

  const { data: routes = [], mutate } = useSWR<RouteRow[]>('/api/masters/routes', apiClient.get);
  const { data: cities = [] } = useSWR<City[]>('/api/masters/cities', apiClient.get);

  const resetForm = () => {
    setEditingId(null);
    setFormData({ route_name: '', cities: [], cityInput: '' });
  };

  const addCity = () => {
    const city = formData.cityInput.trim();
    if (!city) return;
    if (formData.cities.includes(city)) {
      toast.error('City already added');
      return;
    }
    setFormData((prev) => ({ ...prev, cities: [...prev.cities, city], cityInput: '' }));
  };

  const removeCity = (index: number) => {
    setFormData((prev) => ({ ...prev, cities: prev.cities.filter((_, i) => i !== index) }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.route_name.trim()) {
        toast.error('Route name is required');
        return;
      }
      if (formData.cities.length === 0) {
        toast.error('Add at least one city to the route');
        return;
      }

      try {
        const payload = {
          route_name: formData.route_name.trim(),
          cities: formData.cities,
          from_city: formData.cities[0] || '',
          to_city: formData.cities[formData.cities.length - 1] || '',
        };

        if (editingId) {
          await apiClient.put(`/api/masters/routes/${editingId}`, payload);
          toast.success('Route updated successfully');
        } else {
          await apiClient.post('/api/masters/routes', payload);
          toast.success('Route added successfully');
        }
        mutate();
        resetForm();
        setOpen(false);
      } catch {
        toast.error('Failed to save route');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (route: RouteRow) => {
    setEditingId(route.id);
    const routeCities = Array.isArray(route.cities) ? route.cities : [];
    setFormData({ route_name: route.route_name || '', cities: routeCities, cityInput: '' });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      await apiClient.delete(`/api/masters/routes/${id}`);
      toast.success('Route deleted successfully');
      mutate();
    } catch {
      toast.error('Failed to delete route');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Routes Master</h1>
        <Dialog open={open} onOpenChange={(next) => { if (!next) resetForm(); setOpen(next); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Route</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingId ? 'Edit Route' : 'Add Route'}</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="route_name">Route Name *</Label>
                <Input
                  id="route_name"
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="e.g. Marathwada"
                />
              </div>

              <div>
                <Label>Cities in this Route</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    list="route-city-options"
                    value={formData.cityInput}
                    onChange={(e) => setFormData({ ...formData, cityInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addCity(); }
                    }}
                    placeholder="Type city name and press Enter or Add"
                  />
                  <datalist id="route-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                  <Button type="button" onClick={addCity} variant="outline">Add</Button>
                </div>
                {formData.cities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.cities.map((city, idx) => (
                      <span key={idx} className="flex items-center gap-1 rounded-full border bg-slate-100 px-3 py-1 text-sm font-medium">
                        <span className="text-xs text-slate-400 mr-1">{idx + 1}.</span>
                        {city}
                        <button type="button" onClick={() => removeCity(idx)} className="ml-1 text-slate-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {formData.cities.length === 0 && (
                  <p className="mt-2 text-sm text-slate-400">No cities added yet. Type a city name and click Add.</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route Name</TableHead>
              <TableHead>Cities</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="py-4 text-center">No routes found</TableCell></TableRow>
            ) : routes.map((route) => {
              const routeCities = Array.isArray(route.cities) ? route.cities : [];
              return (
                <TableRow key={route.id}>
                  <TableCell className="font-semibold">{route.route_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {routeCities.length > 0 ? routeCities.map((city, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{city}</Badge>
                      )) : <span className="text-slate-400 text-sm">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(route)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(route.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
