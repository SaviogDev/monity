import { apiJson } from './api';
import type { Account } from './accounts';
import type { Category } from './categories';

export interface FinancingSummary {
  activeContracts: number;
  totalDebt: number;
  monthlyCommitment: number;
}

export type FinancingStatus = 'active' | 'completed' | 'cancelled';

export interface Financing {
  _id: string;
  description: string;
  totalAmount: number;
  financedAmount: number;
  downPayment: number;
  installmentValue: number;
  totalInstallments: number;
  currentInstallment?: number;
  startDate: string;
  endDate: string;
  category: string | Category;
  account: string | Account;
  status: FinancingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancingPayload {
  description: string;
  totalAmount: number;
  downPayment: number;
  installmentValue: number;
  totalInstallments: number;
  currentInstallment?: number;
  startDate: string;
  category: string;
  account: string;
}

export interface UpdateFinancingPayload {
  description?: string;
  category?: string;
  status?: FinancingStatus;
  installmentValue?: number;
  totalInstallments?: number;
  currentInstallment?: number;
  startDate?: string;
  account?: string;
  totalAmount?: number;
  downPayment?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function compareByDateDesc(a: Financing, b: Financing) {
  const aTime = new Date(a.createdAt || a.startDate).getTime();
  const bTime = new Date(b.createdAt || b.startDate).getTime();
  return bTime - aTime;
}

function normalizeFinancings(data: Financing[] | null | undefined): Financing[] {
  if (!Array.isArray(data)) return [];

  const byId = new Map<string, Financing>();

  for (const item of data) {
    if (!item?._id) continue;
    byId.set(String(item._id), item);
  }

  return Array.from(byId.values()).sort(compareByDateDesc);
}

export async function fetchFinancings(): Promise<Financing[]> {
  const response = await apiJson<ApiResponse<Financing[]>>('/financings', {
    method: 'GET',
  });

  return normalizeFinancings(response.data);
}

export async function fetchFinancingSummary(): Promise<FinancingSummary> {
  const response = await apiJson<ApiResponse<FinancingSummary>>('/financings/summary', {
    method: 'GET',
  });

  return response.data;
}

export async function createFinancing(payload: CreateFinancingPayload): Promise<Financing> {
  const financedAmount = roundMoney(payload.totalAmount - payload.downPayment);

  if (financedAmount <= 0) {
    throw new Error('O valor financiado precisa ser maior que zero.');
  }

  const response = await apiJson<ApiResponse<Financing>>('/financings', {
    method: 'POST',
    body: JSON.stringify({
      description: payload.description.trim(),
      totalAmount: roundMoney(payload.totalAmount),
      downPayment: roundMoney(payload.downPayment),
      installmentValue: roundMoney(payload.installmentValue),
      totalInstallments: payload.totalInstallments,
      currentInstallment: payload.currentInstallment || 1,
      startDate: payload.startDate,
      category: payload.category,
      account: payload.account,
    }),
  });

  return response.data;
}

export async function updateFinancing(
  id: string,
  payload: UpdateFinancingPayload
): Promise<Financing> {
  const response = await apiJson<ApiResponse<Financing>>(`/financings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.installmentValue !== undefined
        ? { installmentValue: roundMoney(payload.installmentValue) }
        : {}),
      ...(payload.totalInstallments !== undefined ? { totalInstallments: payload.totalInstallments } : {}),
      ...(payload.currentInstallment !== undefined ? { currentInstallment: payload.currentInstallment } : {}),
      ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
      ...(payload.account !== undefined ? { account: payload.account } : {}),
      ...(payload.totalAmount !== undefined ? { totalAmount: roundMoney(payload.totalAmount) } : {}),
      ...(payload.downPayment !== undefined ? { downPayment: roundMoney(payload.downPayment) } : {}),
    }),
  });

  return response.data;
}

export async function deleteFinancing(id: string): Promise<{ message: string; deletedCount?: number }> {
  const response = await apiJson<ApiResponse<{ message: string; deletedCount?: number }>>(
    `/financings/${id}`,
    {
      method: 'DELETE',
    }
  );

  return response.data;
}
