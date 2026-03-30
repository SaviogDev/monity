import {
  apiJson,
  clearToken as clearStoredToken,
  getToken as getStoredToken,
  setToken as setStoredToken,
} from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthPayload {
  token: string;
  user: AuthUser;
}

interface AuthResponse {
  success: boolean;
  data: AuthPayload;
  message?: string;
}

interface MePayload {
  user: AuthUser;
}

interface MeResponse {
  success: boolean;
  data: MePayload;
  message?: string;
}

interface PasswordPayload {
  message: string;
}

interface PasswordResponse {
  success: boolean;
  data: PasswordPayload;
  message?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name: string;
}

interface UpdateMeInput {
  name: string;
}

interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const getToken = getStoredToken;
export const setToken = setStoredToken;
export const clearToken = clearStoredToken;

export async function login(payload: LoginInput) {
  const response = await apiJson<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });

  if (response.data?.token) {
    setToken(response.data.token);
  }

  return response.data;
}

export async function register(payload: RegisterInput) {
  const response = await apiJson<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });

  if (response.data?.token) {
    setToken(response.data.token);
  }

  return response.data;
}

export async function fetchMe() {
  const response = await apiJson<MeResponse>('/auth/me', {
    method: 'GET',
  });

  return response.data.user;
}

export async function updateMe(payload: UpdateMeInput) {
  const response = await apiJson<MeResponse>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.user;
}

export async function updatePassword(payload: UpdatePasswordInput) {
  const response = await apiJson<PasswordResponse>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data;
}