'use client';

import { useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReceiptItem {
  invoice_no: string;
  invoice_amount: number;
  amount_received: number;
}

interface Receipt {
  id: number;
  receipt_no: string;
  receipt_date: string;
  party_name: string;
  consignor_id: number;
  mode: 'cash' | 'cheque' | 'bank_transfer';
  cheque_no?: string;
  cheque_date?: string;
  bank_name?: string;
  remarks?: string;
  items: ReceiptItem[];
  total_amount: number;
  status: 'pending' | 'cleared';
  created_at: string;
}

interface Consignor {
  id: number;
  name: string;
}

interface InvoiceApi {
  id: number;
  invoice_no: string;
  party_name: string;
  consignor_id: number;
  total_amount: number;
}

export default function ReceiptPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');

  const [formData, setFormData] = useState({
    consignor_id: '',
    party_name: '',
    receipt_date: new Date().toISOString().split('T')[0],
    mode: 'cash' as 'cash' | 'cheque' | 'bank_transfer',
    cheque_no: '',
    cheque_date: '',
    bank_name: '',
    remarks: '',
  });

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [currentInvoiceNo, setCurrentInvoiceNo] = useState('');
  const [currentAmountReceived, setCurrentAmountReceived] = useState('0');

  const { data: receipts = [], mutate } = useSWR<Receipt[]>(
    '/api/daily-entry/receipts',
    apiClient.get
  );
  const { data: consignors = [] } = useSWR<Consignor[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: invoices = [] } = useSWR<InvoiceApi[]>(
    '/api/daily-entry/invoices',
    apiClient.get
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          String(inv.consignor_id) === formData.consignor_id &&
          !receiptItems.some((item) => item.invoice_no === inv.invoice_no)
      ),
    [invoices, formData.consignor_id, receiptItems]
  );

  const calculateTotalReceived = useCallback(
    () => receiptItems.reduce((sum, item) => sum + item.amount_received, 0),
    [receiptItems]
  );

  const addReceiptItem = useCallback(() => {
    if (!currentInvoiceNo.trim()) {
      toast.error('Please select invoice number');
      return;
    }

    const selectedInvoice = filteredInvoices.find(
      (inv) => inv.invoice_no === currentInvoiceNo.trim()
    );
    if (!selectedInvoice) {
      toast.error('Invoice not found for selected consignor');
      return;
    }

    const invoiceAmount = Number(selectedInvoice.total_amount) || 0;
    const amountReceived = parseFloat(currentAmountReceived) || 0;
    if (amountReceived <= 0) {
      toast.error('Amount received must be greater than 0');
      return;
    }
    if (amountReceived > invoiceAmount) {
      toast.error('Amount received cannot exceed invoice amount');
      return;
    }

    setReceiptItems([
      ...receiptItems,
      {
        invoice_no: selectedInvoice.invoice_no,
        invoice_amount: invoiceAmount,
        amount_received: amountReceived,
      },
    ]);
    setCurrentInvoiceNo('');
    setCurrentAmountReceived('0');
    toast.success('Invoice added to receipt');
  }, [currentInvoiceNo, currentAmountReceived, filteredInvoices, receiptItems]);

  const removeReceiptItem = useCallback(
    (index: number) => {
      setReceiptItems(receiptItems.filter((_, i) => i !== index));
    },
    [receiptItems]
  );

  const handleEdit = useCallback(
    (receipt: Receipt) => {
      const consignor = consignors.find((item) => item.id === receipt.consignor_id);
      setEditingId(receipt.id);
      setConsignorSearch(consignor?.name || '');
      setFormData({
        consignor_id: String(receipt.consignor_id),
        party_name: receipt.party_name || '',
        receipt_date: receipt.receipt_date
          ? String(receipt.receipt_date).split('T')[0]
          : '',
        mode: receipt.mode || 'cash',
        cheque_no: receipt.cheque_no || '',
        cheque_date: receipt.cheque_date
          ? String(receipt.cheque_date).split('T')[0]
          : '',
        bank_name: receipt.bank_name || '',
        remarks: receipt.remarks || '',
      });
      setReceiptItems(
        (receipt.items || []).map((item) => ({
          invoice_no: item.invoice_no || '',
          invoice_amount: Number(item.invoice_amount) || 0,
          amount_received: Number(item.amount_received) || 0,
        }))
      );
      setCurrentInvoiceNo('');
      setCurrentAmountReceived('0');
      setActiveTab('form');
    },
    [consignors]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this receipt?')) return;
      try {
        await apiClient.delete(`/api/daily-entry/receipts/${id}`);
        toast.success('Receipt deleted successfully');
        mutate();
      } catch {
        toast.error('Failed to delete receipt');
      }
    },
    [mutate]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.consignor_id || !formData.party_name) {
        toast.error('Please fill required fields');
        return;
      }
      if (receiptItems.length === 0) {
        toast.error('Please add at least one invoice');
        return;
      }
      if (formData.mode === 'cheque' && !formData.cheque_no) {
        toast.error('Please enter cheque number');
        return;
      }

      try {
        const payload = {
          consignor_id: parseInt(formData.consignor_id, 10),
          party_name: formData.party_name,
          receipt_date: formData.receipt_date,
          mode: formData.mode,
          cheque_no: formData.cheque_no,
          cheque_date: formData.cheque_date,
          bank_name: formData.bank_name,
          remarks: formData.remarks,
          items: receiptItems,
          total_amount: calculateTotalReceived(),
        };

        if (editingId) {
          await apiClient.put(`/api/daily-entry/receipts/${editingId}`, payload);
          toast.success('Receipt updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/receipts', payload);
          toast.success('Receipt created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setReceiptItems([]);
        setCurrentInvoiceNo('');
        setCurrentAmountReceived('0');
      } catch {
        toast.error('Failed to save receipt');
      }
    },
    [editingId, formData, receiptItems, calculateTotalReceived, mutate]
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Party Receipt Entry</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
              setReceiptItems([]);
              setCurrentInvoiceNo('');
              setCurrentAmountReceived('0');
              setConsignorSearch('');
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Receipt
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignor_name">Consignor *</Label>
                  <Input
                    id="consignor_name"
                    list="receipt-consignor-options"
                    value={consignorSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsignorSearch(value);
                      const selected = consignors.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData({
                        ...formData,
                        consignor_id: selected ? String(selected.id) : '',
                        party_name: selected ? selected.name : formData.party_name,
                      });
                      setReceiptItems([]);
                      setCurrentInvoiceNo('');
                      setCurrentAmountReceived('0');
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="receipt-consignor-options">
                    {consignors.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="party_name">Party Name *</Label>
                  <Input
                    id="party_name"
                    value={formData.party_name}
                    onChange={(e) =>
                      setFormData({ ...formData, party_name: e.target.value })
                    }
                    placeholder="Enter party name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receipt_date">Receipt Date *</Label>
                  <Input
                    id="receipt_date"
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) =>
                      setFormData({ ...formData, receipt_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mode">Payment Mode *</Label>
                  <Select
                    value={formData.mode}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        mode: value as 'cash' | 'cheque' | 'bank_transfer',
                      })
                    }
                  >
                    <SelectTrigger id="mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.mode === 'cheque' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cheque_no">Cheque Number</Label>
                    <Input
                      id="cheque_no"
                      value={formData.cheque_no}
                      onChange={(e) =>
                        setFormData({ ...formData, cheque_no: e.target.value })
                      }
                      placeholder="Cheque number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cheque_date">Cheque Date</Label>
                    <Input
                      id="cheque_date"
                      type="date"
                      value={formData.cheque_date}
                      onChange={(e) =>
                        setFormData({ ...formData, cheque_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_name: e.target.value })
                      }
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices to Receive Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Input
                  placeholder="Invoice No"
                  list="receipt-invoice-options"
                  value={currentInvoiceNo}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentInvoiceNo(value);
                    const selected = filteredInvoices.find(
                      (inv) => inv.invoice_no === value.trim()
                    );
                    if (selected) {
                      setCurrentAmountReceived(String(Number(selected.total_amount) || 0));
                    }
                  }}
                />
                <datalist id="receipt-invoice-options">
                  {filteredInvoices.map((inv) => (
                    <option key={inv.id} value={inv.invoice_no} />
                  ))}
                </datalist>
                <Input
                  placeholder="Amount Received"
                  type="number"
                  value={currentAmountReceived}
                  onChange={(e) => setCurrentAmountReceived(e.target.value)}
                />
                <Button type="button" onClick={addReceiptItem} className="col-span-2">
                  Add
                </Button>
              </div>

              {receiptItems.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Invoice Amount</TableHead>
                        <TableHead>Amount Received</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.invoice_no}</TableCell>
                          <TableCell>₹{item.invoice_amount.toFixed(2)}</TableCell>
                          <TableCell>₹{item.amount_received.toFixed(2)}</TableCell>
                          <TableCell>
                            ₹{(item.invoice_amount - item.amount_received).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeReceiptItem(idx)}
                            >
                              ✕
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-lg font-bold text-blue-600">
                      Total Received: ₹{calculateTotalReceived().toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Any additional remarks"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingId ? 'Update Receipt' : 'Create Receipt'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setReceiptItems([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receipt_no}</TableCell>
                    <TableCell>{new Date(receipt.receipt_date).toLocaleDateString()}</TableCell>
                    <TableCell>{receipt.party_name}</TableCell>
                    <TableCell className="capitalize">
                      {receipt.mode.replace('_', ' ')}
                    </TableCell>
                    <TableCell>₹{receipt.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          receipt.status === 'cleared'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {receipt.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(receipt)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(receipt.id)}
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
      )}
    </div>
  );
}
