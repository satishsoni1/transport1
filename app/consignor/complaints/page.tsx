'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsignorShell } from '@/app/consignor/_components/consignor-shell';
import {
  consignorFetch,
  getConsignorToken,
  getConsignorUser,
  clearConsignorSession,
  type ConsignorSessionUser,
} from '@/app/services/consignor-session';

interface Complaint {
  id: number;
  lr_no: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution_remarks: string;
  created_at: string;
}

const STATUS_LABELS: Record<Complaint['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function ConsignorComplaintsPage() {
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ lr_no: '', subject: '', description: '' });

  const loadComplaints = useCallback(async () => {
    const data = await consignorFetch<Complaint[]>('/api/consignor/complaints');
    setComplaints(data);
  }, []);

  useEffect(() => {
    if (!getConsignorToken()) {
      router.replace('/consignor/login');
      return;
    }
    const saved = getConsignorUser();
    if (saved) setConsignor(saved);

    const init = async () => {
      try {
        await loadComplaints();
      } catch {
        clearConsignorSession();
        router.replace('/consignor/login');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadComplaints, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      await consignorFetch('/api/consignor/complaints', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Complaint submitted');
      setForm({ lr_no: '', subject: '', description: '' });
      await loadComplaints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <ConsignorShell
      consignor={consignor}
      title="Complaints"
      description="Raise and track service complaints"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Raise a Complaint</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="L.R. No (optional)"
              value={form.lr_no}
              onChange={(e) => setForm({ ...form, lr_no: e.target.value })}
            />
            <Input
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <Textarea
              placeholder="Describe the issue"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Complaints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {complaints.length === 0 ? (
            <div className="text-sm text-slate-500">No complaints raised yet.</div>
          ) : (
            complaints.map((complaint) => (
              <div key={complaint.id} className="rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between font-semibold">
                  <span>{complaint.subject}</span>
                  <span className="text-xs uppercase text-slate-500">{STATUS_LABELS[complaint.status]}</span>
                </div>
                {complaint.lr_no ? <div className="text-xs text-slate-500">L.R. {complaint.lr_no}</div> : null}
                <div className="mt-1 text-slate-600">{complaint.description}</div>
                {complaint.resolution_remarks ? (
                  <div className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
                    Resolution: {complaint.resolution_remarks}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </ConsignorShell>
  );
}
