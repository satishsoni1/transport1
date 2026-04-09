'use client';

import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const SIDEBAR_HIDDEN_KEY = 'tms_sidebar_hidden';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSidebarHidden(localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1');
  }, []);

  const toggleSidebar = () => {
    setSidebarHidden((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-3 text-sm text-slate-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const subscription = user?.subscription;
  const showSubscriptionWarning =
    user?.platformRole === 'transport_admin' &&
    subscription &&
    (subscription.status === 'near_expiry' || subscription.status === 'expired');

  return (
    <div className="flex h-screen bg-background">
      {!sidebarHidden ? <Sidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header sidebarHidden={sidebarHidden} onToggleSidebar={toggleSidebar} />
        {showSubscriptionWarning ? (
          <div
            className={
              subscription?.status === 'expired'
                ? 'border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-900'
                : 'border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950'
            }
          >
            <div className="font-semibold">
              {subscription?.status === 'expired' ? 'Subscription expired' : 'Subscription renewal due soon'}
            </div>
            <div>{subscription?.message || 'Please renew your subscription to avoid interruption.'}</div>
          </div>
        ) : null}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
