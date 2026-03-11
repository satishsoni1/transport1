'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { generateLRPrintHTML, printHTML } from '@/app/services/print-service';
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
import useSWR, { mutate as globalMutate } from 'swr';
import { transliterateToMarathi } from '@/app/services/marathi';

interface GoodsItem {
  qty: number;
  type: string;
  nature: string;
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
  delivery_address: string;
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  invoice_no: string;
  truck_no: string;
  driver_name: string;
  driver_mobile: string;
  eway_no: string;
  remarks: string;
  goods_items: GoodsItem[];
  status: 'to_pay' | 'paid' | 'tbb';
  created_at: string;
}

interface Consignor {
  id: number;
  name: string;
  name_mr?: string;
  address: string;
  city: string;
  gst_no: string;
  mobile: string;
  contact_person: string;
}

interface Consignee {
  id: number;
  name: string;
  name_mr?: string;
  address: string;
  city: string;
  city_mr?: string;
  gst_no: string;
  mobile: string;
  contact_person: string;
}

interface City {
  id: number;
  city_name: string;
}

interface Driver {
  id: number;
  driver_name: string;
  mobile: string;
}

interface Vehicle {
  id: number;
  vehicle_no: string;
  owner_name: string;
  vehicle_type: string;
}

interface AdminSettings {
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  address?: string;
  gst_no?: string;
  logo_url?: string;
  signature_url?: string;
  transporter_qr_url?: string;
}

const emptyNewConsignor = {
  name: '',
  name_mr: '',
  address: '',
  city: '',
  gst_no: '',
  contact_person: '',
  mobile: '',
};

const emptyNewConsignee = {
  name: '',
  name_mr: '',
  address: '',
  city: '',
  city_mr: '',
  gst_no: '',
  contact_person: '',
  mobile: '',
};

export default function LREntryPage() {
  const { user } = useAuth();
  const qtyInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consignorSearch, setConsignorSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');
  const [showNewConsignor, setShowNewConsignor] = useState(false);
  const [showNewConsignee, setShowNewConsignee] = useState(false);
  const [newConsignor, setNewConsignor] = useState(emptyNewConsignor);
  const [newConsignee, setNewConsignee] = useState(emptyNewConsignee);

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
    status: 'to_pay' as 'to_pay' | 'paid' | 'tbb',
    truck_no: '',
    driver_name: '',
    driver_mobile: '',
    eway_no: '',
    remarks: '',
  });

  const [goodsItems, setGoodsItems] = useState<GoodsItem[]>([]);
  const [currentItem, setCurrentItem] = useState<GoodsItem>({
    qty: 0,
    type: '',
    nature: '',
    weight_kg: 0,
    rate: 0,
    amount: 0,
  });

  const { data: lrEntries = [], mutate: mutateLrEntries } = useSWR<LREntry[]>(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );
  const { data: consignors = [] } = useSWR<Consignor[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: consignees = [] } = useSWR<Consignee[]>(
    '/api/masters/consignees',
    apiClient.get
  );
  const { data: cities = [] } = useSWR<City[]>('/api/masters/cities', apiClient.get);
  const { data: drivers = [] } = useSWR<Driver[]>(
    '/api/masters/drivers',
    apiClient.get
  );
  const { data: vehicles = [] } = useSWR<Vehicle[]>(
    '/api/masters/vehicles',
    apiClient.get
  );
  const { data: settings } = useSWR<AdminSettings>('/api/admin/settings', apiClient.get);

  const selectedConsignor = useMemo(
    () => consignors.find((item) => item.id === Number(formData.consignor_id)),
    [consignors, formData.consignor_id]
  );
  const selectedConsignee = useMemo(
    () => consignees.find((item) => item.id === Number(formData.consignee_id)),
    [consignees, formData.consignee_id]
  );

  useEffect(() => {
    const freightAuto = goodsItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    setFormData((prev) => ({ ...prev, freight: freightAuto.toFixed(2) }));
  }, [goodsItems]);

  const calculateBalance = useCallback(() => {
    const freight = parseFloat(formData.freight) || 0;
    const hamali = parseFloat(formData.hamali) || 0;
    const lrCharge = parseFloat(formData.lr_charge) || 0;
    return freight + hamali + lrCharge;
  }, [formData.freight, formData.hamali, formData.lr_charge]);

  const calculateCurrentAmount = useCallback(() => {
    const qty = currentItem.qty || 0;
    const rate = currentItem.rate || 0;
    return qty * rate;
  }, [currentItem.qty, currentItem.rate]);

  const resetForNew = useCallback(() => {
    setEditingId(null);
    setConsignorSearch('');
    setConsigneeSearch('');
    setShowNewConsignor(false);
    setShowNewConsignee(false);
    setNewConsignor(emptyNewConsignor);
    setNewConsignee(emptyNewConsignee);
    setGoodsItems([]);
    setCurrentItem({ qty: 0, type: '', nature: '', weight_kg: 0, rate: 0, amount: 0 });
    setFormData({
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
      status: 'to_pay',
      truck_no: '',
      driver_name: '',
      driver_mobile: '',
      eway_no: '',
      remarks: '',
    });
    setTimeout(() => qtyInputRef.current?.focus(), 30);
  }, []);

  const addGoodsItem = useCallback(() => {
    if (currentItem.qty <= 0) {
      toast.error('Please enter qty');
      qtyInputRef.current?.focus();
      return;
    }
    if (!currentItem.type.trim()) {
      toast.error('Please enter type');
      return;
    }

    const amount = calculateCurrentAmount();
    setGoodsItems((prev) => [...prev, { ...currentItem, amount }]);
    setCurrentItem({ qty: 0, type: '', nature: '', weight_kg: 0, rate: 0, amount: 0 });
    setTimeout(() => qtyInputRef.current?.focus(), 20);
  }, [calculateCurrentAmount, currentItem]);

  const removeGoodsItem = useCallback((index: number) => {
    setGoodsItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveNewConsignor = useCallback(async () => {
    if (!newConsignor.name || !newConsignor.address || !newConsignor.city) {
      toast.error('Name, address and city are required for new consignor');
      return;
    }
    try {
      const created = await apiClient.post<Consignor>('/api/masters/consignors', newConsignor);
      await Promise.all([
        globalMutate('/api/masters/consignors'),
        globalMutate('/api/masters/cities'),
      ]);
      setConsignorSearch(created.name);
      setFormData((prev) => ({ ...prev, consignor_id: String(created.id), from_city: created.city || prev.from_city }));
      setShowNewConsignor(false);
      setNewConsignor(emptyNewConsignor);
      toast.success('Consignor created and selected');
    } catch {
      toast.error('Failed to create consignor');
    }
  }, [newConsignor]);

  const saveNewConsignee = useCallback(async () => {
    if (!newConsignee.name || !newConsignee.address || !newConsignee.city) {
      toast.error('Name, address and city are required for new consignee');
      return;
    }
    try {
      const created = await apiClient.post<Consignee>('/api/masters/consignees', newConsignee);
      await Promise.all([
        globalMutate('/api/masters/consignees'),
        globalMutate('/api/masters/cities'),
      ]);
      setConsigneeSearch(created.name);
      setFormData((prev) => ({ ...prev, consignee_id: String(created.id), to_city: created.city || prev.to_city }));
      setShowNewConsignee(false);
      setNewConsignee(emptyNewConsignee);
      toast.success('Consignee created and selected');
    } catch {
      toast.error('Failed to create consignee');
    }
  }, [newConsignee]);

  const handleEdit = useCallback(
    (entry: LREntry) => {
      const consignor = consignors.find((item) => item.id === entry.consignor_id);
      const consignee = consignees.find((item) => item.id === entry.consignee_id);

      setEditingId(entry.id);
      setConsignorSearch(consignor?.name || '');
      setConsigneeSearch(consignee?.name || '');
      setFormData({
        consignor_id: String(entry.consignor_id),
        consignee_id: String(entry.consignee_id),
        from_city: entry.from_city || '',
        to_city: entry.to_city || '',
        delivery_address: entry.delivery_address || '',
        freight: String(entry.freight ?? 0),
        hamali: String(entry.hamali ?? 0),
        lr_charge: String(entry.lr_charge ?? 0),
        advance: String(entry.advance ?? 0),
        invoice_no: entry.invoice_no || '',
        status: entry.status || 'to_pay',
        truck_no: entry.truck_no || '',
        driver_name: entry.driver_name || '',
        driver_mobile: entry.driver_mobile || '',
        eway_no: entry.eway_no || '',
        remarks: entry.remarks || '',
      });
      setGoodsItems(
        (entry.goods_items || []).map((item: any) => ({
          qty: Number(item.qty) || 0,
          type: item.type || '',
          nature: item.nature || item.description || '',
          weight_kg: Number(item.weight_kg) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))
      );
      setCurrentItem({ qty: 0, type: '', nature: '', weight_kg: 0, rate: 0, amount: 0 });
      setActiveTab('form');
      setTimeout(() => qtyInputRef.current?.focus(), 20);
    },
    [consignors, consignees]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this L.R. entry?')) return;
      try {
        await apiClient.delete(`/api/daily-entry/lr-entries/${id}`);
        toast.success('L.R. entry deleted successfully');
        mutateLrEntries();
      } catch {
        toast.error('Failed to delete L.R. entry');
      }
    },
    [mutateLrEntries]
  );

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

      const payload = {
        consignor_id: parseInt(formData.consignor_id, 10),
        consignee_id: parseInt(formData.consignee_id, 10),
        from_city: formData.from_city,
        to_city: formData.to_city,
        delivery_address: formData.delivery_address,
        freight: parseFloat(formData.freight) || 0,
        hamali: parseFloat(formData.hamali) || 0,
        lr_charge: parseFloat(formData.lr_charge) || 0,
        advance: parseFloat(formData.advance) || 0,
        invoice_no: formData.invoice_no,
        truck_no: formData.truck_no,
        driver_name: formData.driver_name,
        driver_mobile: formData.driver_mobile,
        eway_no: formData.eway_no,
        remarks: formData.remarks,
        status: formData.status,
        goods_items: goodsItems,
      };

      try {
        if (editingId) {
          await apiClient.put(`/api/daily-entry/lr-entries/${editingId}`, payload);
          toast.success('L.R. updated successfully');
          mutateLrEntries();
          setActiveTab('list');
          return;
        }

        const created = await apiClient.post<LREntry>('/api/daily-entry/lr-entries', payload);
        toast.success('L.R. created successfully');
        mutateLrEntries();

        const consignor = consignors.find((c) => c.id === created.consignor_id) || selectedConsignor;
        const consignee = consignees.find((c) => c.id === created.consignee_id) || selectedConsignee;

        const html = generateLRPrintHTML({
          ...created,
          consignor: consignor?.name || '',
          consignor_name_mr: consignor?.name_mr || transliterateToMarathi(consignor?.name || ''),
          consignor_address: consignor?.address || '',
          consignor_city: consignor?.city || '',
          consignor_mobile: consignor?.mobile || '',
          consignor_gst: consignor?.gst_no || '',
          consignee: consignee?.name || '',
          consignee_name_mr: consignee?.name_mr || transliterateToMarathi(consignee?.name || ''),
          consignee_address: consignee?.address || '',
          consignee_city: consignee?.city || '',
          consignee_city_mr: consignee?.city_mr || transliterateToMarathi(consignee?.city || ''),
          consignee_mobile: consignee?.mobile || '',
          consignee_gst: consignee?.gst_no || '',
          freight_type: created.status,
          company: settings,
        });
        printHTML(html);

        // Auto refresh to fresh new LR screen
        setActiveTab('form');
        resetForNew();
      } catch {
        toast.error('Failed to save L.R.');
      }
    },
    [
      formData,
      goodsItems,
      editingId,
      mutateLrEntries,
      consignors,
      consignees,
      selectedConsignor,
      selectedConsignee,
      settings,
      resetForNew,
    ]
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
              resetForNew();
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
          <Card>
            <CardHeader>
              <CardTitle>Parties Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consignor">Consignor *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewConsignor((v) => !v)}>
                      {showNewConsignor ? 'Close' : 'New Consignor'}
                    </Button>
                  </div>
                  <Input
                    id="consignor"
                    list="consignor-options"
                    value={consignorSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsignorSearch(value);
                      const selected = consignors.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData((prev) => ({
                        ...prev,
                        consignor_id: selected ? String(selected.id) : '',
                        from_city: selected?.city || prev.from_city,
                      }));
                    }}
                    placeholder="Type consignor name"
                  />
                  <datalist id="consignor-options">
                    {consignors.map((item) => (
                      <option key={item.id} value={item.name} label={`${item.city} | ${item.mobile || '-'}`} />
                    ))}
                  </datalist>
                  {selectedConsignor && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p><b>Address:</b> {selectedConsignor.address || '-'}</p>
                      <p><b>City:</b> {selectedConsignor.city || '-'}</p>
                      <p><b>Contact:</b> {selectedConsignor.mobile || '-'}</p>
                      <p><b>GST:</b> {selectedConsignor.gst_no || '-'}</p>
                    </div>
                  )}

                  {showNewConsignor && (
                    <div className="mt-3 p-3 border rounded-md space-y-2">
                      <Input
                        placeholder="Name *"
                        value={newConsignor.name}
                        onChange={(e) =>
                          setNewConsignor({
                            ...newConsignor,
                            name: e.target.value,
                            name_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input
                        placeholder="Name in Marathi"
                        value={newConsignor.name_mr}
                        onChange={(e) =>
                          setNewConsignor({ ...newConsignor, name_mr: e.target.value })
                        }
                      />
                      <Input placeholder="Address *" value={newConsignor.address} onChange={(e) => setNewConsignor({ ...newConsignor, address: e.target.value })} />
                      <Input placeholder="City *" list="lr-city-options" value={newConsignor.city} onChange={(e) => setNewConsignor({ ...newConsignor, city: e.target.value })} />
                      <Input placeholder="Contact No" value={newConsignor.mobile} onChange={(e) => setNewConsignor({ ...newConsignor, mobile: e.target.value })} />
                      <Input placeholder="GST No" value={newConsignor.gst_no} onChange={(e) => setNewConsignor({ ...newConsignor, gst_no: e.target.value })} />
                      <Input placeholder="Contact Person" value={newConsignor.contact_person} onChange={(e) => setNewConsignor({ ...newConsignor, contact_person: e.target.value })} />
                      <Button type="button" className="w-full" onClick={saveNewConsignor}>Save New Consignor</Button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consignee">Consignee *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewConsignee((v) => !v)}>
                      {showNewConsignee ? 'Close' : 'New Consignee'}
                    </Button>
                  </div>
                  <Input
                    id="consignee"
                    list="consignee-options"
                    value={consigneeSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConsigneeSearch(value);
                      const selected = consignees.find(
                        (item) => item.name.toLowerCase() === value.trim().toLowerCase()
                      );
                      setFormData((prev) => ({
                        ...prev,
                        consignee_id: selected ? String(selected.id) : '',
                        to_city: selected?.city || prev.to_city,
                      }));
                    }}
                    placeholder="Type consignee name"
                  />
                  <datalist id="consignee-options">
                    {consignees.map((item) => (
                      <option key={item.id} value={item.name} label={`${item.city} | ${item.mobile || '-'} | ${item.name_mr || '-'}`} />
                    ))}
                  </datalist>
                  {selectedConsignee && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p><b>Name (Marathi):</b> {selectedConsignee.name_mr || '-'}</p>
                      <p><b>City:</b> {selectedConsignee.city || '-'}</p>
                      <p><b>City (Marathi):</b> {selectedConsignee.city_mr || '-'}</p>
                      <p><b>Contact:</b> {selectedConsignee.mobile || '-'}</p>
                      <p><b>GST:</b> {selectedConsignee.gst_no || '-'}</p>
                    </div>
                  )}

                  {showNewConsignee && (
                    <div className="mt-3 p-3 border rounded-md space-y-2">
                      <Input
                        placeholder="Name *"
                        value={newConsignee.name}
                        onChange={(e) =>
                          setNewConsignee({
                            ...newConsignee,
                            name: e.target.value,
                            name_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input placeholder="Name in Marathi" value={newConsignee.name_mr} onChange={(e) => setNewConsignee({ ...newConsignee, name_mr: e.target.value })} />
                      <Input placeholder="Address *" value={newConsignee.address} onChange={(e) => setNewConsignee({ ...newConsignee, address: e.target.value })} />
                      <Input
                        placeholder="City *"
                        list="lr-city-options"
                        value={newConsignee.city}
                        onChange={(e) =>
                          setNewConsignee({
                            ...newConsignee,
                            city: e.target.value,
                            city_mr: transliterateToMarathi(e.target.value),
                          })
                        }
                      />
                      <Input placeholder="City in Marathi" value={newConsignee.city_mr} onChange={(e) => setNewConsignee({ ...newConsignee, city_mr: e.target.value })} />
                      <Input placeholder="Contact No" value={newConsignee.mobile} onChange={(e) => setNewConsignee({ ...newConsignee, mobile: e.target.value })} />
                      <Input placeholder="GST No" value={newConsignee.gst_no} onChange={(e) => setNewConsignee({ ...newConsignee, gst_no: e.target.value })} />
                      <Input placeholder="Contact Person" value={newConsignee.contact_person} onChange={(e) => setNewConsignee({ ...newConsignee, contact_person: e.target.value })} />
                      <Button type="button" className="w-full" onClick={saveNewConsignee}>Save New Consignee</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Route Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City</Label>
                  <Input id="from_city" list="lr-city-options" value={formData.from_city} onChange={(e) => setFormData({ ...formData, from_city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="to_city">To City</Label>
                  <Input id="to_city" list="lr-city-options" value={formData.to_city} onChange={(e) => setFormData({ ...formData, to_city: e.target.value })} />
                </div>
              </div>
              <datalist id="lr-city-options">
                {cities.map((city) => (
                  <option key={city.id} value={city.city_name} />
                ))}
              </datalist>

              <div>
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Input id="delivery_address" value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoice & Freight Type</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_no">Invoice No</Label>
                <Input id="invoice_no" value={formData.invoice_no} onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="status">Freight Type</Label>
                <select
                  id="status"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'to_pay' | 'paid' | 'tbb' })}
                >
                  <option value="to_pay">To Pay</option>
                  <option value="paid">Paid</option>
                  <option value="tbb">TBB</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Goods Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-2 mb-4">
                <Input
                  ref={qtyInputRef}
                  placeholder="Qty"
                  type="number"
                  value={currentItem.qty}
                  onChange={(e) => setCurrentItem({ ...currentItem, qty: parseFloat(e.target.value) || 0 })}
                />
                <Input placeholder="Type" value={currentItem.type} onChange={(e) => setCurrentItem({ ...currentItem, type: e.target.value })} />
                <Input placeholder="Nature" value={currentItem.nature} onChange={(e) => setCurrentItem({ ...currentItem, nature: e.target.value })} />
                <Input placeholder="Weight" type="number" value={currentItem.weight_kg} onChange={(e) => setCurrentItem({ ...currentItem, weight_kg: parseFloat(e.target.value) || 0 })} />
                <Input placeholder="Rate" type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({ ...currentItem, rate: parseFloat(e.target.value) || 0 })} />
                <Input placeholder="Amount" value={calculateCurrentAmount().toFixed(2)} readOnly />
                <Button type="button" onClick={addGoodsItem} className="w-full">Add</Button>
              </div>

              {goodsItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Qty</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goodsItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.nature}</TableCell>
                        <TableCell>{item.weight_kg}</TableCell>
                        <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                        <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => removeGoodsItem(idx)}>
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

          <Card>
            <CardHeader><CardTitle>Freight Terms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="freight">Freight (Auto)</Label>
                  <Input id="freight" value={formData.freight} readOnly />
                </div>
                <div>
                  <Label htmlFor="hamali">Hamali</Label>
                  <Input id="hamali" type="number" step="0.01" value={formData.hamali} onChange={(e) => setFormData({ ...formData, hamali: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lr_charge">L.R. Charge</Label>
                  <Input id="lr_charge" type="number" step="0.01" value={formData.lr_charge} onChange={(e) => setFormData({ ...formData, lr_charge: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="advance">Advance</Label>
                  <Input id="advance" type="number" step="0.01" value={formData.advance} onChange={(e) => setFormData({ ...formData, advance: e.target.value })} />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-semibold">Balance: ₹{calculateBalance().toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vehicle Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="truck_no">Truck Number</Label>
                  <Input
                    id="truck_no"
                    list="lr-vehicle-options"
                    value={formData.truck_no}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      const selected = vehicles.find((item) => item.vehicle_no.toLowerCase() === value.trim().toLowerCase());
                      setFormData({ ...formData, truck_no: selected?.vehicle_no || value });
                    }}
                  />
                  <datalist id="lr-vehicle-options">
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.vehicle_no} label={`${vehicle.owner_name || '-'}${vehicle.vehicle_type ? ` | ${vehicle.vehicle_type}` : ''}`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    list="lr-driver-options"
                    value={formData.driver_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selected = drivers.find((item) => item.driver_name.toLowerCase() === value.trim().toLowerCase());
                      setFormData({ ...formData, driver_name: value, driver_mobile: selected?.mobile || formData.driver_mobile });
                    }}
                  />
                  <datalist id="lr-driver-options">
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.driver_name} label={driver.mobile} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_mobile">Driver Mobile</Label>
                  <Input id="driver_mobile" value={formData.driver_mobile} onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="eway_no">E-Way Number</Label>
                  <Input id="eway_no" value={formData.eway_no} onChange={(e) => setFormData({ ...formData, eway_no: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{editingId ? 'Update L.R.' : 'Create L.R.'}</Button>
            <Button type="button" variant="outline" onClick={() => { setActiveTab('list'); setEditingId(null); }}>
              Back to List
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
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lrEntries.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-4">No L.R. entries found</TableCell></TableRow>
              ) : (
                lrEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.lr_no}</TableCell>
                    <TableCell>{new Date(entry.lr_date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.from_city}</TableCell>
                    <TableCell>{entry.to_city}</TableCell>
                    <TableCell>₹{entry.freight.toFixed(2)}</TableCell>
                    <TableCell>{entry.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)}><Trash2 className="w-4 h-4" /></Button>
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
