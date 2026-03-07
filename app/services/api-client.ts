export interface ApiClientOptions {
  baseUrl?: string;
}

const defaultOptions: Required<ApiClientOptions> = {
  baseUrl: '',
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
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? (data as any).error
        : response.statusText || 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

async function get<T>(path: string, options?: ApiClientOptions): Promise<T> {
  const url = resolveUrl(path, options);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

async function post<T, B = unknown>(
  path: string,
  body: B,
  options?: ApiClientOptions
): Promise<T> {
  const url = resolveUrl(path, options);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function put<T, B = unknown>(
  path: string,
  body: B,
  options?: ApiClientOptions
): Promise<T> {
  const url = resolveUrl(path, options);
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function del<T>(path: string, options?: ApiClientOptions): Promise<T> {
  const url = resolveUrl(path, options);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export const apiClient = {
  get,
  post,
  put,
  delete: del,
};

