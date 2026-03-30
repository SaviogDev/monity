import { apiJson, toQueryString } from './api';

export interface TransactionCategory {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface TransactionAccount {
  _id: string;
  name: string;
  type: 'checking' | 'wallet' | 'cash' | 'savings';
  bankCode?: string | null;
  color?: string;
}

export interface TransactionCreditCard {
  _id: string;
  name: string;
  bankCode?: string | null;
  color?: string;
  closingDay: number;
  dueDay: number;
}

export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'transfer';
export type TransactionStatus = 'confirmed' | 'planned';
export type TransactionType = 'income' | 'expense';

export type TransactionSource =
  | 'manual'
  | 'installment'
  | 'recurrence'
  | 'salary'
  | 'carryover'
  | 'financing';

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type InstallmentValueMode = 'total' | 'installment';

export interface RecurringRuleReference {
  _id?: string;
  type: TransactionType;
  value: number;
  category: string | TransactionCategory;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
}

export interface InstallmentPlanReference {
  _id?: string;
  totalInstallments: number;
  currentInstallment: number;
  installmentAmount: number;
  totalAmount?: number;
  purchaseDate: string;
  description?: string;
  valueMode?: InstallmentValueMode;
}

export interface Transaction {
  _id: string;
  description?: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  account: TransactionAccount | null;
  creditCard: TransactionCreditCard | null;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  status: TransactionStatus;
  source: TransactionSource;
  notes?: string;
  groupId?: string | null;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentPlan?: InstallmentPlanReference | string | null;
  installmentIndex?: number | null;
  installmentCount?: number | null;
  recurrenceRule?: RecurringRuleReference | string | null;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
  balance: number;
}

export interface TransactionFilters extends Record<string, unknown> {
  type?: TransactionType;
  category?: string;
  account?: string;
  creditCard?: string;
  paymentMethod?: PaymentMethod;
  status?: TransactionStatus;
  source?: TransactionSource;
  search?: string;
  month?: number | string;
  year?: number | string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionPayload {
  description?: string;
  amount: number;
  type: TransactionType;
  category: string;
  account?: string | null;
  creditCard?: string | null;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  status?: TransactionStatus;
  source?: TransactionSource;
  notes?: string;
  groupId?: string | null;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentPlan?: InstallmentPlanReference | string | null;
  installmentIndex?: number | null;
  installmentCount?: number | null;
  recurrenceRule?: RecurringRuleReference | string | null;
}

interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  message?: string;
}

interface SummaryResponse {
  success: boolean;
  data: TransactionSummary;
  message?: string;
}

interface MutationResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function fetchTransactions(filters: TransactionFilters = {}) {
  const query = toQueryString(filters);

  const response = await apiJson<TransactionsResponse>(`/transactions${query}`, {
    method: 'GET',
  });

  return response.data;
}

export async function fetchTransactionById(id: string) {
  const response = await apiJson<MutationResponse<Transaction>>(`/transactions/${id}`, {
    method: 'GET',
  });

  return response.data;
}

export async function fetchTransactionSummary(filters: TransactionFilters = {}) {
  const query = toQueryString(filters);

  const response = await apiJson<SummaryResponse>(`/transactions/summary${query}`, {
    method: 'GET',
  });

  return response.data;
}

export async function createTransaction(payload: TransactionPayload) {
  const response = await apiJson<MutationResponse<Transaction>>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateTransaction(id: string, payload: Partial<TransactionPayload>) {
  const response = await apiJson<MutationResponse<Transaction>>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function deleteTransaction(id: string) {
  return apiJson<MutationResponse<{ message: string }>>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}