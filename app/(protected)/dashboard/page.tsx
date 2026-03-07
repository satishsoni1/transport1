'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Truck, FileText, DollarSign, Users } from 'lucide-react';

interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
  truck_no: string;
}

interface Invoice {
  id: number;
  invoice_date: string;
  total_amount: number;
}

interface Vehicle {
  id: number;
  status: 'active' | 'inactive';
}

interface Party {
  id: number;
}

interface Challan {
  id: number;
  truck_no: string;
  status: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

function formatMonth(d: Date) {
  return d.toLocaleString('en-US', { month: 'short' });
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: lrEntries = [] } = useSWR<LREntry[]>(
    '/api/daily-entry/lr-entries',
    apiClient.get
  );
  const { data: invoices = [] } = useSWR<Invoice[]>(
    '/api/daily-entry/invoices',
    apiClient.get
  );
  const { data: vehicles = [] } = useSWR<Vehicle[]>(
    '/api/masters/vehicles',
    apiClient.get
  );
  const { data: consignors = [] } = useSWR<Party[]>(
    '/api/masters/consignors',
    apiClient.get
  );
  const { data: consignees = [] } = useSWR<Party[]>(
    '/api/masters/consignees',
    apiClient.get
  );
  const { data: challans = [] } = useSWR<Challan[]>(
    '/api/daily-entry/challans',
    apiClient.get
  );

  const totalFreight = useMemo(
    () => lrEntries.reduce((sum, item) => sum + (Number(item.freight) || 0), 0),
    [lrEntries]
  );

  const pendingSummary = useMemo(() => {
    const pendingItems = lrEntries.filter((item) => item.status === 'to_pay');
    return {
      amount: pendingItems.reduce((sum, item) => sum + (Number(item.freight) || 0), 0),
      count: pendingItems.length,
    };
  }, [lrEntries]);

  const activeVehicles = useMemo(
    () => vehicles.filter((item) => item.status !== 'inactive').length,
    [vehicles]
  );

  const onRouteCount = useMemo(() => {
    const truckSet = new Set(
      challans
        .filter((item) => item.status === 'open' && item.truck_no)
        .map((item) => item.truck_no)
    );
    return truckSet.size;
  }, [challans]);

  const totalParties = consignors.length + consignees.length;

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; freight: number; order: number }>();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map.set(key, {
        month: formatMonth(d),
        revenue: 0,
        freight: 0,
        order: d.getFullYear() * 100 + d.getMonth(),
      });
    }

    for (const inv of invoices) {
      const d = new Date(inv.invoice_date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const existing = map.get(key);
      if (existing) existing.revenue += Number(inv.total_amount) || 0;
    }

    for (const lr of lrEntries) {
      const d = new Date(lr.lr_date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const existing = map.get(key);
      if (existing) existing.freight += Number(lr.freight) || 0;
    }

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [invoices, lrEntries]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const lr of lrEntries) {
      const city = lr.to_city || 'Unknown';
      map.set(city, (map.get(city) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [lrEntries]);

  const recentLrEntries = lrEntries.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName}</h1>
        <p className="text-muted-foreground mt-1">Transport Management System Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Freight</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totalFreight.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">{lrEntries.length} LR entries total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {pendingSummary.amount.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingSummary.count} LR marked as to_pay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">{onRouteCount} currently on route</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParties}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {consignors.length} consignors + {consignees.length} consignees
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Invoice revenue and LR freight trends (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => `Rs ${Number(v).toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" />
                <Bar dataKey="freight" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>City Distribution</CardTitle>
            <CardDescription>Dispatch by destination</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {cityData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} LR`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent L.R. Entries</CardTitle>
            <CardDescription>Last 5 lorry receipts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLrEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No L.R. entries found</p>
              ) : (
                recentLrEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-medium">{entry.lr_no}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.from_city || '-'} to {entry.to_city || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs {(Number(entry.freight) || 0).toLocaleString('en-IN')}</p>
                      <p
                        className={`text-sm ${
                          entry.status === 'paid'
                            ? 'text-green-600'
                            : entry.status === 'tbb'
                              ? 'text-blue-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {entry.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/daily-entry/lr-entry"
                className="block w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-medium transition"
              >
                New L.R. Entry
              </Link>
              <Link
                href="/daily-entry/challan"
                className="block w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-medium transition"
              >
                Create Challan
              </Link>
              <Link
                href="/daily-entry/receipt"
                className="block w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md font-medium transition"
              >
                Record Receipt
              </Link>
              <Link
                href="/daily-entry/invoice"
                className="block w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-md font-medium transition"
              >
                Generate Invoice
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
