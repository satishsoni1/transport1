'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  clearDriverSession,
  driverFetch,
  getDriverToken,
  getDriverUser,
  type DriverSessionUser,
} from '@/app/services/driver-session';

const CHECKLIST_ITEMS = ['Tyres', 'Brakes', 'Lights', 'Horn', 'Mirrors', 'Engine Oil', 'Wipers', 'Fuel Level'];

interface ChecklistHistoryItem {
  id: number;
  checklist_date: string;
  vehicle_no: string | null;
  items: { label: string; ok: boolean }[];
  remarks: string;
}

export default function DriverChecklistPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<DriverSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState<ChecklistHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    const data = await driverFetch<ChecklistHistoryItem[]>('/api/driver/checklist');
    setHistory(data);
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
        await loadHistory();
      } catch {
        clearDriverSession();
        router.replace('/driver/login');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadHistory, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = CHECKLIST_ITEMS.map((label) => ({ label, ok: Boolean(checked[label]) }));
      await driverFetch('/api/driver/checklist', {
        method: 'POST',
        body: JSON.stringify({
          checklist_date: new Date().toISOString().slice(0, 10),
          items,
          remarks,
        }),
      });
      toast.success('Checklist submitted');
      setChecked({});
      setRemarks('');
      await loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit checklist');
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
            <CardTitle className="text-2xl font-black tracking-tight">Vehicle Checklist</CardTitle>
            <CardDescription>{driver?.driver_name || 'Driver'}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 text-xs font-semibold text-blue-700">
            <Link href="/driver/trips" className="underline">Trips</Link>
            <Link href="/driver/pod" className="underline">POD</Link>
            <Link href="/driver/incidents" className="underline">Report Incident</Link>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {CHECKLIST_ITEMS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(checked[label])}
                    onCheckedChange={(value) => setChecked({ ...checked, [label]: Boolean(value) })}
                  />
                  {label}
                </label>
              ))}
              <Textarea
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Checklist'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <div className="text-sm text-slate-500">No checklist history yet.</div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>{entry.checklist_date}</span>
                    <span className="text-slate-500">{entry.vehicle_no || '-'}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {entry.items.filter((i) => !i.ok).length === 0
                      ? 'All items OK'
                      : `${entry.items.filter((i) => !i.ok).length} item(s) flagged`}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
