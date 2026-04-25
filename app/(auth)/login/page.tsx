'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      toast.success('Login successful');
      if (user?.platformRole === 'super_admin') {
        router.push('/admin/transports');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Transport Management</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
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
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="rounded bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold text-emerald-950">Consignor Portal</p>
              <p>Use consignor username/password to track your shipments.</p>
              <Link
                href="/consignor/login"
                className="mt-2 inline-block font-semibold text-emerald-950 underline underline-offset-4"
              >
                Open Consignor Login →
              </Link>
            </div>

            <div className="rounded bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Driver Portal</p>
              <p>Use driver username/password created in Driver Master.</p>
              <Link
                href="/driver/login"
                className="mt-2 inline-block font-semibold text-slate-900 underline underline-offset-4"
              >
                Open Driver Login →
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
