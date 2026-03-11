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

interface Bank {
  id: number;
  bank_name: string;
  branch: string;
  ifsc_code: string;
  account_no: string;
  account_holder: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function BanksPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    bank_name: '',
    branch: '',
    ifsc_code: '',
    account_no: '',
    account_holder: '',
  });

  const { data: banks = [], mutate } = useSWR<Bank[]>(
    '/api/masters/banks',
    apiClient.get
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setFormData({
        bank_name: '',
        branch: '',
        ifsc_code: '',
        account_no: '',
        account_holder: '',
      });
    }
    setOpen(newOpen);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.bank_name || !formData.account_no) {
        toast.error('Please fill required fields: Bank Name, Account No');
        return;
      }

      try {
        if (editingId) {
          await apiClient.put(`/api/masters/banks/${editingId}`, formData);
          toast.success('Bank updated successfully');
        } else {
          await apiClient.post('/api/masters/banks', formData);
          toast.success('Bank added successfully');
        }
        mutate();
        handleOpenChange(false);
      } catch (error) {
        toast.error('Failed to save bank');
      }
    },
    [editingId, formData, mutate]
  );

  const handleEdit = (bank: Bank) => {
    setEditingId(bank.id);
    setFormData({
      bank_name: bank.bank_name,
      branch: bank.branch,
      ifsc_code: bank.ifsc_code,
      account_no: bank.account_no,
      account_holder: bank.account_holder,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank?')) return;

    try {
      await apiClient.delete(`/api/masters/banks/${id}`);
      toast.success('Bank deleted successfully');
      mutate();
    } catch (error) {
      toast.error('Failed to delete bank');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banks Master</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Bank
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Bank' : 'Add New Bank'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    placeholder="Branch name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input
                    id="ifsc"
                    value={formData.ifsc_code}
                    onChange={(e) =>
                      setFormData({ ...formData, ifsc_code: e.target.value })
                    }
                    placeholder="IFSC Code"
                  />
                </div>
                <div>
                  <Label htmlFor="account_no">Account No *</Label>
                  <Input
                    id="account_no"
                    value={formData.account_no}
                    onChange={(e) =>
                      setFormData({ ...formData, account_no: e.target.value })
                    }
                    placeholder="Account number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="account_holder">Account Holder Name</Label>
                <Input
                  id="account_holder"
                  value={formData.account_holder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account_holder: e.target.value,
                    })
                  }
                  placeholder="Account holder name"
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
              <TableHead>Bank Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>IFSC Code</TableHead>
              <TableHead>Account No</TableHead>
              <TableHead>Account Holder</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No banks found
                </TableCell>
              </TableRow>
            ) : (
              banks.map((bank: Bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.bank_name}</TableCell>
                  <TableCell>{bank.branch}</TableCell>
                  <TableCell>{bank.ifsc_code}</TableCell>
                  <TableCell>{bank.account_no}</TableCell>
                  <TableCell>{bank.account_holder}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(bank)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(bank.id)}
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
