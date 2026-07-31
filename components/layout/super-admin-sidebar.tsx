'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/auth-context';
import { superAdminNavItems } from '@/lib/nav-config';
import { ShieldCheck, User, LogOut } from 'lucide-react';

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-indigo-900 bg-slate-950 text-slate-100">
      {/* Brand */}
      <div className="border-b border-indigo-900 bg-indigo-950/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">Control Center</p>
            <p className="truncate text-[10px] text-indigo-300">Platform Super Admin</p>
          </div>
        </div>
      </div>

      {/* User badge */}
      <div className="border-b border-indigo-900 bg-slate-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-xs font-bold text-white">
            {(user?.firstName?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-200">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[10px] text-indigo-300">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {superAdminNavItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span className={cn('shrink-0', isActive ? 'text-white' : 'text-indigo-400')}>
                  <Icon size={18} />
                </span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-indigo-900 px-3 py-3 space-y-0.5">
        <Link href="/profile">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <User size={16} className="shrink-0 text-slate-400" />
            Profile
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300"
        >
          <LogOut size={16} className="shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}
