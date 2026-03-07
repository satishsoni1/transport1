'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/auth-context';
import {
  LayoutDashboard,
  Database,
  FileText,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  Truck,
  Package,
  DollarSign,
  Scroll,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: NavItem[];
  requiredRoles?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Master Data',
    icon: <Database size={20} />,
    submenu: [
      { label: 'Consignors', href: '/masters/consignors', icon: <Users size={18} /> },
      { label: 'Consignees', href: '/masters/consignees', icon: <Users size={18} /> },
      { label: 'Drivers', href: '/masters/drivers', icon: <Users size={18} /> },
      { label: 'Vehicles', href: '/masters/vehicles', icon: <Truck size={18} /> },
      { label: 'Cities', href: '/masters/cities', icon: <Package size={18} /> },
      { label: 'Banks', href: '/masters/banks', icon: <DollarSign size={18} /> },
      { label: 'Goods Types', href: '/masters/goods-types', icon: <Package size={18} /> },
      { label: 'Freight Rates', href: '/masters/freight-rates', icon: <DollarSign size={18} /> },
    ],
  },
  {
    label: 'Daily Entry',
    icon: <FileText size={20} />,
    submenu: [
      { label: 'L.R. Entry', href: '/daily-entry/lr-entry', icon: <Scroll size={18} /> },
      { label: 'Challan', href: '/daily-entry/challan', icon: <Truck size={18} /> },
      { label: 'Invoice', href: '/daily-entry/invoice', icon: <FileText size={18} /> },
      { label: 'Monthly Billing', href: '/daily-entry/monthly-billing', icon: <DollarSign size={18} /> },
      { label: 'Receipt', href: '/daily-entry/receipt', icon: <DollarSign size={18} /> },
    ],
  },
  {
    label: 'Reports & Analytics',
    href: '/reports',
    icon: <BarChart3 size={20} />,
    requiredRoles: ['Admin', 'Accountant', 'Viewer'],
  },
  {
    label: 'Print & Export',
    href: '/print-preview',
    icon: <FileText size={20} />,
    requiredRoles: ['Admin', 'Operator', 'Accountant'],
  },
  {
    label: 'Administration',
    icon: <Settings size={20} />,
    requiredRoles: ['Admin'],
    submenu: [
      { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
      { label: 'Audit Log', href: '/admin/audit-log', icon: <FileText size={18} /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Master Data']);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
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
    <div className="w-64 bg-slate-900 text-slate-50 h-full overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <Link href="/dashboard" className="block">
          <h1 className="text-xl font-bold">TRIMURTI</h1>
          <p className="text-xs text-slate-400">Transport System</p>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-slate-400">{user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          if (!hasAccess(item)) return null;

          const hasSubmenu = !!item.submenu;
          const isExpanded = expandedItems.includes(item.label);
          const isActive = isItemActive(item.href);

          if (!hasSubmenu) {
            return (
              <Link key={item.label} href={item.href || '#'}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleExpand(item.label)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  'hover:bg-slate-700'
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', isExpanded && 'rotate-180')}
                />
              </button>

              {isExpanded && item.submenu && (
                <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-4">
                  {item.submenu.map((subitem) => (
                    <Link key={subitem.label} href={subitem.href || '#'}>
                      <Button
                        variant={isItemActive(subitem.href) ? 'default' : 'ghost'}
                        className={cn(
                          'w-full justify-start gap-3 text-sm',
                          isItemActive(subitem.href) && 'bg-blue-600 hover:bg-blue-700'
                        )}
                        size="sm"
                      >
                        {subitem.icon}
                        {subitem.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings size={18} />
            Settings
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="destructive" className="w-full">
            Logout
          </Button>
        </Link>
      </div>
    </div>
  );
}
