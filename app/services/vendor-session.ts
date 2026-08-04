export interface VendorSessionUser {
  id: number;
  vendor_name: string;
  username: string;
  mobile: string;
}

const VENDOR_TOKEN_KEY = 'vendor_auth_token';
const VENDOR_USER_KEY = 'vendor_auth_user';

export function getVendorToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VENDOR_TOKEN_KEY);
}

export function getVendorUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(VENDOR_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VendorSessionUser;
  } catch {
    return null;
  }
}

export function setVendorSession(token: string, user: VendorSessionUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VENDOR_TOKEN_KEY, token);
  localStorage.setItem(VENDOR_USER_KEY, JSON.stringify(user));
}

export function clearVendorSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VENDOR_TOKEN_KEY);
  localStorage.removeItem(VENDOR_USER_KEY);
}

export async function vendorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getVendorToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data && ('error' in data || 'message' in data)
        ? String((data as any).error || (data as any).message)
        : '') || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return data as T;
}
