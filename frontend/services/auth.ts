import {
  apiJson,
  clearToken as clearStoredToken,
  getToken as getStoredToken,
  setToken as setStoredToken,
} from './api';

// ATUALIZADO: Adicionada a propriedade avatarUrl na interface principal
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; 
}

// ATUALIZADO: Adicionada a propriedade avatarUrl na interface bruta do banco
interface RawAuthUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface AuthPayload {
  token: string;
  user: RawAuthUser;
}

interface AuthResponse {
  success: boolean;
  data?: AuthPayload | null;
  message?: string;
}

interface MePayload {
  user: RawAuthUser;
}

interface MeResponse {
  success: boolean;
  data?: MePayload | null;
  message?: string;
}

interface PasswordPayload {
  message: string;
}

interface PasswordResponse {
  success: boolean;
  data?: PasswordPayload | null;
  message?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface UpdateMeInput {
  name: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const getToken = getStoredToken;
export const setToken = setStoredToken;
export const clearToken = clearStoredToken;

// ATUALIZADO: A função normalizeUser agora repassa o avatarUrl para o Frontend
function normalizeUser(user?: RawAuthUser | null): AuthUser {
  return {
    id: String(user?.id || user?._id || ''),
    name: String(user?.name || ''),
    email: String(user?.email || ''),
    avatarUrl: user?.avatarUrl, // Mapeia o campo vindo do banco/API
  };
}

function normalizePasswordPayload(payload?: PasswordPayload | null): PasswordPayload {
  return {
    message: String(payload?.message || ''),
  };
}

export async function login(payload: LoginInput): Promise<AuthPayload> {
  const response = await apiJson<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });

  const data: AuthPayload = {
    token: String(response.data?.token || ''),
    user: normalizeUser(response.data?.user),
  };

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

export async function register(payload: RegisterInput): Promise<AuthPayload> {
  const response = await apiJson<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });

  const data: AuthPayload = {
    token: String(response.data?.token || ''),
    user: normalizeUser(response.data?.user),
  };

  if (data.token) {
    setToken(data.token);
  }

  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await apiJson<MeResponse>('/auth/me', {
    method: 'GET',
  });

  return normalizeUser(response.data?.user);
}

export async function updateMe(payload: UpdateMeInput): Promise<AuthUser> {
  const response = await apiJson<MeResponse>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return normalizeUser(response.data?.user);
}

export async function updatePassword(
  payload: UpdatePasswordInput
): Promise<PasswordPayload> {
  const response = await apiJson<PasswordResponse>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return normalizePasswordPayload(response.data);
}

export function logout() {
  clearToken();
}