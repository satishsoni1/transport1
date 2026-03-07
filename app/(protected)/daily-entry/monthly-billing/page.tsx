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
  tds_percentage: number;
  remarks: string;
  items: BillingItem[];
  total_invoices: number;
  total_amount: number;
  tds_amount: number;
  net_amount: number;
  status: 'draft' | 'finalized' | 'sent';
  created_at: string;
}

interface Consignor {
  id: number;
  name: string;
}

interface InvoiceApi {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  consignor_id: number;
  total_amount: number;
}

function isInDateRange(dateStr: string, from: string, to: string) {
  if (!from || !to) return true;
  const d = new Date(dateStr);
  const f = new Date(from);
  const t = new Date(to);
  return d >= f && d <= t;
}

export default function MonthlyBillingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');

  const [formData, setFormData] = useState({
    consignor_id: '',
    party_name: '',
    period_from: '',
    period_to: new Date().toISOString().split('T')[0],
    tds_percentage: '2',
    remarks: '',
  });

  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [currentInvoiceNo, setCurrentInvoiceNo] = useState('');

  const { data: bills = [], mutate } = useSWR<MonthlyBill[]>(
    '/api/daily-entry/monthly-bills',
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
          isInDateRange(inv.invoice_date, formData.period_from, formData.period_to) &&
          !billingItems.some((item) => item.invoice_no === inv.invoice_no)
      ),
    [invoices, formData.consignor_id, formData.period_from, formData.period_to, billingItems]
  );

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
    if (!currentInvoiceNo.trim()) {
      toast.error('Please select invoice number');
      return;
    }

    const selectedInvoice = filteredInvoices.find(
      (inv) => inv.invoice_no === currentInvoiceNo.trim()
    );
    if (!selectedInvoice) {
      toast.error('Invoice not found for selected consignor/period');
      return;
    }

    const amount = Number(selectedInvoice.total_amount) || 0;
    const tdsPercent = parseFloat(formData.tds_percentage) || 0;
    const tds = (amount * tdsPercent) / 100;
    const netAmount = amount - tds;

    setBillingItems([
      ...billingItems,
      {
        invoice_no: selectedInvoice.invoice_no,
        invoice_date: selectedInvoice.invoice_date,
        amount,
        tds,
        net_amount: netAmount,
      },
    ]);
    setCurrentInvoiceNo('');
    toast.success('Invoice added to bill');
  }, [currentInvoiceNo, filteredInvoices, formData.tds_percentage, billingItems]);

  const removeBillingItem = useCallback(
    (index: number) => {
      setBillingItems(billingItems.filter((_, i) => i !== index));
    },
    [billingItems]
  );

  const handleEdit = useCallback(
    (bill: MonthlyBill) => {
      const consignor = consignors.find((item) => item.id === bill.consignor_id);
      setEditingId(bill.id);
      setConsignorSearch(consignor?.name || '');
      setFormData({
        consignor_id: String(bill.consignor_id),
        party_name: bill.party_name || '',
        period_from: bill.period_from ? String(bill.period_from).split('T')[0] : '',
        period_to: bill.period_to ? String(bill.period_to).split('T')[0] : '',
        tds_percentage: String(bill.tds_percentage ?? 0),
        remarks: bill.remarks || '',
      });
      setBillingItems(
        (bill.items || []).map((item) => ({
          invoice_no: item.invoice_no || '',
          invoice_date: item.invoice_date
            ? String(item.invoice_date).split('T')[0]
            : '',
          amount: Number(item.amount) || 0,
          tds: Number(item.tds) || 0,
          net_amount: Number(item.net_amount) || 0,
        }))
      );
      setCurrentInvoiceNo('');
      setActiveTab('form');
    },
    [consignors]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this monthly bill?')) return;
      try {
        await apiClient.delete(`/api/daily-entry/monthly-bills/${id}`);
        toast.success('Monthly bill deleted successfully');
        mutate();
      } catch {
        toast.error('Failed to delete monthly bill');
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
          consignor_id: parseInt(formData.consignor_id, 10),
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
          await apiClient.put(`/api/daily-entry/monthly-bills/${editingId}`, payload);
          toast.success('Monthly bill updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/monthly-bills', payload);
          toast.success('Monthly bill created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setBillingItems([]);
        setCurrentInvoiceNo('');
      } catch {
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
              setCurrentInvoiceNo('');
              setConsignorSearch('');
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
          <Card>
            <CardHeader>
              <CardTitle>Monthly Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignor_name">Consignor *</Label>
                  <Input
                    id="consignor_name"
                    list="mb-consignor-options"
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
                      setBillingItems([]);
                      setCurrentInvoiceNo('');
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="mb-consignor-options">
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="period_from">Period From *</Label>
                  <Input
                    id="period_from"
                    type="date"
                    value={formData.period_from}
                    onChange={(e) =>
                      setFormData({ ...formData, period_from: e.target.value })
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
                      setFormData({ ...formData, period_to: e.target.value })
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
                      setFormData({ ...formData, tds_percentage: e.target.value })
                    }
                    placeholder="2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices to Include</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2 mb-4">
                <Input
                  placeholder="Invoice No"
                  list="mb-invoice-options"
                  value={currentInvoiceNo}
                  onChange={(e) => setCurrentInvoiceNo(e.target.value)}
                />
                <datalist id="mb-invoice-options">
                  {filteredInvoices.map((inv) => (
                    <option key={inv.id} value={inv.invoice_no} />
                  ))}
                </datalist>
                <Button type="button" onClick={addBillingItem} className="col-span-4">
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
                          <TableCell className="font-medium">{item.invoice_no}</TableCell>
                          <TableCell>{new Date(item.invoice_date).toLocaleDateString()}</TableCell>
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
                      <p className="text-lg font-semibold">{billingItems.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold">₹{totals.subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">TDS</p>
                      <p className="text-lg font-semibold">₹{totals.totalTDS.toFixed(2)}</p>
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
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.bill_no}</TableCell>
                    <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(bill)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(bill.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
