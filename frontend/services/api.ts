const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export { API_URL };

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
  return localStorage.getItem('monity_token');
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('monity_token', token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('monity_token');
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  expectJson?: boolean;
};

function extractErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export async function apiRequest(
  path: string,
  { auth = true, expectJson = true, ...options }: ApiRequestOptions = {}
) {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
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
    response = await fetch(`${API_URL}${path}`, {
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

  if (!expectJson) {
    if (!response.ok) {
      throw new ApiError(`Erro ${response.status}`, response.status);
    }

    return response;
  }

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

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
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}