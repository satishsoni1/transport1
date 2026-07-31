export const STAFF_ROLES = ['Transport Admin', 'Manager', 'Accountant', 'Operator'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type PermissionKey =
  | 'daily-entry'
  | 'reports'
  | 'print-export'
  | 'parties'
  | 'logistics'
  | 'rate-masters'
  | 'manage-users'
  | 'financial-years'
  | 'app-settings'
  | 'accounts';

const ALL_PERMISSIONS: PermissionKey[] = [
  'daily-entry',
  'reports',
  'print-export',
  'parties',
  'logistics',
  'rate-masters',
  'manage-users',
  'financial-years',
  'app-settings',
  'accounts',
];

export const ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  'Transport Admin': ALL_PERMISSIONS,
  Manager: ['daily-entry', 'reports', 'print-export', 'parties', 'logistics', 'rate-masters', 'accounts'],
  Accountant: ['daily-entry', 'reports', 'print-export', 'parties', 'rate-masters', 'accounts'],
  Operator: ['daily-entry', 'print-export'],
};

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return !!value && (STAFF_ROLES as readonly string[]).includes(value);
}

/**
 * Single source of truth for menu visibility (client) and route guards (server).
 * Super admin is identified purely by platformRole, never by the role string.
 */
export function can(
  user: { role?: string | null; platformRole?: string | null } | null | undefined,
  key: PermissionKey
): boolean {
  if (!user) return false;
  if (user.platformRole === 'super_admin') return true;
  if (!isStaffRole(user.role)) return false;
  return ROLE_PERMISSIONS[user.role].includes(key);
}
