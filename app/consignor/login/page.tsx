'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  consignorFetch,
  getConsignorToken,
  setConsignorSession,
} from '@/app/services/consignor-session';

export default function ConsignorLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (getConsignorToken()) {
      router.replace('/consignor/lrs');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await consignorFetch<{
        token: string;
        consignor: {
          id: number;
          name: string;
          username: string;
          city?: string;
          mobile?: string;
        };
      }>('/api/consignor-auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setConsignorSession(data.token, data.consignor);
      toast.success('Consignor login successful');
      router.replace('/consignor/lrs');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Consignor login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#dcfce7_0%,#f0fdf4_38%,#ffffff_100%)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <Card className="w-full gap-4 border-emerald-200 bg-white/95 py-5 shadow-xl backdrop-blur">
          <CardHeader className="space-y-3 pb-0 text-center">
            <div className="mx-auto w-fit rounded-full bg-emerald-700 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              Consignor Login
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
              LR Tracking Desk
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Sign in with consignor credentials from Consignor Master and check your LR list with filters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-semibold text-slate-700">
                  Username
                </label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Consignor username"
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-emerald-50"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-emerald-50"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl text-base font-semibold" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Continue'}
              </Button>
            </form>
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              Use the `username/password` saved in Consignor Master for each consignor.
            </div>
            <div className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login" className="font-medium text-slate-800 underline underline-offset-4">
                Back to office login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
