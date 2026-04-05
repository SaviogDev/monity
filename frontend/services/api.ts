const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000';

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, '');

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

function normalizePath(path: string) {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function buildApiUrl(path: string) {
  const baseUrl = normalizeApiBaseUrl(RAW_API_URL);
  const normalizedPath = normalizePath(path);

  if (normalizedPath === '/api') {
    return baseUrl;
  }

  if (normalizedPath.startsWith('/api/')) {
    return `${baseUrl}${normalizedPath.slice(4)}`;
  }

  return `${baseUrl}${normalizedPath}`;
}

export const API_URL = normalizeApiBaseUrl(RAW_API_URL);

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status = 500, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get unauthorized() {
    return this.status === 401;
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('monity_token');
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('monity_token', token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('monity_token');
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  expectJson?: boolean;
};

function extractErrorMessage(data: unknown, fallback: string) {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    if ('message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if ('error' in data) {
      const error = (data as { error?: unknown }).error;
      if (typeof error === 'string' && error.trim()) {
        return error;
      }
    }
  }

  return fallback;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

export async function apiRequest(
  path: string,
  { auth = true, expectJson = true, ...options }: ApiRequestOptions = {}
) {
  const headers = new Headers(options.headers || {});
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (auth) {
    const token = getToken();

    if (!token) {
      throw new ApiError('UNAUTHORIZED', 401);
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
      0,
      error
    );
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError('UNAUTHORIZED', 401, data);
    }

    throw new ApiError(
      extractErrorMessage(data, `Erro ${response.status} ao processar requisição`),
      response.status,
      data
    );
  }

  if (!expectJson) {
    return response;
  }

  return data;
}

export async function apiJson<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest(path, { ...options, expectJson: true }) as Promise<T>;
}

export function toQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === '') return;
        searchParams.append(key, String(item));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}