'use client';

import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Filter } from 'lucide-react';

interface LREntry {
  id?: number;
  lr_no?: string;
  lr_date: string;
  consignor_id?: number;
  consignee_id?: number;
  to_city: string;
  from_city?: string;
  invoice_no?: string;
  freight: number;
  status: 'to_pay' | 'paid' | 'tbb';
}

interface Invoice {
  invoice_no?: string;
  invoice_date: string;
  consignor_id: number;
  total_amount: number;
}

interface Consignee {
  id: number;
  name: string;
}

interface Consignor {
  id: number;
  name: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function inRange(dateStr: string, from: string, to: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const fromDate = new Date(from);
    if (date < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }
  return true;
}

function toCSV(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'lr' | 'city' | 'consignor' | 'payment'>('lr');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [appliedRange, setAppliedRange] = useState(dateRange);

  const { data: lrEntries = [] } = useSWR<LREntry[]>('/api/daily-entry/lr-entries', apiClient.get);
  const { data: invoices = [] } = useSWR<Invoice[]>('/api/daily-entry/invoices', apiClient.get);
  const { data: consignors = [] } = useSWR<Consignor[]>('/api/masters/consignors', apiClient.get);
  const { data: consignees = [] } = useSWR<Consignee[]>('/api/masters/consignees', apiClient.get);

  const filteredLR = useMemo(
    () => lrEntries.filter((item) => inRange(item.lr_date, appliedRange.from, appliedRange.to)),
    [lrEntries, appliedRange]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((item) =>
        inRange(item.invoice_date, appliedRange.from, appliedRange.to)
      ),
    [invoices, appliedRange]
  );

  const monthlyLRData = useMemo(() => {
    const map = new Map<string, { month: string; count: number; amount: number; sortKey: number }>();
    for (const row of filteredLR) {
      const d = new Date(row.lr_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const sortKey = d.getFullYear() * 100 + (d.getMonth() + 1);
      const current = map.get(key) || { month: monthLabel, count: 0, amount: 0, sortKey };
      current.count += 1;
      current.amount += Number(row.freight) || 0;
      map.set(key, current);
    }
    return Array.from(map.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ month, count, amount }) => ({ month, count, amount }));
  }, [filteredLR]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredLR) {
      const city = row.to_city || 'Unknown';
      map.set(city, (map.get(city) || 0) + (Number(row.freight) || 0));
    }
    return Array.from(map.entries())
      .map(([city, amount]) => ({ city, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredLR]);

  const consignorData = useMemo(() => {
    const nameById = new Map(consignors.map((c) => [c.id, c.name]));
    const map = new Map<string, { name: string; invoices: number; amount: number }>();
    for (const inv of filteredInvoices) {
      const name = nameById.get(inv.consignor_id) || `Consignor #${inv.consignor_id}`;
      const current = map.get(name) || { name, invoices: 0, amount: 0 };
      current.invoices += 1;
      current.amount += Number(inv.total_amount) || 0;
      map.set(name, current);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [filteredInvoices, consignors]);

  const paymentData = useMemo(() => {
    const totals = {
      paid: 0,
      to_pay: 0,
      tbb: 0,
    };
    for (const row of filteredLR) {
      const amount = Number(row.freight) || 0;
      if (row.status === 'paid') totals.paid += amount;
      else if (row.status === 'tbb') totals.tbb += amount;
      else totals.to_pay += amount;
    }
    return [
      { name: 'Paid', value: totals.paid, color: '#00C49F' },
      { name: 'Pending', value: totals.to_pay, color: '#FFBB28' },
      { name: 'TBB', value: totals.tbb, color: '#FF8042' },
    ];
  }, [filteredLR]);

  const lrSummary = useMemo(() => {
    const totalCount = filteredLR.length;
    const totalFreight = filteredLR.reduce((sum, row) => sum + (Number(row.freight) || 0), 0);
    const paid = filteredLR
      .filter((row) => row.status === 'paid')
      .reduce((sum, row) => sum + (Number(row.freight) || 0), 0);
    return {
      totalCount,
      totalFreight,
      avgFreight: totalCount > 0 ? totalFreight / totalCount : 0,
      paid,
    };
  }, [filteredLR]);

  const reportRows = useMemo(() => {
    const consignorMap = new Map(consignors.map((item) => [item.id, item.name]));
    const consigneeMap = new Map(consignees.map((item) => [item.id, item.name]));

    if (reportType === 'lr') {
      return filteredLR.map((row, index) => ({
        sr: index + 1,
        lr_no: row.lr_no || '-',
        date: new Date(row.lr_date).toLocaleDateString('en-IN'),
        consignor: consignorMap.get(row.consignor_id || 0) || '-',
        consignee: consigneeMap.get(row.consignee_id || 0) || '-',
        invoice_no: row.invoice_no || '-',
        route: `${row.from_city || '-'} -> ${row.to_city || '-'}`,
        freight_type: row.status === 'to_pay' ? 'To Pay' : row.status === 'paid' ? 'Paid' : 'TBB',
        amount: Number(row.freight || 0).toFixed(2),
      }));
    }

    if (reportType === 'city') {
      return cityData.map((row, index) => ({
        sr: index + 1,
        city: row.city,
        freight_amount: Number(row.amount || 0).toFixed(2),
      }));
    }

    if (reportType === 'consignor') {
      return consignorData.map((row, index) => ({
        sr: index + 1,
        consignor: row.name,
        invoices: row.invoices,
        amount: Number(row.amount || 0).toFixed(2),
      }));
    }

    return paymentData.map((row, index) => ({
      sr: index + 1,
      payment_type: row.name,
      amount: Number(row.value || 0).toFixed(2),
    }));
  }, [reportType, filteredLR, cityData, consignorData, paymentData, consignors, consignees]);

  const reportTitle = useMemo(() => {
    if (reportType === 'lr') return 'L.R. Register';
    if (reportType === 'city') return 'City Wise Freight Report';
    if (reportType === 'consignor') return 'Consignor Summary';
    return 'Payment Status Report';
  }, [reportType]);

  const exportReport = useCallback(() => {
    const csv = toCSV(reportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${appliedRange.from}-to-${appliedRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportRows, reportType, appliedRange]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Register-style operational reports with export support.
          </p>
        </div>
        <Button className="gap-2" onClick={exportReport}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from">From Date</Label>
              <Input
                id="from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="to">To Date</Label>
              <Input
                id="to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => setAppliedRange(dateRange)}>
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Button variant={reportType === 'lr' ? 'default' : 'outline'} onClick={() => setReportType('lr')}>
          L.R. Report
        </Button>
        <Button variant={reportType === 'city' ? 'default' : 'outline'} onClick={() => setReportType('city')}>
          City Wise Sales
        </Button>
        <Button
          variant={reportType === 'consignor' ? 'default' : 'outline'}
          onClick={() => setReportType('consignor')}
        >
          Consignor Performance
        </Button>
        <Button
          variant={reportType === 'payment' ? 'default' : 'outline'}
          onClick={() => setReportType('payment')}
        >
          Payment Status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{reportTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-gray-600">Period</p>
              <p className="text-lg font-bold">
                {appliedRange.from} to {appliedRange.to}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-gray-600">Rows</p>
              <p className="text-lg font-bold">{reportRows.length}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-gray-600">Total Freight</p>
              <p className="text-lg font-bold">Rs {lrSummary.totalFreight.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-gray-600">Paid Freight</p>
              <p className="text-lg font-bold">Rs {lrSummary.paid.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === 'lr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly L.R. Count</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyLRData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="L.R. Count" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Freight Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyLRData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#82ca9d" name="Amount (Rs)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>L.R. Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total L.R.s</p>
                  <p className="text-2xl font-bold">{lrSummary.totalCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Freight</p>
                  <p className="text-2xl font-bold">Rs {lrSummary.totalFreight.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Freight</p>
                  <p className="text-2xl font-bold">Rs {Math.round(lrSummary.avgFreight).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold">Rs {lrSummary.paid.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'city' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>City Wise Freight Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ city, amount }) => `${city}: Rs ${(amount / 1000).toFixed(0)}K`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {cityData.map((entry, index) => (
                      <Cell key={`${entry.city}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs ${Number(value).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>City Wise Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cityData.map((item) => (
                  <div key={item.city}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.city}</span>
                      <span>Rs {item.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(item.amount / (cityData[0]?.amount || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'consignor' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Consignors by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={consignorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="invoices" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'payment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: Rs ${(value / 1000).toFixed(0)}K`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {paymentData.map((item, idx) => (
                      <Cell key={`${item.name}-${idx}`} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs ${Number(value).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {paymentData.map((item) => (
                  <div key={item.name} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">{item.name} Amount</p>
                    <p className="text-2xl font-bold">Rs {item.value.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{reportTitle} Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {reportRows[0]
                    ? Object.keys(reportRows[0]).map((key) => (
                        <th key={key} className="border-b px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                      No report rows found for the selected period.
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row, index) => (
                    <tr key={index} className="border-b odd:bg-white even:bg-slate-50/60">
                      {Object.values(row).map((value, valueIndex) => (
                        <td key={valueIndex} className="px-3 py-2 whitespace-nowrap">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
