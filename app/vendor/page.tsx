'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Store } from 'lucide-react';
import {
  clearVendorSession,
  vendorFetch,
  getVendorToken,
  getVendorUser,
  type VendorSessionUser,
} from '@/app/services/vendor-session';

interface VendorVehicle {
  id: number;
  vehicle_no: string;
  vehicle_type: string;
  insurance_expiry: string;
  fitness_expiry: string;
  permit_expiry: string;
  puc_expiry: string;
  status: string;
}

interface VendorTrip {
  id: number;
  trip_no: string;
  vehicle_no: string;
  driver_name: string | null;
  from_city: string;
  to_city: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface VendorPayment {
  id: number;
  entry_date: string;
  amount: number;
  payment_mode: string;
  vehicle_no: string;
  category_name: string | null;
  remarks: string;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VendorVehicle[]>([]);
  const [trips, setTrips] = useState<VendorTrip[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);

  useEffect(() => {
    if (!getVendorToken()) {
      router.replace('/vendor/login');
      return;
    }

    const savedVendor = getVendorUser();
    if (savedVendor) setVendor(savedVendor);

    const init = async () => {
      try {
        const verify = await vendorFetch<{ vendor: VendorSessionUser }>('/api/vendor-auth/verify');
        setVendor(verify.vendor);
        const [vehiclesData, tripsData, paymentsData] = await Promise.all([
          vendorFetch<VendorVehicle[]>('/api/vendor/vehicles'),
          vendorFetch<VendorTrip[]>('/api/vendor/trips'),
          vendorFetch<VendorPayment[]>('/api/vendor/payments'),
        ]);
        setVehicles(vehiclesData);
        setTrips(tripsData);
        setPayments(paymentsData);
      } catch {
        clearVendorSession();
        router.replace('/vendor/login');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router]);

  const handleLogout = () => {
    clearVendorSession();
    router.replace('/vendor/login');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Store size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">{vendor?.vendor_name}</p>
            <p className="text-xs text-muted-foreground">Vendor Portal</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
          <LogOut size={14} />
          Logout
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Tabs defaultValue="vehicles">
          <TabsList>
            <TabsTrigger value="vehicles">My Vehicles</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Insurance Expiry</TableHead>
                    <TableHead>Permit Expiry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No vehicles assigned
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.vehicle_no}</TableCell>
                        <TableCell>{v.vehicle_type}</TableCell>
                        <TableCell>{v.insurance_expiry || '-'}</TableCell>
                        <TableCell>{v.permit_expiry || '-'}</TableCell>
                        <TableCell className="capitalize">{v.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="trips">
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip No</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No trips found
                      </TableCell>
                    </TableRow>
                  ) : (
                    trips.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.trip_no}</TableCell>
                        <TableCell>{t.vehicle_no}</TableCell>
                        <TableCell>{t.driver_name || '-'}</TableCell>
                        <TableCell>
                          {t.from_city} → {t.to_city}
                        </TableCell>
                        <TableCell className="capitalize">{t.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.entry_date}</TableCell>
                        <TableCell>{p.vehicle_no}</TableCell>
                        <TableCell>{p.category_name || '-'}</TableCell>
                        <TableCell>₹{Number(p.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="capitalize">{p.payment_mode}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
