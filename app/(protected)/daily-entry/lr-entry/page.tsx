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

interface GoodsItem {
  description: string;
  qty: number;
  type: string;
  weight_kg: number;
  rate: number;
  amount: number;
}

interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  consignee_id: number;
  from_city: string;
  to_city: string;
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  status: 'to_pay' | 'paid' | 'tbb';
  created_at: string;
}

export default function LREntryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    consignor_id: '',
    consignee_id: '',
    from_city: '',
    to_city: '',
    delivery_address: '',
    freight: '0',
    hamali: '0',
    lr_charge: '0',
    advance: '0',
    invoice_no: '',
    invoice_date: '',
    truck_no: '',
    driver_name: '',
    driver_mobile: '',
    eway_no: '',
    remarks: '',
  });

  const [goodsItems, setGoodsItems] = useState<GoodsItem[]>([]);
  const [currentItem, setCurrentItem] = useState<GoodsItem>({
    description: '',
    qty: 0,
    type: '',
    weight_kg: 0,
    rate: 0,
    amount: 0,
  });

  const { data: lrEntries = [], mutate } = useSWR(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );

  const calculateBalance = useCallback(() => {
    const freight = parseFloat(formData.freight) || 0;
    const advance = parseFloat(formData.advance) || 0;
    return freight - advance;
  }, [formData.freight, formData.advance]);

  const calculateAmount = useCallback(() => {
    const qty = currentItem.qty || 0;
    const rate = currentItem.rate || 0;
    return qty * rate;
  }, [currentItem.qty, currentItem.rate]);

  const addGoodsItem = useCallback(() => {
    if (!currentItem.description) {
      toast.error('Please enter item description');
      return;
    }

    setGoodsItems([...goodsItems, { ...currentItem, amount: calculateAmount() }]);
    setCurrentItem({
      description: '',
      qty: 0,
      type: '',
      weight_kg: 0,
      rate: 0,
      amount: 0,
    });
    toast.success('Item added');
  }, [currentItem, goodsItems, calculateAmount]);

  const removeGoodsItem = useCallback((index: number) => {
    setGoodsItems(goodsItems.filter((_, i) => i !== index));
  }, [goodsItems]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.consignor_id || !formData.consignee_id) {
        toast.error('Please select consignor and consignee');
        return;
      }

      if (goodsItems.length === 0) {
        toast.error('Please add at least one goods item');
        return;
      }

      try {
        const payload = {
          consignor_id: parseInt(formData.consignor_id),
          consignee_id: parseInt(formData.consignee_id),
          from_city: formData.from_city,
          to_city: formData.to_city,
          delivery_address: formData.delivery_address,
          freight: parseFloat(formData.freight),
          hamali: parseFloat(formData.hamali),
          lr_charge: parseFloat(formData.lr_charge),
          advance: parseFloat(formData.advance),
          invoice_no: formData.invoice_no,
          invoice_date: formData.invoice_date,
          truck_no: formData.truck_no,
          driver_name: formData.driver_name,
          driver_mobile: formData.driver_mobile,
          eway_no: formData.eway_no,
          remarks: formData.remarks,
          goods_items: goodsItems,
        };

        if (editingId) {
          await apiClient.put(`/api/daily-entry/lr-entries/${editingId}`, payload);
          toast.success('L.R. updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/lr-entries', payload);
          toast.success('L.R. created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setGoodsItems([]);
      } catch (error) {
        toast.error('Failed to save L.R.');
      }
    },
    [editingId, formData, goodsItems, mutate]
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">L.R. Entry</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New L.R.
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle>Parties Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignor">Consignor *</Label>
                  <Input
                    id="consignor"
                    type="number"
                    value={formData.consignor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, consignor_id: e.target.value })
                    }
                    placeholder="Consignor ID"
                  />
                </div>
                <div>
                  <Label htmlFor="consignee">Consignee *</Label>
                  <Input
                    id="consignee"
                    type="number"
                    value={formData.consignee_id}
                    onChange={(e) =>
                      setFormData({ ...formData, consignee_id: e.target.value })
                    }
                    placeholder="Consignee ID"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Section */}
          <Card>
            <CardHeader>
              <CardTitle>Route Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City</Label>
                  <Input
                    id="from_city"
                    value={formData.from_city}
                    onChange={(e) =>
                      setFormData({ ...formData, from_city: e.target.value })
                    }
                    placeholder="Origin city"
                  />
                </div>
                <div>
                  <Label htmlFor="to_city">To City</Label>
                  <Input
                    id="to_city"
                    value={formData.to_city}
                    onChange={(e) =>
                      setFormData({ ...formData, to_city: e.target.value })
                    }
                    placeholder="Destination city"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Input
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_address: e.target.value,
                    })
                  }
                  placeholder="Full delivery address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Goods Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Goods Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-4">
                <Input
                  placeholder="Description"
                  value={currentItem.description}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, description: e.target.value })
                  }
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
                  placeholder="Type"
                  value={currentItem.type}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, type: e.target.value })
                  }
                />
                <Input
                  placeholder="Weight KG"
                  type="number"
                  value={currentItem.weight_kg}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      weight_kg: parseFloat(e.target.value) || 0,
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
                <Button
                  type="button"
                  onClick={addGoodsItem}
                  className="w-full"
                >
                  Add
                </Button>
              </div>

              {goodsItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Weight KG</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goodsItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.weight_kg}</TableCell>
                        <TableCell>₹{item.rate}</TableCell>
                        <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeGoodsItem(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Freight Terms Section */}
          <Card>
            <CardHeader>
              <CardTitle>Freight Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="freight">Freight</Label>
                  <Input
                    id="freight"
                    type="number"
                    step="0.01"
                    value={formData.freight}
                    onChange={(e) =>
                      setFormData({ ...formData, freight: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="hamali">Hamali</Label>
                  <Input
                    id="hamali"
                    type="number"
                    step="0.01"
                    value={formData.hamali}
                    onChange={(e) =>
                      setFormData({ ...formData, hamali: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="lr_charge">L.R. Charge</Label>
                  <Input
                    id="lr_charge"
                    type="number"
                    step="0.01"
                    value={formData.lr_charge}
                    onChange={(e) =>
                      setFormData({ ...formData, lr_charge: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="advance">Advance</Label>
                  <Input
                    id="advance"
                    type="number"
                    step="0.01"
                    value={formData.advance}
                    onChange={(e) =>
                      setFormData({ ...formData, advance: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-semibold">
                  Balance: ₹{calculateBalance().toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle & Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="truck_no">Truck Number</Label>
                  <Input
                    id="truck_no"
                    value={formData.truck_no}
                    onChange={(e) =>
                      setFormData({ ...formData, truck_no: e.target.value })
                    }
                    placeholder="Vehicle number"
                  />
                </div>
                <div>
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    value={formData.driver_name}
                    onChange={(e) =>
                      setFormData({ ...formData, driver_name: e.target.value })
                    }
                    placeholder="Driver name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_mobile">Driver Mobile</Label>
                  <Input
                    id="driver_mobile"
                    value={formData.driver_mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driver_mobile: e.target.value,
                      })
                    }
                    placeholder="Driver mobile"
                  />
                </div>
                <div>
                  <Label htmlFor="eway_no">E-Way Number</Label>
                  <Input
                    id="eway_no"
                    value={formData.eway_no}
                    onChange={(e) =>
                      setFormData({ ...formData, eway_no: e.target.value })
                    }
                    placeholder="E-way number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_no">Invoice Number</Label>
                  <Input
                    id="invoice_no"
                    value={formData.invoice_no}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_no: e.target.value })
                    }
                    placeholder="Invoice number"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_date">Invoice Date</Label>
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
              </div>
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
              {editingId ? 'Update L.R.' : 'Create L.R.'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setGoodsItems([]);
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
                <TableHead>L.R. No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Freight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lrEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No L.R. entries found
                  </TableCell>
                </TableRow>
              ) : (
                lrEntries.map((entry: LREntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.lr_no}</TableCell>
                    <TableCell>{new Date(entry.lr_date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.from_city}</TableCell>
                    <TableCell>{entry.to_city}</TableCell>
                    <TableCell>₹{entry.freight.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          entry.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {entry.status}
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
