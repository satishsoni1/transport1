'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/auth-context';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, Eye, EyeOff, ShieldCheck, BarChart3, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const FEATURES = [
  { icon: ShieldCheck, text: 'Role-based access for every team member' },
  { icon: BarChart3, text: 'Live reports on freight, vehicles and drivers' },
  { icon: Wallet, text: 'Expense, income and driver ledger tracking' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, updateSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const goToDashboard = (user: { platformRole?: string } | undefined) => {
    if (user?.platformRole === 'super_admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if ('requires2fa' in result) {
        setPendingToken(result.pendingToken);
        toast.info('Enter the 6-digit code from your authenticator app');
        return;
      }
      toast.success('Login successful');
      goToDashboard(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingToken) return;
    setIsLoading(true);
    try {
      const data = await apiClient.post<{ token: string; user: any }>('/api/auth/verify-2fa', {
        pending_token: pendingToken,
        code: twoFaCode.trim(),
      });
      updateSession({ token: data.token, user: data.user });
      toast.success('Login successful');
      goToDashboard(data.user);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_45%)]" />
        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Trimurti TMS</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              Run your transport business from one dashboard.
            </h1>
            <p className="mt-3 max-w-md text-slate-300">
              LRs, challans, billing, drivers, vehicles and accounts — built for how transport
              actually works in India.
            </p>
          </div>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <feature.icon className="h-4 w-4" />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Trimurti TMS. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center p-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <Truck className="h-5 w-5 text-white dark:text-slate-900" />
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">Trimurti TMS</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {pendingToken ? 'Two-factor authentication' : 'Sign in'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {pendingToken
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Enter your credentials to access your workspace.'}
            </p>
          </div>

          {pendingToken ? (
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="totp_code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Authentication Code
                </label>
                <Input
                  id="totp_code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || twoFaCode.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400"
                onClick={() => { setPendingToken(null); setTwoFaCode(''); }}
              >
                Back to login
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@yourcompany.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          )}

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/consignor/login" className="font-medium hover:text-slate-900 hover:underline dark:hover:text-white">
              Consignor Portal
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link href="/driver/login" className="font-medium hover:text-slate-900 hover:underline dark:hover:text-white">
              Driver Portal
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link href="/vendor/login" className="font-medium hover:text-slate-900 hover:underline dark:hover:text-white">
              Vendor Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
