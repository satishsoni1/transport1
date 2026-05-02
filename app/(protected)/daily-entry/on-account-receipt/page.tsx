'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Edit2 } from 'lucide-react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Consignor {
  id: number;
  name: string;
}

interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  party_name: string;
  consignor_id: number;
  received_amount?: number;
  tds_amount?: number;
  deduction_amount?: number;
  total_amount: number;
  receipt_type?: string;
  mode?: string;
  bank_name?: string;
  cheque_no?: string;
  cheque_date?: string;
  remarks?: string;
  photo_url?: string;
}

const emptyForm = {
  consignor_id: '',
  party_name: '',
  receipt_date: new Date().toISOString().split('T')[0],
  mode: 'cash',
  bank_name: '',
  cheque_no: '',
  cheque_date: '',
  received_amount: '',
  tds_amount: '0',
  deduction_amount: '0',
  remarks: '',
  photo_url: '',
};

export default function OnAccountReceiptPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: receipts = [], mutate } = useSWR<Receipt[]>('/api/daily-entry/receipts', apiClient.get);
  const onAccountReceipts = receipts.filter((item) => item.receipt_type === 'on_account');

  const handlePhotoUpload = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, photo_url: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }, []);

  const resetForm = useCallback(() => {
    setConsignorSearch('');
    setFormData(emptyForm);
    setEditingId(null);
  }, []);

  const handleEdit = useCallback(
    (receipt: Receipt) => {
      const consignor = consignors.find((c) => c.id === receipt.consignor_id);
      setConsignorSearch(consignor?.name || receipt.party_name || '');
      setFormData({
        consignor_id: String(receipt.consignor_id),
        party_name: receipt.party_name || '',
        receipt_date: receipt.receipt_date ? String(receipt.receipt_date).split('T')[0] : new Date().toISOString().split('T')[0],
        mode: receipt.mode || 'cash',
        bank_name: receipt.bank_name || '',
        cheque_no: receipt.cheque_no || '',
        cheque_date: receipt.cheque_date ? String(receipt.cheque_date).split('T')[0] : '',
        received_amount: String(receipt.received_amount ?? receipt.total_amount ?? ''),
        tds_amount: String(receipt.tds_amount ?? 0),
        deduction_amount: String(receipt.deduction_amount ?? 0),
        remarks: receipt.remarks || '',
        photo_url: receipt.photo_url || '',
      });
      setEditingId(receipt.id);
      setActiveTab('form');
    },
    [consignors]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.consignor_id || !formData.party_name || !formData.received_amount) {
      toast.error('Party and received amount are required');
      return;
    }

    const received = Number(formData.received_amount) || 0;
    const tds = Number(formData.tds_amount) || 0;
    const deduction = Number(formData.deduction_amount) || 0;
    if (received <= 0) {
      toast.error('Received amount must be greater than zero');
      return;
    }

    const payload = {
      consignor_id: Number(formData.consignor_id),
      party_name: formData.party_name,
      receipt_date: formData.receipt_date,
      mode: formData.mode,
      bank_name: formData.bank_name,
      cheque_no: formData.cheque_no,
      cheque_date: formData.cheque_date,
      remarks: formData.remarks,
      photo_url: formData.photo_url,
      receipt_type: 'on_account',
      items: [
        {
          invoice_no: 'ON_ACCOUNT',
          invoice_amount: received + tds + deduction,
          amount_received: received,
          tds_amount: tds,
          deduction_amount: deduction,
        },
      ],
      received_amount: received,
      tds_amount: tds,
      deduction_amount: deduction,
      total_amount: received,
      created_by: user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    };

    try {
      if (editingId) {
        await apiClient.put(`/api/daily-entry/receipts/${editingId}`, payload);
        toast.success('On account receipt updated');
      } else {
        await apiClient.post('/api/daily-entry/receipts', payload);
        toast.success('On account receipt created');
      }
      resetForm();
      mutate();
      setActiveTab('list');
    } catch {
      toast.error(editingId ? 'Failed to update on account receipt' : 'Failed to save on account receipt');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">On Account Receipt</h1>
          <p className="text-sm text-muted-foreground">Receive amount directly against a party without selecting an invoice.</p>
        </div>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New Receipt
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{editingId ? 'Edit On Account Receipt' : 'New On Account Receipt'}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="oa_party">Consignor *</Label>
                <Input
                  id="oa_party"
                  list="oa-consignor-options"
                  value={consignorSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConsignorSearch(value);
                    const selected = consignors.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
                    setFormData((prev) => ({
                      ...prev,
                      consignor_id: selected ? String(selected.id) : '',
                      party_name: selected ? selected.name : prev.party_name,
                    }));
                  }}
                />
                <datalist id="oa-consignor-options">
                  {consignors.map((item) => <option key={item.id} value={item.name} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="oa_date">Receipt Date *</Label>
                <Input id="oa_date" type="date" value={formData.receipt_date} onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_mode">Payment Mode</Label>
                <select id="oa_mode" className="h-10 w-full rounded-md border px-3 py-2 text-sm" value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <Label htmlFor="oa_received">Received Amount *</Label>
                <Input id="oa_received" type="number" value={formData.received_amount} onChange={(e) => setFormData({ ...formData, received_amount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_tds">TDS Amount</Label>
                <Input id="oa_tds" type="number" value={formData.tds_amount} onChange={(e) => setFormData({ ...formData, tds_amount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_deduct">Deduction Amount</Label>
                <Input id="oa_deduct" type="number" value={formData.deduction_amount} onChange={(e) => setFormData({ ...formData, deduction_amount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_bank">Bank Name</Label>
                <Input id="oa_bank" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_cheque">Cheque / Ref No</Label>
                <Input id="oa_cheque" value={formData.cheque_no} onChange={(e) => setFormData({ ...formData, cheque_no: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="oa_remark">Remark</Label>
                <Input id="oa_remark" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="oa_photo">Payment Photo / Reference</Label>
                <Input id="oa_photo" type="file" accept="image/*,.pdf" onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)} />
                {formData.photo_url && (
                  <a href={formData.photo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-1 block">View attached reference</a>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gap-2">
              <Plus className="h-4 w-4" /> {editingId ? 'Update On Account Receipt' : 'Create On Account Receipt'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { resetForm(); setActiveTab('list'); }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Card>
          <CardHeader><CardTitle>On Account Receipts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {onAccountReceipts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No on account receipts found.</div>
            ) : onAccountReceipts.map((receipt) => (
              <div key={receipt.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <b>{receipt.receipt_no}</b>
                    <span>{receipt.party_name}</span>
                    <span>₹{Number(receipt.received_amount ?? receipt.total_amount).toFixed(2)}</span>
                    <span className="text-slate-500 text-xs">TDS ₹{Number(receipt.tds_amount || 0).toFixed(2)} | Deduct ₹{Number(receipt.deduction_amount || 0).toFixed(2)}</span>
                    {receipt.mode && <span className="capitalize text-muted-foreground">{receipt.mode.replace('_', ' ')}</span>}
                    <span className="text-muted-foreground text-xs">{new Date(receipt.receipt_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(receipt)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                  {receipt.remarks && <span className="text-xs text-muted-foreground">{receipt.remarks}</span>}
                  {receipt.photo_url && <a href={receipt.photo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View Photo</a>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
