'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinancialYear {
  id: number;
  year_label: string;
  start_date: string;
  end_date: string;
  is_default: boolean;
  is_current?: boolean;
  status: string;
}

export default function FinancialYearsPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    year_label: '',
    start_date: '',
    end_date: '',
    is_default: true,
  });
  const { data: years = [], mutate } = useSWR<FinancialYear[]>('/api/settings/financial-years', apiClient.get);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.year_label || !formData.start_date || !formData.end_date) {
      toast.error('Fill year label, start date, and end date');
      return;
    }
    try {
      await apiClient.post('/api/settings/financial-years', formData);
      toast.success('Financial year added');
      setFormData({ year_label: '', start_date: '', end_date: '', is_default: true });
      mutate();
    } catch {
      toast.error('Failed to save financial year');
    }
  }, [formData, mutate]);

  const setDefault = async (year: FinancialYear) => {
    try {
      await apiClient.put(`/api/settings/financial-years/${year.id}`, { is_default: true });
      toast.success('Default financial year changed');
      mutate();
    } catch {
      toast.error('Failed to change default year');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Financial Years</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Add Financial Year</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="year_label">Year Label</Label>
              <Input id="year_label" value={formData.year_label} onChange={(e) => setFormData({ ...formData, year_label: e.target.value })} placeholder="2026-27" />
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} />
                Set default session
              </label>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> Add Year</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-4 text-center">No financial years found</TableCell></TableRow>
            ) : years.map((year) => (
              <TableRow key={year.id}>
                <TableCell className="font-medium">{year.year_label}</TableCell>
                <TableCell>{new Date(year.start_date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{new Date(year.end_date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{year.is_current || year.is_default ? 'Default' : '-'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" disabled={year.is_current || year.is_default} onClick={() => setDefault(year)}>
                    Set Default
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
