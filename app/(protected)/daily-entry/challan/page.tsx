'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import useSWR from 'swr';

interface ChallanLR {
  id: number;
  lr_no: string;
  lr_date: string;
  city: string;
  consignee: string;
  packages: number;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
  remarks?: string;
  return_status?: 'normal' | 'returned';
  return_remark?: string;
  previous_challan_no?: string;
}

interface LREntryApi {
  id: number;
  lr_no: string;
  lr_date: string;
  consignee_id: number;
  to_city: string;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
  remarks?: string;
  return_status?: 'normal' | 'returned';
  return_remark?: string;
  goods_items: Array<{ qty?: number }>;
}

interface Consignee {
  id: number;
  name: string;
}

interface City {
  id: number;
  city_name: string;
}

interface Driver {
  id: number;
  driver_name: string;
  mobile: string;
  address: string;
  vehicle_no: string;
  license_no: string;
  license_valid_from: string;
  license_valid_to: string;
  renewal_date: string;
  passport_photo_url: string;
  thumb_image_url: string;
  status: 'active' | 'inactive';
}

interface Vehicle {
  id: number;
  vehicle_no: string;
  owner_name: string;
  vehicle_type: string;
}

interface Challan {
  id: number;
  challan_no: string;
  challan_date: string;
  from_city: string;
  to_city: string;
  truck_no: string;
  driver_name: string;
  driver_mobile: string;
  driver_license_no?: string;
  driver_address?: string;
  owner_name: string;
  eway_no: string;
  engine_reading?: number;
  short_reading?: number;
  rate_per_km?: number;
  reading_total?: number;
  hamali?: number;
  advance?: number;
  remarks: string;
  lr_list: ChallanLR[];
  total_freight: number;
  total_to_pay: number;
  total_paid: number;
  status: string;
  created_at: string;
}

export default function ChallanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    from_city: '',
    to_city: '',
    truck_no: '',
    driver_name: '',
    driver_mobile: '',
    driver_license_no: '',
    driver_address: '',
    owner_name: '',
    eway_no: '',
    engine_reading: '0',
    short_reading: '0',
    rate_per_km: '0',
    reading_total: '0',
    hamali: '0',
    advance: '0',
    remarks: '',
  });

  const [selectedLRs, setSelectedLRs] = useState<ChallanLR[]>([]);
  const [newLRInput, setNewLRInput] = useState('');

  const { data: challans = [], mutate } = useSWR<Challan[]>(
    '/api/daily-entry/challans',
    apiClient.get
  );
  const { data: lrEntries = [] } = useSWR<LREntryApi[]>(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );
  const { data: consignees = [] } = useSWR<Consignee[]>(
    '/api/masters/consignees',
    apiClient.get
  );
  const { data: cities = [] } = useSWR<City[]>(
    '/api/masters/cities',
    apiClient.get
  );
  const { data: drivers = [] } = useSWR<Driver[]>(
    '/api/masters/drivers',
    apiClient.get
  );
  const { data: vehicles = [] } = useSWR<Vehicle[]>(
    '/api/masters/vehicles',
    apiClient.get
  );

  const selectedDriver = useMemo(
    () =>
      drivers.find(
        (item) =>
          item.driver_name.toLowerCase() === formData.driver_name.trim().toLowerCase()
      ),
    [drivers, formData.driver_name]
  );

  useEffect(() => {
    const total =
      (parseFloat(formData.short_reading) || 0) * (parseFloat(formData.rate_per_km) || 0);
    setFormData((prev) => {
      const next = total.toFixed(2);
      if (prev.reading_total === next) return prev;
      return { ...prev, reading_total: next };
    });
  }, [formData.short_reading, formData.rate_per_km]);

  const addLRToChallan = useCallback(() => {
    const lrNo = newLRInput.trim();
    if (!lrNo) {
      toast.error('Please enter L.R. number');
      return;
    }

    if (selectedLRs.some((item) => item.lr_no === lrNo)) {
      toast.error('This L.R. is already added');
      return;
    }

    const lrEntry = lrEntries.find((item) => item.lr_no === lrNo);
    if (!lrEntry) {
      toast.error('L.R. not found');
      return;
    }

    const consigneeName =
      consignees.find((item) => item.id === lrEntry.consignee_id)?.name ||
      `Consignee #${lrEntry.consignee_id}`;
    const packages = (lrEntry.goods_items || []).reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0
    );

    const previousChallan = challans.find((challan) =>
      (challan.lr_list || []).some((item) => item.lr_no === lrNo)
    );

    const newLR: ChallanLR = {
      id: lrEntry.id,
      lr_no: lrEntry.lr_no,
      lr_date: lrEntry.lr_date,
      city: lrEntry.to_city || '-',
      consignee: consigneeName,
      packages,
      freight: Number(lrEntry.freight) || 0,
      status: lrEntry.status,
      remarks: lrEntry.remarks || '',
      return_status: lrEntry.return_status || 'normal',
      return_remark: lrEntry.return_remark || '',
      previous_challan_no: previousChallan?.challan_no || '',
    };

    setSelectedLRs([...selectedLRs, newLR]);
    setNewLRInput('');
    toast.success('L.R. added to challan');
  }, [newLRInput, selectedLRs, lrEntries, consignees]);

  const removeLRFromChallan = useCallback(
    (index: number) => {
      setSelectedLRs(selectedLRs.filter((_, i) => i !== index));
    },
    [selectedLRs]
  );

  const calculateTotals = useCallback(() => {
    return {
      totalPackages: selectedLRs.reduce((sum, lr) => sum + lr.packages, 0),
      totalFreight: selectedLRs.reduce((sum, lr) => sum + lr.freight, 0),
      totalToPay: selectedLRs
        .filter((lr) => lr.status === 'to_pay')
        .reduce((sum, lr) => sum + lr.freight, 0),
      totalPaid: selectedLRs
        .filter((lr) => lr.status === 'paid')
        .reduce((sum, lr) => sum + lr.freight, 0),
    };
  }, [selectedLRs]);

  const handleEdit = useCallback((challan: Challan) => {
    setEditingId(challan.id);
    setFormData({
      from_city: challan.from_city || '',
      to_city: challan.to_city || '',
      truck_no: challan.truck_no || '',
      driver_name: challan.driver_name || '',
      driver_mobile: challan.driver_mobile || '',
      driver_license_no: (challan as any).driver_license_no || '',
      driver_address: (challan as any).driver_address || '',
      owner_name: challan.owner_name || '',
      eway_no: challan.eway_no || '',
      engine_reading: String((challan as any).engine_reading ?? 0),
      short_reading: String((challan as any).short_reading ?? 0),
      rate_per_km: String((challan as any).rate_per_km ?? 0),
      reading_total: String((challan as any).reading_total ?? 0),
      hamali: String((challan as any).hamali ?? 0),
      advance: String((challan as any).advance ?? 0),
      remarks: challan.remarks || '',
    });
    setSelectedLRs(
      (challan.lr_list || []).map((item) => ({
        id: Number(item.id) || 0,
        lr_no: item.lr_no || '',
        lr_date: item.lr_date || '',
        city: item.city || '',
        consignee: item.consignee || '',
        packages: Number(item.packages) || 0,
        freight: Number(item.freight) || 0,
        remarks: item.remarks || '',
        return_status: item.return_status || 'normal',
        return_remark: item.return_remark || '',
        previous_challan_no: item.previous_challan_no || '',
        status:
          item.status === 'paid' || item.status === 'tbb' || item.status === 'to_pay'
            ? item.status
            : 'to_pay',
      }))
    );
    setNewLRInput('');
    setActiveTab('form');
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this challan?')) return;
      try {
        await apiClient.delete(`/api/daily-entry/challans/${id}`);
        toast.success('Challan deleted successfully');
        mutate();
      } catch {
        toast.error('Failed to delete challan');
      }
    },
    [mutate]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.from_city || !formData.to_city) {
        toast.error('Please fill required fields');
        return;
      }

      if (selectedLRs.length === 0) {
        toast.error('Please add at least one L.R. to the challan');
        return;
      }

      try {
        const payload = {
          from_city: formData.from_city,
          to_city: formData.to_city,
          truck_no: formData.truck_no,
          driver_name: formData.driver_name,
          driver_mobile: formData.driver_mobile,
          driver_license_no: formData.driver_license_no,
          driver_address: formData.driver_address,
          owner_name: formData.owner_name,
          eway_no: formData.eway_no,
          engine_reading: parseFloat(formData.engine_reading) || 0,
          short_reading: parseFloat(formData.short_reading) || 0,
          rate_per_km: parseFloat(formData.rate_per_km) || 0,
          reading_total: parseFloat(formData.reading_total) || 0,
          hamali: parseFloat(formData.hamali) || 0,
          advance: parseFloat(formData.advance) || 0,
          remarks: formData.remarks,
          lr_list: selectedLRs,
        };

        if (editingId) {
          await apiClient.put(`/api/daily-entry/challans/${editingId}`, payload);
          toast.success('Challan updated successfully');
        } else {
          await apiClient.post('/api/daily-entry/challans', payload);
          toast.success('Challan created successfully');
        }

        mutate();
        setActiveTab('list');
        setEditingId(null);
        setSelectedLRs([]);
      } catch (error) {
        toast.error('Failed to save challan');
      }
    },
    [editingId, formData, selectedLRs, mutate]
  );

  const totals = calculateTotals();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Goods Despatch / Challan</h1>
        {activeTab === 'list' && (
          <Button
            onClick={() => {
              setActiveTab('form');
              setEditingId(null);
              setSelectedLRs([]);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Challan
          </Button>
        )}
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle>Challan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_city">From City *</Label>
                  <Input
                    id="from_city"
                    list="challan-from-city-options"
                    value={formData.from_city}
                    onChange={(e) =>
                      setFormData({ ...formData, from_city: e.target.value })
                    }
                    placeholder="Origin city"
                  />
                  <datalist id="challan-from-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="to_city">To City *</Label>
                  <Input
                    id="to_city"
                    list="challan-to-city-options"
                    value={formData.to_city}
                    onChange={(e) =>
                      setFormData({ ...formData, to_city: e.target.value })
                    }
                    placeholder="Destination city"
                  />
                  <datalist id="challan-to-city-options">
                    {cities.map((city) => (
                      <option key={city.id} value={city.city_name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Section */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle & Driver Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="truck_no">Truck Number</Label>
                  <Input
                    id="truck_no"
                    list="challan-vehicle-options"
                    value={formData.truck_no}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      const selected = vehicles.find(
                        (item) =>
                          item.vehicle_no.toLowerCase() ===
                          value.trim().toLowerCase()
                      );
                      setFormData({
                        ...formData,
                        truck_no: selected?.vehicle_no || value,
                        owner_name:
                          selected?.owner_name !== undefined &&
                          selected.owner_name !== ''
                            ? selected.owner_name
                            : formData.owner_name,
                      });
                    }}
                    placeholder="Vehicle number"
                  />
                  <datalist id="challan-vehicle-options">
                    {vehicles.map((vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.vehicle_no}
                        label={`${vehicle.owner_name || '-'}${vehicle.vehicle_type ? ` | ${vehicle.vehicle_type}` : ''}`}
                      />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    list="challan-driver-options"
                    value={formData.driver_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selected = drivers.find(
                        (item) =>
                          item.driver_name.toLowerCase() ===
                          value.trim().toLowerCase()
                      );
                      setFormData({
                        ...formData,
                        driver_name: value,
                        driver_mobile: selected?.mobile || formData.driver_mobile,
                        driver_license_no: selected?.license_no || formData.driver_license_no,
                        driver_address: selected?.address || formData.driver_address,
                        truck_no: selected?.vehicle_no || formData.truck_no,
                      });
                    }}
                    placeholder="Driver name"
                  />
                  <datalist id="challan-driver-options">
                    {drivers.map((driver) => (
                      <option
                        key={driver.id}
                        value={driver.driver_name}
                        label={driver.mobile}
                      />
                    ))}
                  </datalist>
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
                  <Label htmlFor="driver_license_no">License No</Label>
                  <Input
                    id="driver_license_no"
                    value={formData.driver_license_no}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driver_license_no: e.target.value,
                      })
                    }
                    placeholder="License no"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_address">Driver Address</Label>
                  <Textarea
                    id="driver_address"
                    value={formData.driver_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driver_address: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Driver address"
                  />
                </div>
                <div>
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        owner_name: e.target.value,
                      })
                    }
                    placeholder="Vehicle owner name"
                  />
                </div>
              </div>
              {selectedDriver ? (
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-slate-50 p-4">
                  <div className="space-y-1 text-sm">
                    <p><b>Vehicle No:</b> {selectedDriver.vehicle_no || '-'}</p>
                    <p><b>Valid:</b> {selectedDriver.license_valid_from || '-'} to {selectedDriver.license_valid_to || '-'}</p>
                    <p><b>Renewal:</b> {selectedDriver.renewal_date || '-'}</p>
                    <p><b>Status:</b> {selectedDriver.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedDriver.passport_photo_url ? (
                      <img src={selectedDriver.passport_photo_url} alt="Driver" className="h-20 w-16 rounded border object-cover" />
                    ) : null}
                    {selectedDriver.thumb_image_url ? (
                      <img src={selectedDriver.thumb_image_url} alt="Thumb" className="h-20 w-16 rounded border object-cover" />
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                <div>
                  <Label htmlFor="engine_reading">Engine Reading</Label>
                  <Input id="engine_reading" type="number" value={formData.engine_reading} onChange={(e) => setFormData({ ...formData, engine_reading: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="short_reading">Short Reading</Label>
                  <Input id="short_reading" type="number" value={formData.short_reading} onChange={(e) => setFormData({ ...formData, short_reading: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="rate_per_km">Rate/KM</Label>
                  <Input id="rate_per_km" type="number" value={formData.rate_per_km} onChange={(e) => setFormData({ ...formData, rate_per_km: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="reading_total">Total</Label>
                  <Input id="reading_total" value={formData.reading_total} readOnly />
                </div>
                <div>
                  <Label htmlFor="hamali">Hamali</Label>
                  <Input id="hamali" type="number" value={formData.hamali} onChange={(e) => setFormData({ ...formData, hamali: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="advance">Advance</Label>
                  <Input id="advance" type="number" value={formData.advance} onChange={(e) => setFormData({ ...formData, advance: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* L.R. Selection Section */}
          <Card>
            <CardHeader>
              <CardTitle>L.R. List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter L.R. number"
                  list="available-lr-options"
                  value={newLRInput}
                  onChange={(e) => setNewLRInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLRToChallan();
                    }
                  }}
                />
                <datalist id="available-lr-options">
                  {lrEntries
                    .filter(
                      (item) =>
                        !selectedLRs.some(
                          (selected) => selected.lr_no === item.lr_no
                        )
                    )
                    .map((item) => (
                      <option key={item.id} value={item.lr_no} />
                    ))}
                </datalist>
                <Button
                  type="button"
                  onClick={addLRToChallan}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add L.R.
                </Button>
              </div>

              {selectedLRs.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>L.R. No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Consignee</TableHead>
                        <TableHead>Packages</TableHead>
                        <TableHead>Freight</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLRs.map((lr, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{lr.lr_no}</TableCell>
                          <TableCell>
                            {new Date(lr.lr_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{lr.city}</TableCell>
                          <TableCell>{lr.consignee}</TableCell>
                          <TableCell>{lr.packages}</TableCell>
                          <TableCell>₹{lr.freight.toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                lr.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {lr.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {lr.return_status === 'returned' ? (
                              <div className="space-y-1 text-xs font-semibold text-red-600">
                                <p>Return: {lr.return_remark || '-'}</p>
                                {lr.previous_challan_no ? <p>Prev Challan: {lr.previous_challan_no}</p> : null}
                              </div>
                            ) : lr.remarks ? (
                              <span className="text-xs font-semibold text-red-600">{lr.remarks}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLRFromChallan(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-gray-600">Total Packages</p>
                      <p className="text-lg font-semibold">{totals.totalPackages}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Freight</p>
                      <p className="text-lg font-semibold">₹{totals.totalFreight}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">To Pay</p>
                      <p className="text-lg font-semibold">₹{totals.totalToPay.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-lg font-semibold">₹{totals.totalPaid.toFixed(2)}</p>
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
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  rows={3}
                  placeholder="Any additional remarks"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingId ? 'Update Challan' : 'Create Challan'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('list');
                setEditingId(null);
                setSelectedLRs([]);
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
                <TableHead>Challan No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Total Freight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No challans found
                  </TableCell>
                </TableRow>
              ) : (
                challans.map((challan: Challan) => (
                  <TableRow key={challan.id}>
                    <TableCell className="font-medium">
                      {challan.challan_no}
                    </TableCell>
                    <TableCell>
                      {new Date(challan.challan_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{challan.from_city}</TableCell>
                    <TableCell>{challan.to_city}</TableCell>
                    <TableCell>{challan.truck_no}</TableCell>
                    <TableCell>₹{challan.total_freight.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          challan.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {challan.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(challan)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(challan.id)}
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
