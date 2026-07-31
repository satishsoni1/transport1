'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Package, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  consignorFetch,
  getConsignorToken,
  setConsignorSession,
} from '@/app/services/consignor-session';

export default function ConsignorLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-8 shadow-xl dark:border-emerald-900/50 dark:bg-slate-900">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to office login
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="mb-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            Consignor Portal
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Track your shipments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in with the username and password from your Consignor Master to view your L.R. list.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Username
            </label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Consignor username"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
