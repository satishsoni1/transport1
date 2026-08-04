'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  clearDriverSession,
  driverFetch,
  getDriverToken,
  getDriverUser,
  type DriverSessionUser,
} from '@/app/services/driver-session';

interface DriverTrip {
  id: number;
  trip_no: string;
  vehicle_no: string | null;
  from_city: string;
  to_city: string;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
}

const NEXT_ACTION_LABEL: Record<string, string> = {
  planned: 'Accept & Start Trip',
  ongoing: 'Mark Trip Completed',
};

export default function DriverTripsPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<DriverTrip[]>([]);

  const loadTrips = useCallback(async () => {
    const data = await driverFetch<DriverTrip[]>('/api/driver/trips');
    setTrips(data);
  }, []);

  useEffect(() => {
    if (!getDriverToken()) {
      router.replace('/driver/login');
      return;
    }
    const savedDriver = getDriverUser();
    if (savedDriver) setDriver(savedDriver);

    const init = async () => {
      try {
        const verify = await driverFetch<{ driver: DriverSessionUser }>('/api/driver-auth/verify');
        setDriver(verify.driver);
        await loadTrips();
      } catch {
        clearDriverSession();
        router.replace('/driver/login');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadTrips, router]);

  const handleAdvance = async (trip: DriverTrip) => {
    try {
      await driverFetch('/api/driver/trips', {
        method: 'PUT',
        body: JSON.stringify({ trip_id: trip.id }),
      });
      toast.success('Trip updated');
      await loadTrips();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update trip');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dbeafe_0%,#eff6ff_28%,#ffffff_100%)] px-3 py-4">
      <div className="mx-auto max-w-md space-y-3">
        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl font-black tracking-tight">My Trips</CardTitle>
            <CardDescription>{driver?.driver_name || 'Driver'}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 text-xs font-semibold text-blue-700">
            <Link href="/driver/pod" className="underline">POD</Link>
            <Link href="/driver/checklist" className="underline">Checklist</Link>
            <Link href="/driver/incidents" className="underline">Report Incident</Link>
          </CardContent>
        </Card>

        {trips.length === 0 ? (
          <Card className="gap-3 py-4 shadow-lg">
            <CardContent className="text-sm text-slate-500">No trips assigned yet.</CardContent>
          </Card>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="gap-2 py-4 shadow-lg">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{trip.trip_no}</div>
                  <div className="text-xs font-semibold uppercase text-slate-500">{trip.status}</div>
                </div>
                <div className="text-sm text-slate-600">
                  {trip.from_city || '-'} to {trip.to_city || '-'}
                </div>
                <div className="text-xs text-slate-500">Vehicle: {trip.vehicle_no || '-'}</div>
                {NEXT_ACTION_LABEL[trip.status] ? (
                  <Button size="sm" className="w-full" onClick={() => handleAdvance(trip)}>
                    {NEXT_ACTION_LABEL[trip.status]}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
