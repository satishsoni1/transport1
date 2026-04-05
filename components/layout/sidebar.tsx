'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
      { label: 'Goods Natures', href: '/masters/goods-natures', icon: <Package size={18} /> },
      { label: 'Freight Rates', href: '/masters/freight-rates', icon: <DollarSign size={18} /> },
    ],
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
  const router = useRouter();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Daily Entry']);
  const [hovered, setHovered] = useState(false);

  const collapsed = !hovered;

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
    <div
      className={cn(
        'h-full overflow-y-auto border-r border-slate-700 bg-slate-900 text-slate-50 transition-all duration-200',
        collapsed ? 'w-20' : 'w-64'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="border-b border-slate-700 p-6">
        <Link href="/dashboard" className="block">
          <h1 className={cn('font-bold', collapsed ? 'text-center text-sm' : 'text-xl')}>TRIMURTI</h1>
          {!collapsed ? <p className="text-xs text-slate-400">Transport System</p> : null}
        </Link>
      </div>

      <div className="border-b border-slate-700 bg-slate-800 p-4">
        <p className={cn('font-medium', collapsed ? 'text-center text-xs' : 'text-sm')}>
          {collapsed ? user?.firstName?.[0] : `${user?.firstName} ${user?.lastName}`}
        </p>
        {!collapsed ? <p className="text-xs text-slate-400">{user?.role}</p> : null}
      </div>

      <nav className="space-y-2 p-4">
        {navItems.map((item) => {
          if (!hasAccess(item)) return null;

          const hasSubmenu = !!item.submenu;
          const isExpanded = expandedItems.includes(item.label);
          const isActive = isItemActive(item.href);

          if (!hasSubmenu) {
            return (
              <Link key={item.label} href={item.href || '#'} title={collapsed ? item.label : undefined}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full gap-3',
                    collapsed ? 'justify-center px-2' : 'justify-start',
                    isActive && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {item.icon}
                  {!collapsed ? item.label : null}
                </Button>
              </Link>
            );
          }

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleExpand(item.label)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex w-full items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-700',
                  collapsed ? 'justify-center' : 'justify-between gap-3'
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {!collapsed ? item.label : null}
                </div>
                {!collapsed ? (
                  <ChevronDown size={16} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                ) : null}
              </button>

              {!collapsed && isExpanded && item.submenu ? (
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
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-slate-700 p-4">
        <Link href="/settings/users" title={collapsed ? 'Settings' : undefined}>
          <Button variant="ghost" className={cn('w-full gap-2', collapsed ? 'justify-center px-2' : 'justify-start')}>
            <Settings size={18} />
            {!collapsed ? 'Settings' : null}
          </Button>
        </Link>
        <Button variant="destructive" className={cn('w-full', collapsed ? 'px-2' : '')} onClick={handleLogout}>
          {collapsed ? '↩' : 'Logout'}
        </Button>
      </div>
    </div>
  );
}
