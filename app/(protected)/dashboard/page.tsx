'use client';

import { useAuth } from '@/app/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Truck, FileText, DollarSign, Users } from 'lucide-react';

const revenueData = [
  { month: 'Jan', revenue: 4000, freight: 2400 },
  { month: 'Feb', revenue: 3000, freight: 1398 },
  { month: 'Mar', revenue: 2000, freight: 9800 },
  { month: 'Apr', revenue: 2780, freight: 3908 },
  { month: 'May', revenue: 1890, freight: 4800 },
  { month: 'Jun', revenue: 2390, freight: 3800 },
];

const cityData = [
  { name: 'AKOLA', value: 35, fill: '#3b82f6' },
  { name: 'JAIPUR', value: 28, fill: '#8b5cf6' },
  { name: 'BULDHANA', value: 20, fill: '#ec4899' },
  { name: 'Other', value: 17, fill: '#10b981' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName}</h1>
        <p className="text-muted-foreground mt-1">Transport Management System Dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Freight</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹12,45,600</div>
            <p className="text-xs text-muted-foreground mt-1">+2.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹3,45,000</div>
            <p className="text-xs text-muted-foreground mt-1">25 invoices pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">8 on route</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">186</div>
            <p className="text-xs text-muted-foreground mt-1">45 new this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Freight and revenue trends</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" />
                <Bar dataKey="freight" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* City Distribution */}
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
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent L.R. Entries</CardTitle>
            <CardDescription>Last 5 lorry receipts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">LR-{2025000 + i}</p>
                    <p className="text-sm text-muted-foreground">AKOLA to JAIPUR</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹4,500</p>
                    <p className="text-sm text-green-600">Paid</p>
                  </div>
                </div>
              ))}
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
              <button className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-medium transition">
                New L.R. Entry
              </button>
              <button className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-medium transition">
                Create Challan
              </button>
              <button className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md font-medium transition">
                Record Receipt
              </button>
              <button className="w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-md font-medium transition">
                Generate Invoice
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
