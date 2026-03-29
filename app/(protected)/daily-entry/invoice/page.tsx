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
import { Plus, Trash2, Edit2 } from 'lucide-react';
import useSWR from 'swr';

interface InvoiceItem {
  description: string;
  lr_no: string;
  qty: number;
  rate: number;
  amount: number;
}

interface Consignor {
  id: number;
  name: string;
}

interface LREntryApi {
  id: number;
  lr_no: string;
  consignor_id: number;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
  pod_received?: boolean;
  return_status?: 'normal' | 'returned';
  goods_items: Array<{ description?: string; qty?: number; rate?: number }>;
}

interface Invoice {
  id: number;
  invoice_no: string;
  invoice_date: string;
  party_name: string;
  consignor_id: number;
  gst_percentage: number;
  remarks: string;
  items: InvoiceItem[];
  total_amount: number;
  gst_amount: number;
  net_amount: number;
  status: 'draft' | 'issued' | 'paid';
  created_at: string;
}

export default function InvoicePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');

  const [formData, setFormData] = useState({
    consignor_id: '',
    party_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    gst_percentage: '18',
    remarks: '',
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    description: '',
    lr_no: '',
    qty: 0,
    rate: 0,
    amount: 0,
  });

  const { data: invoices = [], mutate } = useSWR<Invoice[]>(
    '/api/daily-entry/invoices',
    apiClient.get
  );
  const { data: consignors = [] } = useSWR<Consignor[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: lrEntries = [] } = useSWR<LREntryApi[]>(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );

  const calculateTotals = useCallback(() => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const gstPercent = parseFloat(formData.gst_percentage) || 0;
    const gstAmount = (subtotal * gstPercent) / 100;
    return {
      subtotal,
      gstAmount,
      netAmount: subtotal + gstAmount,
    };
  }, [invoiceItems, formData.gst_percentage]);

  const availableLREntries = lrEntries.filter(
    (entry) =>
      String(entry.consignor_id) === formData.consignor_id &&
      entry.status !== 'paid' &&
      !entry.pod_received &&
      entry.return_status !== 'returned' &&
      !invoiceItems.some((item) => item.lr_no === entry.lr_no)
  );

  const addInvoiceItem = useCallback(() => {
    if (!currentItem.lr_no) {
      toast.error('Please select L.R. No');
      return;
    }
    if (!currentItem.description) {
      toast.error('Description is required');
      return;
    }
    if (currentItem.qty <= 0 || currentItem.rate < 0) {
      toast.error('Qty/Rate must be valid');
      return;
    }
    if (invoiceItems.some((item) => item.lr_no === currentItem.lr_no)) {
      toast.error('This L.R. is already added');
      return;
    }

    setInvoiceItems([
      ...invoiceItems,
      {
        ...currentItem,
        amount: currentItem.qty * currentItem.rate,
      },
    ]);
    setCurrentItem({
      description: '',
      lr_no: '',
      qty: 0,
      rate: 0,
      amount: 0,
    });
    toast.success('Item added');
  }, [currentItem, invoiceItems]);

  const removeInvoiceItem = useCallback(
    (index: number) => {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    },
    [invoiceItems]
  );

  const handleEdit = useCallback(
    (invoice: Invoice) => {
      const consignor = consignors.find((item) => item.id === invoice.consignor_id);
      setEditingId(invoice.id);
      setConsignorSearch(consignor?.name || '');
      setFormData({
        consignor_id: String(invoice.consignor_id),
        party_name: invoice.party_name || '',
        invoice_date: invoice.invoice_date
          ? String(invoice.invoice_date).split('T')[0]
          : '',
        gst_percentage: String(invoice.gst_percentage ?? 0),
        remarks: invoice.remarks || '',
      });
      setInvoiceItems(
        (invoice.items || []).map((item) => ({
          description: item.description || '',
          lr_no: item.lr_no || '',
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))
      );
      setCurrentItem({
        description: '',
        lr_no: '',
        qty: 0,
        rate: 0,
        amount: 0,
      });
      setActiveTab('form');
    },
    [consignors]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this invoice?')) return;
      try {
        await apiClient.delete(`/api/daily-entry/invoices/${id}`);
        toast.success('Invoice deleted successfully');
        mutate();
      } catch {
        toast.error('Failed to delete invoice');
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

      if (invoiceItems.length === 0) {
        toast.error('Please add at least one invoice item');
        return;
      }

      try {
        const totals = calculateTotals();
        const payload = {
          consignor_id: parseInt(formData.consignor_id, 10),
          party_name: formData.party_name,
          invoice_date: formData.invoice_date,
          gst_percentage: parseFloat(formData.gst_percentage),
          remarks: formData.remarks,
          items: invoiceItems,
          total_amount: totals.subtotal,
          gst_amount: totals.gstAmount,
          net_amount: totals.netAmount,
        };

        if (editingId) {
          await apiClient.put(`/api/daily-entry/invoices/${editingId}`, payload);
          toast.success('Invoice updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/invoices', payload);
          toast.success('Invoice created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setInvoiceItems([]);
        setCurrentItem({
          description: '',
          lr_no: '',
          qty: 0,
          rate: 0,
          amount: 0,
        });
      } catch (error) {
        toast.error('Failed to save invoice');
      }
    },
    [editingId, formData, invoiceItems, calculateTotals, mutate]
  );

  const totals = calculateTotals();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
              setInvoiceItems([]);
              setConsignorSearch('');
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignor_name">Consignor *</Label>
                  <Input
                    id="consignor_name"
                    list="consignor-options"
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
                      setInvoiceItems([]);
                      setCurrentItem({
                        description: '',
                        lr_no: '',
                        qty: 0,
                        rate: 0,
                        amount: 0,
                      });
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="consignor-options">
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
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="gst_percentage">GST Percentage %</Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    step="0.01"
                    value={formData.gst_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst_percentage: e.target.value,
                      })
                    }
                    placeholder="18"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-4">
                <Input
                  placeholder="L.R. No"
                  list="invoice-lr-options"
                  value={currentItem.lr_no}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    const entry = availableLREntries.find((item) => item.lr_no === value);
                    if (!entry) {
                      setCurrentItem({ ...currentItem, lr_no: value });
                      return;
                    }

                    const qty = (entry.goods_items || []).reduce(
                      (sum, item) => sum + (Number(item.qty) || 0),
                      0
                    );
                    const firstDescription =
                      entry.goods_items.find((item) => item.description)?.description ||
                      'Goods from LR';
                    const rate = qty > 0 ? (Number(entry.freight) || 0) / qty : 0;

                    setCurrentItem({
                      lr_no: entry.lr_no,
                      description: firstDescription,
                      qty,
                      rate,
                      amount: qty * rate,
                    });
                  }}
                />
                <datalist id="invoice-lr-options">
                  {availableLREntries.map((item) => (
                    <option key={item.id} value={item.lr_no} />
                  ))}
                </datalist>
                <Input
                  placeholder="Description"
                  value={currentItem.description}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      description: e.target.value,
                    })
                  }
                  className="col-span-2"
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  value={currentItem.qty}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      qty: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  placeholder="Rate"
                  type="number"
                  value={currentItem.rate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <Button type="button" onClick={addInvoiceItem} className="w-full">
                  Add
                </Button>
              </div>

              {invoiceItems.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>L.R. No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.lr_no}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                          <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeInvoiceItem(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="text-lg font-semibold">
                        ₹{totals.subtotal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        GST ({formData.gst_percentage}%)
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{totals.gstAmount.toFixed(2)}
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
              {editingId ? 'Update Invoice' : 'Create Invoice'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setInvoiceItems([]);
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
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_no}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{invoice.party_name}</TableCell>
                    <TableCell>₹{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>₹{invoice.net_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'issued'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(invoice.id)}
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
