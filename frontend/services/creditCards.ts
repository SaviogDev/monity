import { apiJson, toQueryString } from './api';

export interface CreditCard {
  _id: string;
  name: string;
  bankCode?: string | null;
  limit?: number | null;
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

export async function fetchCreditCards(filters: CreditCardFilters = {}) {
  const query = toQueryString(filters);

  const response = await apiJson<CreditCardsResponse>(`/credit-cards${query}`, {
    method: 'GET',
  });

  return response.data;
}

export async function fetchCreditCardById(id: string) {
  const response = await apiJson<CreditCardResponse>(`/credit-cards/${id}`, {
    method: 'GET',
  });

  return response.data;
}

export async function createCreditCard(payload: CreditCardPayload) {
  const response = await apiJson<MutationResponse<CreditCard>>('/credit-cards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateCreditCard(id: string, payload: Partial<CreditCardPayload>) {
  const response = await apiJson<MutationResponse<CreditCard>>(`/credit-cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function deleteCreditCard(id: string) {
  return apiJson<MutationResponse<{ message?: string }>>(`/credit-cards/${id}`, {
    method: 'DELETE',
  });
}