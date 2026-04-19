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

interface Consignor {
  id: number;
  name: string;
}

interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  party_name: string;
  received_amount?: number;
  tds_amount?: number;
  deduction_amount?: number;
  total_amount: number;
  receipt_type?: string;
}

export default function OnAccountReceiptPage() {
  const { user } = useAuth();
  const [consignorSearch, setConsignorSearch] = useState('');
  const [formData, setFormData] = useState({
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
  });

  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: receipts = [], mutate } = useSWR<Receipt[]>('/api/daily-entry/receipts', apiClient.get);
  const onAccountReceipts = receipts.filter((item) => item.receipt_type === 'on_account');

  const handlePhotoUpload = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData((prev) => ({ ...prev, photo_url: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }, []);

  const resetForm = () => {
    setConsignorSearch('');
    setFormData({
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
    });
  };

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

    try {
      await apiClient.post('/api/daily-entry/receipts', {
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
      });
      toast.success('On account receipt created');
      resetForm();
      mutate();
    } catch {
      toast.error('Failed to save on account receipt');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">On Account Receipt</h1>
        <p className="text-sm text-muted-foreground">Receive amount directly against a party without selecting an invoice.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Receipt Details</CardTitle></CardHeader>
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
            </div>
          </CardContent>
        </Card>
        <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> Create On Account Receipt</Button>
      </form>

      <Card>
        <CardHeader><CardTitle>Recent On Account Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {onAccountReceipts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No on account receipts found.</div>
          ) : onAccountReceipts.map((receipt) => (
            <div key={receipt.id} className="rounded-md border p-3 text-sm">
              <b>{receipt.receipt_no}</b> | {receipt.party_name} | Received Rs {Number(receipt.received_amount ?? receipt.total_amount).toFixed(2)} | TDS Rs {Number(receipt.tds_amount || 0).toFixed(2)} | Deduct Rs {Number(receipt.deduction_amount || 0).toFixed(2)}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
