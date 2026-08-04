import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Settings,
  Truck,
  Package,
  DollarSign,
  Scroll,
  MapPin,
  Navigation,
  Receipt,
  Wallet,
  Upload,
  Printer,
  Building2,
  CalendarDays,
  ClipboardList,
  Boxes,
  FileStack,
  Landmark,
  Tags,
  BellRing,
  Route,
  ShieldCheck,
  Store,
  Fuel,
  Disc,
  Wrench,
  AlertTriangle,
  FileSignature,
  MessageSquareWarning,
  MapPinned,
  Plug,
  Building,
  CalendarClock,
  Users2,
  Warehouse,
} from 'lucide-react';

import type { PermissionKey } from '@/lib/roles';

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  submenu?: NavItem[];
  /** Omit for items visible to every logged-in staff member (e.g. Dashboard, Profile). */
  permission?: PermissionKey;
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Daily Entry',
    icon: ClipboardList,
    permission: 'daily-entry',
    submenu: [
      { label: 'L.R. Entry', href: '/daily-entry/lr-entry', icon: Scroll },
      { label: 'Challan', href: '/daily-entry/challan', icon: Truck },
      { label: 'Invoice', href: '/daily-entry/invoice', icon: FileText },
      { label: 'Receipt', href: '/daily-entry/receipt', icon: Receipt },
      { label: 'On Account Receipt', href: '/daily-entry/on-account-receipt', icon: Wallet },
      { label: 'Monthly Bills', href: '/daily-entry/monthly-billing', icon: FileStack },
      { label: 'POD Upload', href: '/daily-entry/pod-upload', icon: Upload },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    permission: 'reports',
    submenu: [
      { label: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
      { label: 'Consignor Ledger', href: '/reports/consignor-ledger', icon: FileText },
    ],
  },
  {
    label: 'Print & Export',
    href: '/print-preview',
    icon: Printer,
    permission: 'print-export',
  },
  {
    label: 'Parties',
    icon: Users,
    permission: 'parties',
    submenu: [
      { label: 'Consignors', href: '/masters/consignors', icon: Building2 },
      { label: 'Consignees', href: '/masters/consignees', icon: Building2 },
      { label: 'Complaints', href: '/complaints', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'Logistics',
    icon: Truck,
    permission: 'logistics',
    submenu: [
      { label: 'Drivers', href: '/masters/drivers', icon: Users },
      { label: 'Vehicles', href: '/masters/vehicles', icon: Truck },
      { label: 'Cities', href: '/masters/cities', icon: MapPin },
      { label: 'Routes', href: '/masters/routes', icon: Navigation },
      { label: 'Vendors', href: '/masters/vendors', icon: Store },
      { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
      { label: 'Vehicle Planning', href: '/planning', icon: CalendarClock },
      { label: 'Warehouse', href: '/warehouse', icon: Warehouse },
    ],
  },
  {
    label: 'Trips',
    href: '/trips',
    icon: Route,
    permission: 'trips',
  },
  {
    label: 'Fleet',
    icon: Wrench,
    permission: 'fleet',
    submenu: [
      { label: 'Fuel Entries', href: '/fleet/fuel', icon: Fuel },
      { label: 'Tyres', href: '/fleet/tyres', icon: Disc },
      { label: 'Maintenance', href: '/fleet/maintenance', icon: Wrench },
      { label: 'Incidents', href: '/fleet/incidents', icon: AlertTriangle },
      { label: 'GPS Tracking', href: '/gps', icon: MapPinned },
    ],
  },
  {
    label: 'Quotations',
    href: '/quotations',
    icon: FileSignature,
    permission: 'quotations',
  },
  {
    label: 'Rate Masters',
    icon: DollarSign,
    permission: 'rate-masters',
    submenu: [
      { label: 'Banks', href: '/masters/banks', icon: Wallet },
      { label: 'Goods Types', href: '/masters/goods-types', icon: Package },
      { label: 'Goods Natures', href: '/masters/goods-natures', icon: Boxes },
      { label: 'Freight Rates', href: '/masters/freight-rates', icon: DollarSign },
    ],
  },
  {
    label: 'Accounts',
    icon: Landmark,
    permission: 'accounts',
    submenu: [
      { label: 'Expense & Income', href: '/accounts/entries', icon: Landmark },
      { label: 'Categories', href: '/masters/expense-categories', icon: Tags },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    submenu: [
      { label: 'Users', href: '/settings/users', icon: Users, permission: 'manage-users' },
      { label: 'HR', href: '/hr', icon: Users2, permission: 'manage-users' },
      { label: 'Company Structure', href: '/masters/company', icon: Building, permission: 'app-settings' },
      {
        label: 'Financial Years',
        href: '/settings/financial-years',
        icon: CalendarDays,
        permission: 'financial-years',
      },
      { label: 'App Settings', href: '/admin/settings', icon: Settings, permission: 'app-settings' },
      {
        label: 'Notifications',
        href: '/settings/notifications',
        icon: BellRing,
        permission: 'app-settings',
      },
      {
        label: 'Integrations',
        href: '/settings/integrations',
        icon: Plug,
        permission: 'app-settings',
      },
    ],
  },
];

export interface SuperAdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Transports', href: '/admin/transports', icon: Truck },
  { label: 'Users — All Tenants', href: '/admin/users', icon: Users },
  { label: 'Audit Log', href: '/admin/audit-log', icon: FileText },
  { label: 'Global Settings', href: '/admin/settings', icon: Settings },
];
