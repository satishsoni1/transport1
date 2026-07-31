'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/auth-context';
import { useAppSettings } from '@/app/context/app-settings-context';
import { navItems, type NavItem } from '@/lib/nav-config';
import { can } from '@/lib/roles';
import { User, LogOut, Truck } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const hasAccess = (item: NavItem): boolean => !item.permission || can(user, item.permission);

  const visibleItems = navItems
    .filter(hasAccess)
    .map((item) =>
      item.submenu ? { ...item, submenu: item.submenu.filter(hasAccess) } : item
    )
    .filter((item) => !item.submenu || item.submenu.length > 0);

  useEffect(() => {
    const toExpand: string[] = [];
    for (const item of visibleItems) {
      if (item.submenu?.some((sub) => sub.href && pathname.startsWith(sub.href))) {
        toExpand.push(item.label);
      }
    }
    if (toExpand.length > 0) {
      setExpandedItems((prev) => [...new Set([...prev, ...toExpand])]);
    } else {
      setExpandedItems(['Daily Entry']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isItemActive = (href?: string): boolean => {
    if (!href) return false;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-100">
      {/* Brand */}
      <div className="border-b border-slate-800 px-5 py-4">
        <Link href="/dashboard" className="block">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Truck size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-white">
                {settings?.company_name || 'Transport Co.'}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {settings?.app_title || 'Transport Management'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* User badge */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
            {(user?.firstName?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-200">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[10px] text-slate-400">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const hasSubmenu = !!item.submenu;
          const isExpanded = expandedItems.includes(item.label);
          const isActive = isItemActive(item.href);
          const hasActiveChild = item.submenu?.some((s) => s.href && pathname.startsWith(s.href));
          const Icon = item.icon;

          if (!hasSubmenu) {
            return (
              <Link key={item.label} href={item.href || '#'}>
                <div
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <span className={cn('shrink-0', isActive ? 'text-white' : 'text-slate-400')}>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </div>
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleExpand(item.label)}
                className={cn(
                  'flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  hasActiveChild
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn('shrink-0', hasActiveChild ? 'text-blue-400' : 'text-slate-400')}>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </div>
                <ChevronDown
                  size={14}
                  className={cn('shrink-0 text-slate-500 transition-transform duration-150', isExpanded && 'rotate-180')}
                />
              </button>

              {isExpanded && item.submenu ? (
                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-slate-800 pl-3">
                  {item.submenu.map((subitem) => {
                    const subActive = subitem.href ? pathname.startsWith(subitem.href) : false;
                    const SubIcon = subitem.icon;
                    return (
                      <Link key={subitem.label} href={subitem.href || '#'}>
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                            subActive
                              ? 'bg-blue-600/20 text-blue-300'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          )}
                        >
                          <span className={cn('shrink-0', subActive ? 'text-blue-400' : 'text-slate-500')}>
                            <SubIcon size={16} />
                          </span>
                          {subitem.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-3 py-3 space-y-0.5">
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
