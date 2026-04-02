export interface DriverSessionUser {
  id: number;
  driver_name: string;
  username: string;
  mobile: string;
  vehicle_no?: string;
}

const DRIVER_TOKEN_KEY = 'driver_auth_token';
const DRIVER_USER_KEY = 'driver_auth_user';

export function getDriverToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DRIVER_TOKEN_KEY);
}

export function getDriverUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DRIVER_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DriverSessionUser;
  } catch {
    return null;
  }
}

export function setDriverSession(token: string, user: DriverSessionUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRIVER_TOKEN_KEY, token);
  localStorage.setItem(DRIVER_USER_KEY, JSON.stringify(user));
}

export function clearDriverSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRIVER_TOKEN_KEY);
  localStorage.removeItem(DRIVER_USER_KEY);
}

export async function driverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getDriverToken();
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
