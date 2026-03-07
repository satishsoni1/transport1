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
import { Plus, Eye, Download } from 'lucide-react';
import useSWR from 'swr';

interface BillingItem {
  invoice_no: string;
  invoice_date: string;
  amount: number;
  tds: number;
  net_amount: number;
}

interface MonthlyBill {
  id: number;
  bill_no: string;
  bill_date: string;
  party_name: string;
  consignor_id: number;
  period_from: string;
  period_to: string;
  total_invoices: number;
  total_amount: number;
  tds_amount: number;
  net_amount: number;
  status: 'draft' | 'finalized' | 'sent';
  created_at: string;
}

export default function MonthlyBillingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    consignor_id: '',
    party_name: '',
    period_from: '',
    period_to: new Date().toISOString().split('T')[0],
    tds_percentage: '2',
    remarks: '',
  });

  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [currentItem, setCurrentItem] = useState<BillingItem>({
    invoice_no: '',
    invoice_date: '',
    amount: 0,
    tds: 0,
    net_amount: 0,
  });

  const { data: bills = [], mutate } = useSWR(
    '/api/daily-entry/monthly-bills',
    apiClient.get
  );

  const calculateItemTDS = useCallback(() => {
    const tdsPercent = parseFloat(formData.tds_percentage) || 0;
    const tdsAmount = (currentItem.amount * tdsPercent) / 100;
    return {
      tds: tdsAmount,
      netAmount: currentItem.amount - tdsAmount,
    };
  }, [currentItem.amount, formData.tds_percentage]);

  const calculateTotals = useCallback(() => {
    const subtotal = billingItems.reduce((sum, item) => sum + item.amount, 0);
    const totalTDS = billingItems.reduce((sum, item) => sum + item.tds, 0);
    return {
      subtotal,
      totalTDS,
      netAmount: subtotal - totalTDS,
    };
  }, [billingItems]);

  const addBillingItem = useCallback(() => {
    if (!currentItem.invoice_no || currentItem.amount <= 0) {
      toast.error('Please fill Invoice No and Amount');
      return;
    }

    const { tds, netAmount } = calculateItemTDS();
    setBillingItems([
      ...billingItems,
      {
        ...currentItem,
        tds,
        net_amount: netAmount,
      },
    ]);
    setCurrentItem({
      invoice_no: '',
      invoice_date: '',
      amount: 0,
      tds: 0,
      net_amount: 0,
    });
    toast.success('Invoice added to bill');
  }, [currentItem, billingItems, calculateItemTDS]);

  const removeBillingItem = useCallback(
    (index: number) => {
      setBillingItems(billingItems.filter((_, i) => i !== index));
    },
    [billingItems]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.consignor_id || !formData.party_name) {
        toast.error('Please fill required fields');
        return;
      }

      if (!formData.period_from || !formData.period_to) {
        toast.error('Please select billing period');
        return;
      }

      if (billingItems.length === 0) {
        toast.error('Please add at least one invoice');
        return;
      }

      try {
        const totals = calculateTotals();
        const payload = {
          consignor_id: parseInt(formData.consignor_id),
          party_name: formData.party_name,
          period_from: formData.period_from,
          period_to: formData.period_to,
          tds_percentage: parseFloat(formData.tds_percentage),
          remarks: formData.remarks,
          items: billingItems,
          total_amount: totals.subtotal,
          tds_amount: totals.totalTDS,
          net_amount: totals.netAmount,
        };

        if (editingId) {
          await apiClient.put(
            `/api/daily-entry/monthly-bills/${editingId}`,
            payload
          );
          toast.success('Monthly bill updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/monthly-bills', payload);
          toast.success('Monthly bill created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setBillingItems([]);
      } catch (error) {
        toast.error('Failed to save monthly bill');
      }
    },
    [editingId, formData, billingItems, calculateTotals, mutate]
  );

  const totals = calculateTotals();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Monthly Billing</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
              setBillingItems([]);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Monthly Bill
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Bill Details</CardTitle>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="period_from">Period From *</Label>
                  <Input
                    id="period_from"
                    type="date"
                    value={formData.period_from}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_from: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="period_to">Period To *</Label>
                  <Input
                    id="period_to"
                    type="date"
                    value={formData.period_to}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_to: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="tds_percentage">TDS Percentage %</Label>
                  <Input
                    id="tds_percentage"
                    type="number"
                    step="0.01"
                    value={formData.tds_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tds_percentage: e.target.value,
                      })
                    }
                    placeholder="2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Section */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices to Include</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2 mb-4">
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
                  placeholder="Invoice Date"
                  type="date"
                  value={currentItem.invoice_date}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      invoice_date: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={currentItem.amount}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Button
                  type="button"
                  onClick={addBillingItem}
                  className="col-span-2"
                >
                  Add Invoice
                </Button>
              </div>

              {billingItems.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>TDS ({formData.tds_percentage}%)</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {item.invoice_no}
                          </TableCell>
                          <TableCell>
                            {new Date(item.invoice_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                          <TableCell>₹{item.tds.toFixed(2)}</TableCell>
                          <TableCell>₹{item.net_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeBillingItem(idx)}
                            >
                              ✕
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-lg font-semibold">
                        {billingItems.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.subtotal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">TDS</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.totalTDS.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₹{totals.netAmount.toFixed(2)}
                      </p>
                    </div>
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
              {editingId ? 'Update Bill' : 'Create Bill'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setBillingItems([]);
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
                <TableHead>Bill No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No monthly bills found
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill: MonthlyBill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.bill_no}</TableCell>
                    <TableCell>
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{bill.party_name}</TableCell>
                    <TableCell>
                      {new Date(bill.period_from).toLocaleDateString()} -{' '}
                      {new Date(bill.period_to).toLocaleDateString()}
                    </TableCell>
                    <TableCell>₹{bill.total_amount.toFixed(2)}</TableCell>
                    <TableCell>₹{bill.net_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          bill.status === 'finalized'
                            ? 'bg-green-100 text-green-800'
                            : bill.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
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
