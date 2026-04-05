'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConsignorToken } from '@/app/services/consignor-session';

export default function ConsignorHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getConsignorToken() ? '/consignor/lrs' : '/consignor/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
    </div>
  );
}
