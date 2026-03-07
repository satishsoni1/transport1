'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
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

interface LRReport {
  month: string;
  count: number;
  amount: number;
}

interface CityWiseSales {
  city: string;
  amount: number;
}

interface ConsignorPerformance {
  name: string;
  invoices: number;
  amount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const mockLRData: LRReport[] = [
  { month: 'Jan', count: 45, amount: 150000 },
  { month: 'Feb', count: 52, amount: 175000 },
  { month: 'Mar', count: 48, amount: 162000 },
  { month: 'Apr', count: 61, amount: 195000 },
  { month: 'May', count: 55, amount: 180000 },
  { month: 'Jun', count: 67, amount: 220000 },
];

const mockCityData: CityWiseSales[] = [
  { city: 'AKOLA', amount: 425000 },
  { city: 'JAIPUR', amount: 380000 },
  { city: 'AURAD', amount: 320000 },
  { city: 'KHUDAI', amount: 285000 },
  { city: 'BULDHANA', amount: 250000 },
];

const mockConsignorData: ConsignorPerformance[] = [
  { name: 'RALLIS INDIA LIMITED', invoices: 45, amount: 450000 },
  { name: 'SAI RAM AGRITECH', invoices: 38, amount: 380000 },
  { name: 'EKDANT TRANSPORT', invoices: 28, amount: 280000 },
  { name: 'M.A. TRANSPORT', invoices: 22, amount: 220000 },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'lr' | 'city' | 'consignor' | 'payment'>('lr');
  const [dateRange, setDateRange] = useState({
    from: '2025-01-01',
    to: '2025-06-30',
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters Section */}
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
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="to">To Date</Label>
              <Input
                id="to"
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Type Selector */}
      <div className="flex gap-2">
        <Button
          variant={reportType === 'lr' ? 'default' : 'outline'}
          onClick={() => setReportType('lr')}
        >
          L.R. Report
        </Button>
        <Button
          variant={reportType === 'city' ? 'default' : 'outline'}
          onClick={() => setReportType('city')}
        >
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

      {/* L.R. Report */}
      {reportType === 'lr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly L.R. Count</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockLRData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    name="L.R. Count"
                  />
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
                <BarChart data={mockLRData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#82ca9d" name="Amount (₹)" />
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
                  <p className="text-2xl font-bold">328</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Freight</p>
                  <p className="text-2xl font-bold">₹11,82,000</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Freight</p>
                  <p className="text-2xl font-bold">₹3,604</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold">₹8,50,000</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* City Wise Sales */}
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
                    data={mockCityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ city, amount }) =>
                      `${city}: ₹${(amount / 1000).toFixed(0)}K`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {mockCityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
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
                {mockCityData.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.city}</span>
                      <span>₹{item.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.amount / mockCityData[0].amount) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Consignor Performance */}
      {reportType === 'consignor' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Consignors by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={mockConsignorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
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

          <Card>
            <CardHeader>
              <CardTitle>Consignor Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Consignor</th>
                      <th className="px-4 py-2 text-right">Invoices</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Avg Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockConsignorData.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-right">{item.invoices}</td>
                        <td className="px-4 py-2 text-right">
                          ₹{item.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₹
                          {(item.amount / item.invoices).toLocaleString('en-IN', {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Status Report */}
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
                    data={[
                      { name: 'Paid', value: 850000 },
                      { name: 'Pending', value: 320000 },
                      { name: 'TBB', value: 180000 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ₹${(value / 1000).toFixed(0)}K`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {['#00C49F', '#FFBB28', '#FF8042'].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
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
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="text-2xl font-bold">₹8,50,000</p>
                  <p className="text-xs text-green-600 mt-1">71.8% collected</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold">₹3,20,000</p>
                  <p className="text-xs text-yellow-600 mt-1">27% outstanding</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">TBB Amount</p>
                  <p className="text-2xl font-bold">₹1,80,000</p>
                  <p className="text-xs text-orange-600 mt-1">1.2% to be billed</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold">₹11,82,000</p>
                  <p className="text-xs text-purple-600 mt-1">100%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
