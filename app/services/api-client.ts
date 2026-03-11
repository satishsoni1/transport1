export interface ApiClientOptions {
  baseUrl?: string;
}

const defaultOptions: Required<ApiClientOptions> = {
  baseUrl: '',
};

const REQUEST_TIMEOUT_MS = 20000;

type ApiErrorBody = {
  error?: string;
  message?: string;
};

function resolveUrl(path: string, options?: ApiClientOptions) {
  const { baseUrl } = { ...defaultOptions, ...options };
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
  // Default: same-origin relative path (Next.js API routes)
  return path.startsWith('/') ? path : `/${path}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? await response
        .json()
        .catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const errorData =
      typeof data === 'object' && data !== null ? (data as ApiErrorBody) : null;
    const message =
      errorData?.error ||
      errorData?.message ||
      response.statusText ||
      'Request failed';

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw new Error(message);
  }

  return data as T;
}

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function withAuthHeaders(headers: HeadersInit = {}) {
  const token = getAuthToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function request<T, B = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: B,
  options?: ApiClientOptions
): Promise<T> {
  const url = resolveUrl(path, options);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: withAuthHeaders({
        'Accept': 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    });
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error. Please check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function get<T>(path: string, options?: ApiClientOptions): Promise<T> {
  return request<T>('GET', path, undefined, options);
}

async function post<T, B = unknown>(
  path: string,
  body: B,
  options?: ApiClientOptions
): Promise<T> {
  return request<T, B>('POST', path, body, options);
}

async function put<T, B = unknown>(
  path: string,
  body: B,
  options?: ApiClientOptions
): Promise<T> {
  return request<T, B>('PUT', path, body, options);
}

async function del<T>(path: string, options?: ApiClientOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, options);
}

export const apiClient = {
  get,
  post,
  put,
  delete: del,
};
