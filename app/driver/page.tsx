'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDriverToken } from '@/app/services/driver-session';

export default function DriverHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getDriverToken() ? '/driver/pod' : '/driver/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
    </div>
  );
}
