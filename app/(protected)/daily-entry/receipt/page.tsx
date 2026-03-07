'use client';

import { useState, useCallback } from 'react';
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
import { Plus, Trash2, Eye } from 'lucide-react';
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
  total_amount: number;
  status: 'pending' | 'cleared';
  created_at: string;
}

export default function ReceiptPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

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
  const [currentItem, setCurrentItem] = useState<ReceiptItem>({
    invoice_no: '',
    invoice_amount: 0,
    amount_received: 0,
  });

  const { data: receipts = [], mutate } = useSWR(
    '/api/daily-entry/receipts',
    apiClient.get
  );

  const calculateTotalReceived = useCallback(() => {
    return receiptItems.reduce((sum, item) => sum + item.amount_received, 0);
  }, [receiptItems]);

  const addReceiptItem = useCallback(() => {
    if (!currentItem.invoice_no || currentItem.amount_received <= 0) {
      toast.error('Please fill Invoice No and Amount');
      return;
    }

    setReceiptItems([...receiptItems, currentItem]);
    setCurrentItem({
      invoice_no: '',
      invoice_amount: 0,
      amount_received: 0,
    });
    toast.success('Invoice added to receipt');
  }, [currentItem, receiptItems]);

  const removeReceiptItem = useCallback(
    (index: number) => {
      setReceiptItems(receiptItems.filter((_, i) => i !== index));
    },
    [receiptItems]
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
          consignor_id: parseInt(formData.consignor_id),
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
      } catch (error) {
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
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="consignor_id">Consignor ID *</Label>
                  <Input
                    id="consignor_id"
                    type="number"
                    value={formData.consignor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, consignor_id: e.target.value })
                    }
                    placeholder="Consignor ID"
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
                      setFormData({
                        ...formData,
                        receipt_date: e.target.value,
                      })
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
                        setFormData({
                          ...formData,
                          cheque_no: e.target.value,
                        })
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
                        setFormData({
                          ...formData,
                          cheque_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_name: e.target.value,
                        })
                      }
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices Section */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices to Receive Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Input
                  placeholder="Invoice No"
                  value={currentItem.invoice_no}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      invoice_no: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Invoice Amount"
                  type="number"
                  value={currentItem.invoice_amount}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      invoice_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  placeholder="Amount Received"
                  type="number"
                  value={currentItem.amount_received}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      amount_received: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Button type="button" onClick={addReceiptItem}>
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
                          <TableCell className="font-medium">
                            {item.invoice_no}
                          </TableCell>
                          <TableCell>₹{item.invoice_amount.toFixed(2)}</TableCell>
                          <TableCell>₹{item.amount_received.toFixed(2)}</TableCell>
                          <TableCell>
                            ₹
                            {(item.invoice_amount - item.amount_received).toFixed(
                              2
                            )}
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

          {/* Remarks Section */}
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
                receipts.map((receipt: Receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">
                      {receipt.receipt_no}
                    </TableCell>
                    <TableCell>
                      {new Date(receipt.receipt_date).toLocaleDateString()}
                    </TableCell>
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
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
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
