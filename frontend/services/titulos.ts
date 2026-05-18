import { apiJson, toQueryString } from './api';

export type TituloType = 'receivable' | 'payable';
export type TituloStatus = 'open' | 'paid' | 'overdue' | 'cancelled';

export interface TituloCategory {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface TituloAccount {
  _id: string;
  name: string;
}

export interface Titulo {
  _id: string;
  description: string;
  type: TituloType;
  amount: number;
  dueDate: string;
  status: TituloStatus;
  category?: TituloCategory | null;
  account?: TituloAccount | null;
  paymentMethod?: string | null;
  notes?: string;
  createdAt: string;
}

export interface TituloFilters {
  type?: TituloType;
  status?: TituloStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface TitulosResponse {
  success: boolean;
  data: Titulo[];
}

interface TituloResponse {
  success: boolean;
  data: Titulo;
}

export async function fetchTitulos(filters: TituloFilters = {}): Promise<Titulo[]> {
  const q = toQueryString(filters as Record<string, unknown>);
  const res = await apiJson<TitulosResponse>(`/titulos${q}`, { method: 'GET' });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createTitulo(data: any): Promise<Titulo> {
  const res = await apiJson<TituloResponse>(`/titulos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTitulo(id: string, data: any): Promise<Titulo> {
  const res = await apiJson<TituloResponse>(`/titulos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTituloStatus(id: string, status: TituloStatus): Promise<Titulo> {
  const res = await apiJson<TituloResponse>(`/titulos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteTitulo(id: string): Promise<void> {
  await apiJson(`/titulos/${id}`, { method: 'DELETE' });
}
