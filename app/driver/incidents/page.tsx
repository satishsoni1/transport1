'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  clearDriverSession,
  driverFetch,
  getDriverToken,
  getDriverUser,
  type DriverSessionUser,
} from '@/app/services/driver-session';

interface IncidentReport {
  id: number;
  incident_date: string;
  description: string;
  status: 'open' | 'reviewed' | 'closed';
  vehicle_no: string | null;
}

export default function DriverIncidentsPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);

  const loadIncidents = useCallback(async () => {
    const data = await driverFetch<IncidentReport[]>('/api/driver/incidents');
    setIncidents(data);
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
        await loadIncidents();
      } catch {
        clearDriverSession();
        router.replace('/driver/login');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadIncidents, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the incident');
      return;
    }
    setSubmitting(true);
    try {
      await driverFetch('/api/driver/incidents', {
        method: 'POST',
        body: JSON.stringify({
          incident_date: new Date().toISOString().slice(0, 10),
          description,
        }),
      });
      toast.success('Incident reported');
      setDescription('');
      await loadIncidents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to report incident');
    } finally {
      setSubmitting(false);
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
            <CardTitle className="text-2xl font-black tracking-tight">Report Incident</CardTitle>
            <CardDescription>{driver?.driver_name || 'Driver'}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 text-xs font-semibold text-blue-700">
            <Link href="/driver/trips" className="underline">Trips</Link>
            <Link href="/driver/pod" className="underline">POD</Link>
            <Link href="/driver/checklist" className="underline">Checklist</Link>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="Describe what happened (accident, breakdown, delay, etc.)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">My Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidents.length === 0 ? (
              <div className="text-sm text-slate-500">No incidents reported yet.</div>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>{incident.incident_date}</span>
                    <span className="text-xs uppercase text-slate-500">{incident.status}</span>
                  </div>
                  <div className="mt-1 text-slate-600">{incident.description}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
