'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Truck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { driverFetch, getDriverToken, setDriverSession } from '@/app/services/driver-session';

export default function DriverLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (getDriverToken()) {
      router.replace('/driver/pod');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await driverFetch<{
        token: string;
        driver: {
          id: number;
          driver_name: string;
          username: string;
          mobile: string;
          vehicle_no?: string;
        };
      }>('/api/driver-auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setDriverSession(data.token, data.driver);
      toast.success('Driver login successful');
      router.replace('/driver/pod');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Driver login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-white to-white px-4 py-6 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to office login
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 dark:bg-white">
            <Truck className="h-5 w-5 text-white dark:text-slate-900" />
          </div>
          <span className="mb-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Driver Portal
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">POD Upload</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in with the username and password from Driver Master to scan L.R. QR codes and upload signed POD.
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
              placeholder="Driver username"
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
