import { apiJson, toQueryString } from './api';

export interface CreditCardLinkedAccount {
  _id: string;
  name: string;
  type?: string;
  color?: string | null;
  currentBalance?: number | null;
  isActive?: boolean;
}

export interface CreditCard {
  _id: string;
  name: string;
  bankCode?: string | null;
  limit?: number | null;
  availableLimit?: number | null;
  linkedAccount?: CreditCardLinkedAccount | null;
  closingDay: number;
  dueDay: number;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardFilters extends Record<string, unknown> {
  isActive?: boolean | string;
  search?: string;
}

export interface CreditCardPayload {
  name: string;
  bankCode?: string | null;
  limit?: number | null;
  linkedAccount?: string | null;
  closingDay: number;
  dueDay: number;
  color?: string;
  isActive?: boolean;
}

interface CreditCardsResponse {
  success: boolean;
  data: CreditCard[];
  message?: string;
}

interface CreditCardResponse {
  success: boolean;
  data: CreditCard;
  message?: string;
}

interface MutationResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function isNil(value: unknown) {
  return value === null || value === undefined;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLinkedAccountId(value: unknown): string | null | undefined {
  if (typeof value === 'undefined') return undefined;
  if (value === null || value === '') return null;

  if (typeof value !== 'string') {
    throw new Error('Conta vinculada inválida.');
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeBooleanFilter(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

function normalizeNumberOrNull(value: unknown): number | null | undefined {
  if (isNil(value) || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Valor numérico inválido para cartão.');
    }
    return value;
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'));
    if (!Number.isFinite(normalized)) {
      throw new Error('Valor numérico inválido para cartão.');
    }
    return normalized;
  }

  throw new Error('Valor numérico inválido para cartão.');
}

function normalizeDay(value: unknown, fieldLabel: string): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 31) {
    throw new Error(`${fieldLabel} deve ser um número inteiro entre 1 e 31.`);
  }

  return numericValue;
}

function normalizeCreditCardFilters(filters: CreditCardFilters = {}) {
  const normalized: Record<string, string | boolean> = {};

  const search = normalizeOptionalString(filters.search);
  const isActive = normalizeBooleanFilter(filters.isActive);

  if (search) {
    normalized.search = search;
  }

  if (!isNil(isActive)) {
    normalized.isActive = isActive;
  }

  return normalized;
}

function normalizeCreditCardPayload(payload: CreditCardPayload | Partial<CreditCardPayload>) {
  const normalized: Partial<CreditCardPayload> = {};

  if ('name' in payload) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw new Error('Nome do cartão é obrigatório.');
    }
    normalized.name = name;
  }

  if ('bankCode' in payload) {
    normalized.bankCode = normalizeOptionalString(payload.bankCode);
  }

  if ('limit' in payload) {
    const limit = normalizeNumberOrNull(payload.limit);
    if (limit !== null && limit !== undefined && limit < 0) {
      throw new Error('O limite do cartão não pode ser negativo.');
    }
    normalized.limit = limit ?? null;
  }

  if ('linkedAccount' in payload) {
    normalized.linkedAccount = normalizeLinkedAccountId(payload.linkedAccount);
  }

  if ('closingDay' in payload) {
    normalized.closingDay = normalizeDay(payload.closingDay, 'Closing day');
  }

  if ('dueDay' in payload) {
    normalized.dueDay = normalizeDay(payload.dueDay, 'Due day');
  }

  if ('color' in payload) {
    normalized.color = normalizeOptionalString(payload.color) ?? '#2563EB';
  }

  if ('isActive' in payload && typeof payload.isActive !== 'undefined') {
    normalized.isActive = Boolean(payload.isActive);
  }

  return normalized;
}

export async function fetchCreditCards(filters: CreditCardFilters = {}) {
  const query = toQueryString(normalizeCreditCardFilters(filters));

  const response = await apiJson<CreditCardsResponse>(`/credit-cards${query}`, {
    method: 'GET',
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchCreditCardById(id: string) {
  const response = await apiJson<CreditCardResponse>(`/credit-cards/${id}`, {
    method: 'GET',
  });

  return response.data;
}

export async function createCreditCard(payload: CreditCardPayload) {
  const normalizedPayload = normalizeCreditCardPayload(payload) as CreditCardPayload;

  const response = await apiJson<MutationResponse<CreditCard>>('/credit-cards', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  });

  return response.data;
}

export async function updateCreditCard(id: string, payload: Partial<CreditCardPayload>) {
  const normalizedPayload = normalizeCreditCardPayload(payload);

  const response = await apiJson<MutationResponse<CreditCard>>(`/credit-cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(normalizedPayload),
  });

  return response.data;
}

export async function deleteCreditCard(id: string) {
  const response = await apiJson<MutationResponse<{ message?: string }>>(`/credit-cards/${id}`, {
    method: 'DELETE',
  });

  return response.data;
}