import {
  apiJson,
  clearToken as clearStoredToken,
  getToken as getStoredToken,
  setToken as setStoredToken,
} from './api';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

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
  avatarUrl?: string;
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
  inviteCode: string;
}

export interface UpdateMeInput {
  name?: string;
  email?: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const getToken = getStoredToken;
export const setToken = setStoredToken;
export const clearToken = clearStoredToken;

function normalizeUser(user?: RawAuthUser | null): AuthUser {
  return {
    id: String(user?.id || user?._id || ''),
    name: String(user?.name || ''),
    email: String(user?.email || ''),
    avatarUrl: user?.avatarUrl,
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

export const updateProfile = updateMe;

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<PasswordPayload> {
  const response = await apiJson<PasswordResponse>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return normalizePasswordPayload(response.data);
}

interface AvatarResponse {
  success: boolean;
  avatarUrl?: string;
  data?: MePayload | null;
  message?: string;
}

function validateAvatarFile(file: File) {
  const maxSizeInBytes = 5 * 1024 * 1024;

  if (!file.type.startsWith('image/')) {
    throw new Error('Envie uma imagem valida para o perfil.');
  }

  if (file.size > maxSizeInBytes) {
    throw new Error('A imagem deve ter no maximo 5 MB.');
  }
}

function getAvatarExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  validateAvatarFile(file);

  const currentUser = await fetchMe();
  const extension = getAvatarExtension(file);
  const avatarRef = ref(storage, `avatars/${currentUser.id}/profile.${extension}`);

  await uploadBytes(avatarRef, file, {
    contentType: file.type,
  });

  const avatarUrl = await getDownloadURL(avatarRef);

  const response = await apiJson<AvatarResponse>('/auth/avatar', {
    method: 'PUT',
    body: JSON.stringify({ avatarUrl }),
  });

  return {
    avatarUrl:
      response.avatarUrl ||
      response.data?.user?.avatarUrl ||
      avatarUrl,
  };
}

export function logout() {
  clearToken();
}

export async function verifyEmailCode(email: string, code: string) {
  const response = await apiJson('/auth/verify-email', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, code }),
  });
  return response;
}
