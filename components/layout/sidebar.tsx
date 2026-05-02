'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/auth-context';
import { useAppSettings } from '@/app/context/app-settings-context';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  Truck,
  Package,
  DollarSign,
  Scroll,
  User,
  MapPin,
  Navigation,
  Receipt,
  Wallet,
  Upload,
  Printer,
  Building2,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  LogOut,
  Boxes,
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: NavItem[];
  requiredRoles?: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Daily Entry',
    icon: <ClipboardList size={18} />,
    submenu: [
      { label: 'L.R. Entry', href: '/daily-entry/lr-entry', icon: <Scroll size={16} /> },
      { label: 'Challan', href: '/daily-entry/challan', icon: <Truck size={16} /> },
      { label: 'Invoice', href: '/daily-entry/invoice', icon: <FileText size={16} /> },
      { label: 'Receipt', href: '/daily-entry/receipt', icon: <Receipt size={16} /> },
      { label: 'On Account Receipt', href: '/daily-entry/on-account-receipt', icon: <Wallet size={16} /> },
      { label: 'POD Upload', href: '/daily-entry/pod-upload', icon: <Upload size={16} /> },
    ],
  },
  {
    label: 'Reports',
    icon: <BarChart3 size={18} />,
    submenu: [
      { label: 'Reports & Analytics', href: '/reports', icon: <BarChart3 size={16} /> },
      { label: 'Consignor Ledger', href: '/reports/consignor-ledger', icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'Print & Export',
    href: '/print-preview',
    icon: <Printer size={18} />,
    requiredRoles: ['Admin', 'Operator', 'Accountant'],
  },
  {
    label: 'Parties',
    icon: <Users size={18} />,
    submenu: [
      { label: 'Consignors', href: '/masters/consignors', icon: <Building2 size={16} /> },
      { label: 'Consignees', href: '/masters/consignees', icon: <Building2 size={16} /> },
    ],
  },
  {
    label: 'Logistics',
    icon: <Truck size={18} />,
    submenu: [
      { label: 'Drivers', href: '/masters/drivers', icon: <Users size={16} /> },
      { label: 'Vehicles', href: '/masters/vehicles', icon: <Truck size={16} /> },
      { label: 'Cities', href: '/masters/cities', icon: <MapPin size={16} /> },
      { label: 'Routes', href: '/masters/routes', icon: <Navigation size={16} /> },
    ],
  },
  {
    label: 'Rate Masters',
    icon: <DollarSign size={18} />,
    submenu: [
      { label: 'Banks', href: '/masters/banks', icon: <Wallet size={16} /> },
      { label: 'Goods Types', href: '/masters/goods-types', icon: <Package size={16} /> },
      { label: 'Goods Natures', href: '/masters/goods-natures', icon: <Boxes size={16} /> },
      { label: 'Freight Rates', href: '/masters/freight-rates', icon: <DollarSign size={16} /> },
    ],
  },
  {
    label: 'Administration',
    icon: <ShieldCheck size={18} />,
    requiredRoles: ['Admin', 'Super Admin'],
    submenu: [
      { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
      { label: 'Financial Years', href: '/settings/financial-years', icon: <CalendarDays size={16} /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
      { label: 'Transports', href: '/admin/transports', icon: <Truck size={16} /> },
      { label: 'Audit Log', href: '/admin/audit-log', icon: <FileText size={16} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    const toExpand: string[] = [];
    for (const item of navItems) {
      if (item.submenu?.some((sub) => sub.href && pathname.startsWith(sub.href))) {
        toExpand.push(item.label);
      }
    }
    if (toExpand.length > 0) {
      setExpandedItems((prev) => [...new Set([...prev, ...toExpand])]);
    } else {
      setExpandedItems(['Daily Entry']);
    }
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

  const hasAccess = (item: NavItem): boolean => {
    if (!item.requiredRoles) return true;
    return item.requiredRoles.includes(user?.role || '');
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
        {navItems.map((item) => {
          if (!hasAccess(item)) return null;

          const hasSubmenu = !!item.submenu;
          const isExpanded = expandedItems.includes(item.label);
          const isActive = isItemActive(item.href);
          const hasActiveChild = item.submenu?.some((s) => s.href && pathname.startsWith(s.href));

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
                    {item.icon}
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
                    {item.icon}
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
                            {subitem.icon}
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
