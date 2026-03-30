import { apiJson, toQueryString } from './api';

export interface InstallmentPlanCategory {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface InstallmentPlanCreditCard {
  _id: string;
  name: string;
  bankCode?: string | null;
  limit?: number | null;
  closingDay: number;
  dueDay: number;
  color?: string;
  isActive?: boolean;
}

export type InstallmentPlanPaymentMethod =
  | 'pix'
  | 'debit'
  | 'credit'
  | 'cash'
  | 'transfer';

export type InstallmentPlanTransactionSource =
  | 'manual'
  | 'installment'
  | 'recurrence'
  | 'salary'
  | 'carryover'
  | 'financing';

export interface InstallmentPlanEmbeddedData {
  totalInstallments: number;
  currentInstallment: number;
  installmentAmount: number;
  totalAmount?: number;
  purchaseDate: string;
  description?: string;
  valueMode?: 'total' | 'installment';
}

export interface InstallmentPlanTransaction {
  _id: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod: InstallmentPlanPaymentMethod;
  transactionDate: string;
  status: 'confirmed' | 'planned';
  source: InstallmentPlanTransactionSource;
  groupId?: string | null;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentIndex?: number | null;
  installmentCount?: number | null;
  installmentPlan?: InstallmentPlanEmbeddedData | null;
  category?: InstallmentPlanCategory | null;
  creditCard?: InstallmentPlanCreditCard | null;
}

export interface InstallmentPlan {
  _id: string;
  groupId: string;
  description?: string;
  totalAmount: number;
  installmentAmount: number;
  installmentCount: number;
  currentInstallment: number;
  valueMode: 'total' | 'installment';
  purchaseDate: string;
  notes?: string;
  status?: 'active' | 'cancelled' | 'completed';
  category: InstallmentPlanCategory;
  creditCard: InstallmentPlanCreditCard;
  transactions?: InstallmentPlanTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InstallmentPlanPayload {
  groupId?: string;
  description?: string;
  totalAmount: number;
  installmentAmount: number;
  installmentCount: number;
  currentInstallment?: number;
  valueMode?: 'total' | 'installment';
  category: string;
  creditCard: string;
  purchaseDate: string;
  notes?: string;
}

interface InstallmentPlansResponse {
  success: boolean;
  data: InstallmentPlan[];
  message?: string;
}

interface InstallmentPlanResponse {
  success: boolean;
  data: InstallmentPlan;
  message?: string;
}

export async function fetchInstallmentPlans(filters: Record<string, unknown> = {}) {
  const query = toQueryString(filters);

  const response = await apiJson<InstallmentPlansResponse>(`/installment-plans${query}`, {
    method: 'GET',
  });

  return response.data;
}

export async function fetchInstallmentPlanById(id: string) {
  const response = await apiJson<InstallmentPlanResponse>(`/installment-plans/${id}`, {
    method: 'GET',
  });

  return response.data;
}

export async function createInstallmentPlan(payload: InstallmentPlanPayload) {
  const response = await apiJson<InstallmentPlanResponse>('/installment-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}