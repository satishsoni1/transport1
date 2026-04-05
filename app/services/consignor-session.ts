export interface ConsignorSessionUser {
  id: number;
  name: string;
  username: string;
  city?: string;
  mobile?: string;
}

const CONSIGNOR_TOKEN_KEY = 'consignor_auth_token';
const CONSIGNOR_USER_KEY = 'consignor_auth_user';

export function getConsignorToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSIGNOR_TOKEN_KEY);
}

export function getConsignorUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CONSIGNOR_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ConsignorSessionUser;
  } catch {
    return null;
  }
}

export function setConsignorSession(token: string, user: ConsignorSessionUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSIGNOR_TOKEN_KEY, token);
  localStorage.setItem(CONSIGNOR_USER_KEY, JSON.stringify(user));
}

export function clearConsignorSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSIGNOR_TOKEN_KEY);
  localStorage.removeItem(CONSIGNOR_USER_KEY);
}

export async function consignorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getConsignorToken();
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
