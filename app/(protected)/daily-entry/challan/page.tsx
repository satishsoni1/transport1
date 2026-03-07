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

interface ChallanLR {
  lr_no: string;
  lr_date: string;
  city: string;
  consignee: string;
  packages: number;
  freight: number;
  status: string;
}

interface Challan {
  id: number;
  challan_no: string;
  challan_date: string;
  from_city: string;
  to_city: string;
  truck_no: string;
  driver_name: string;
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
    owner_name: '',
    eway_no: '',
    remarks: '',
  });

  const [selectedLRs, setSelectedLRs] = useState<ChallanLR[]>([]);
  const [availableLRs, setAvailableLRs] = useState<any[]>([]);
  const [newLRInput, setNewLRInput] = useState('');

  const { data: challans = [], mutate } = useSWR(
    '/api/daily-entry/challans',
    apiClient.get
  );

  const addLRToChallan = useCallback(() => {
    if (!newLRInput) {
      toast.error('Please enter L.R. number');
      return;
    }

    // Mock adding LR - in production, would search database
    const newLR: ChallanLR = {
      lr_no: newLRInput,
      lr_date: new Date().toISOString(),
      city: 'Sample City',
      consignee: 'Sample Consignee',
      packages: 1,
      freight: 500,
      status: 'to_pay',
    };

    setSelectedLRs([...selectedLRs, newLR]);
    setNewLRInput('');
    toast.success('L.R. added to challan');
  }, [newLRInput, selectedLRs]);

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
      totalToPay: selectedLRs.filter((lr) => lr.status === 'to_pay').length,
      totalPaid: selectedLRs.filter((lr) => lr.status === 'paid').length,
    };
  }, [selectedLRs]);

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
          owner_name: formData.owner_name,
          eway_no: formData.eway_no,
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
                    value={formData.from_city}
                    onChange={(e) =>
                      setFormData({ ...formData, from_city: e.target.value })
                    }
                    placeholder="Origin city"
                  />
                </div>
                <div>
                  <Label htmlFor="to_city">To City *</Label>
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
                  value={newLRInput}
                  onChange={(e) => setNewLRInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLRToChallan();
                    }
                  }}
                />
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
                      <p className="text-lg font-semibold">{totals.totalToPay}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-lg font-semibold">{totals.totalPaid}</p>
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
