'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RouteRow {
  id: number;
  route_name: string;
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
  distance_km?: number;
}

interface Party {
  id: number;
  name: string;
}

export default function RoutesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    route_name: '',
    from_city: '',
    to_city: '',
    consignor_id: '',
    consignee_id: '',
  });

  const { data: routes = [], mutate } = useSWR<RouteRow[]>('/api/masters/routes', apiClient.get);
  const { data: cities = [] } = useSWR<City[]>('/api/masters/cities', apiClient.get);
  const { data: consignors = [] } = useSWR<Party[]>('/api/masters/consignors', apiClient.get);
  const { data: consignees = [] } = useSWR<Party[]>('/api/masters/consignees', apiClient.get);

  const resetForm = () => {
    setEditingId(null);
    setFormData({ route_name: '', from_city: '', to_city: '', consignor_id: '', consignee_id: '' });
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.from_city || !formData.to_city) {
        toast.error('From city and to city are required');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/routes/${editingId}`, formData);
          toast.success('Route updated successfully');
        } else {
          await apiClient.post('/api/masters/routes', formData);
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
    setFormData({
      route_name: route.route_name || '',
      from_city: route.from_city || '',
      to_city: route.to_city || '',
      consignor_id: route.consignor_id ? String(route.consignor_id) : '',
      consignee_id: route.consignee_id ? String(route.consignee_id) : '',
    });
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
                <Label htmlFor="route_name">Route Name</Label>
                <Input id="route_name" value={formData.route_name} onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} placeholder="Optional route name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City *</Label>
                  <select
                    id="from_city"
                    className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                    value={formData.from_city}
                    onChange={(e) => setFormData({ ...formData, from_city: e.target.value })}
                  >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name}>{city.city_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="to_city">To City *</Label>
                  <select
                    id="to_city"
                    className="h-10 w-full rounded-md border px-3 py-2 text-sm"
                    value={formData.to_city}
                    onChange={(e) => setFormData({ ...formData, to_city: e.target.value })}
                  >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name}>{city.city_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="route_consignor">Linked Consignor</Label>
                  <select id="route_consignor" className="h-10 w-full rounded-md border px-3 py-2 text-sm" value={formData.consignor_id} onChange={(e) => setFormData({ ...formData, consignor_id: e.target.value })}>
                    <option value="">None</option>
                    {consignors.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="route_consignee">Linked Consignee</Label>
                  <select id="route_consignee" className="h-10 w-full rounded-md border px-3 py-2 text-sm" value={formData.consignee_id} onChange={(e) => setFormData({ ...formData, consignee_id: e.target.value })}>
                    <option value="">None</option>
                    {consignees.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                  </select>
                </div>
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
              <TableHead>Route</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Linked Party</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-4 text-center">No routes found</TableCell></TableRow>
            ) : routes.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.route_name}</TableCell>
                <TableCell>{route.from_city}</TableCell>
                <TableCell>{route.to_city}</TableCell>
                <TableCell>{[route.consignor_name, route.consignee_name].filter(Boolean).join(' / ') || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(route)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(route.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
