'use client';

import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const SIDEBAR_HIDDEN_KEY = 'trimurti_sidebar_hidden';

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

  return (
    <div className="flex h-screen bg-background">
      {!sidebarHidden ? <Sidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header sidebarHidden={sidebarHidden} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
