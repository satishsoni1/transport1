'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

interface Entry {
  id: number;
  entry_type: 'expense' | 'income';
  category_id: number | null;
  category_name: string | null;
  amount: number;
  entry_date: string;
  payment_mode: 'cash' | 'bank' | 'cheque';
  cheque_no: string;
  cheque_date: string;
  bank_name: string;
  vehicle_id: number | null;
  vehicle_no: string | null;
  driver_id: number | null;
  driver_name: string | null;
  remarks: string;
  attachment_url: string;
}

interface Category {
  id: number;
  name: string;
  category_type: 'expense' | 'income';
}

interface Vehicle {
  id: number;
  vehicle_no: string;
}

interface Driver {
  id: number;
  driver_name: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  net: number;
}

const EMPTY_FORM = {
  entry_type: 'expense' as 'expense' | 'income',
  category_id: 'none',
  amount: '',
  entry_date: new Date().toISOString().slice(0, 10),
  payment_mode: 'cash' as 'cash' | 'bank' | 'cheque',
  cheque_no: '',
  cheque_date: '',
  bank_name: '',
  vehicle_id: 'none',
  driver_id: 'none',
  remarks: '',
  attachment_url: '',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function startOfYear() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountsEntriesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [range, setRange] = useState({ from: startOfYear(), to: today() });
  const [appliedRange, setAppliedRange] = useState(range);

  const { data: entries = [], mutate } = useSWR<Entry[]>(
    `/api/accounts/entries?from=${appliedRange.from}&to=${appliedRange.to}`,
    apiClient.get
  );
  const { data: categories = [] } = useSWR<Category[]>('/api/masters/expense-categories', apiClient.get);
  const { data: vehicles = [] } = useSWR<Vehicle[]>('/api/masters/vehicles', apiClient.get);
  const { data: drivers = [] } = useSWR<Driver[]>('/api/masters/drivers', apiClient.get);
  const { data: summary } = useSWR<Summary>(
    `/api/accounts/summary?from=${appliedRange.from}&to=${appliedRange.to}`,
    apiClient.get
  );

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.category_type === formData.entry_type),
    [categories, formData.entry_type]
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    setOpen(newOpen);
  };

  const handleFileUpload = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, attachment_url: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.amount || Number(formData.amount) <= 0) {
        toast.error('Amount must be a positive number');
        return;
      }
      if (!formData.entry_date) {
        toast.error('Entry date is required');
        return;
      }

      const payload = {
        ...formData,
        amount: Number(formData.amount),
        category_id: formData.category_id === 'none' ? null : Number(formData.category_id),
        vehicle_id: formData.vehicle_id === 'none' ? null : Number(formData.vehicle_id),
        driver_id: formData.driver_id === 'none' ? null : Number(formData.driver_id),
      };

      try {
        if (editingId) {
          await apiClient.put(`/api/accounts/entries/${editingId}`, payload);
          toast.success('Entry updated');
        } else {
          await apiClient.post('/api/accounts/entries', payload);
          toast.success('Entry added');
        }
        mutate();
        handleOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save entry');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setFormData({
      entry_type: entry.entry_type,
      category_id: entry.category_id ? String(entry.category_id) : 'none',
      amount: String(entry.amount),
      entry_date: entry.entry_date,
      payment_mode: entry.payment_mode,
      cheque_no: entry.cheque_no || '',
      cheque_date: entry.cheque_date || '',
      bank_name: entry.bank_name || '',
      vehicle_id: entry.vehicle_id ? String(entry.vehicle_id) : 'none',
      driver_id: entry.driver_id ? String(entry.driver_id) : 'none',
      remarks: entry.remarks || '',
      attachment_url: entry.attachment_url || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await apiClient.delete(`/api/accounts/entries/${id}`);
      toast.success('Entry deleted');
      mutate();
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense &amp; Income</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, entry_type: type, category_id: 'none' })}
                    className={cn(
                      'rounded-md border px-3 py-3 text-sm font-semibold capitalize transition',
                      formData.entry_type === type
                        ? type === 'income'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger id="category_id"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="entry_date">Date *</Label>
                  <Input id="entry_date" type="date" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="payment_mode">Payment Mode</Label>
                  <Select value={formData.payment_mode} onValueChange={(v) => setFormData({ ...formData, payment_mode: v as 'cash' | 'bank' | 'cheque' })}>
                    <SelectTrigger id="payment_mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payment_mode === 'cheque' ? (
                  <>
                    <div>
                      <Label htmlFor="cheque_no">Cheque No</Label>
                      <Input id="cheque_no" value={formData.cheque_no} onChange={(e) => setFormData({ ...formData, cheque_no: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="cheque_date">Cheque Date</Label>
                      <Input id="cheque_date" type="date" value={formData.cheque_date} onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })} />
                    </div>
                  </>
                ) : null}
                {formData.payment_mode !== 'cash' ? (
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input id="bank_name" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="vehicle_id">Vehicle (optional)</Label>
                  <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
                    <SelectTrigger id="vehicle_id"><SelectValue placeholder="No vehicle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vehicle</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="driver_id">Driver (optional)</Label>
                  <Select value={formData.driver_id} onValueChange={(v) => setFormData({ ...formData, driver_id: v })}>
                    <SelectTrigger id="driver_id"><SelectValue placeholder="No driver" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.driver_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" rows={2} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="attachment_url">Receipt / Attachment</Label>
                <Input id="attachment_url" type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0] || null)} />
                {formData.attachment_url ? (
                  <img src={formData.attachment_url} alt="Attachment" className="mt-2 h-20 w-20 rounded border object-cover" />
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="range_from">From</Label>
          <Input id="range_from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="range_to">To</Label>
          <Input id="range_to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <Button variant="outline" onClick={() => setAppliedRange(range)}>Apply Filter</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Income</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">{formatCurrency(summary?.totalIncome ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Expense</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700">{formatCurrency(summary?.totalExpense ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Net</CardTitle></CardHeader>
          <CardContent className={cn('text-2xl font-bold', (summary?.net ?? 0) < 0 ? 'text-red-600' : 'text-slate-900')}>
            {formatCurrency(summary?.net ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">No entries found</TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.entry_date}</TableCell>
                  <TableCell>
                    <span className={cn('px-2 py-1 rounded text-xs font-medium capitalize', entry.entry_type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                      {entry.entry_type}
                    </span>
                  </TableCell>
                  <TableCell>{entry.category_name || '-'}</TableCell>
                  <TableCell className={entry.entry_type === 'income' ? 'text-emerald-700' : 'text-amber-700'}>
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="capitalize">{entry.payment_mode}</TableCell>
                  <TableCell>{entry.vehicle_no || '-'}</TableCell>
                  <TableCell>{entry.driver_name || '-'}</TableCell>
                  <TableCell className="text-slate-500">{entry.remarks || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)}>
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
