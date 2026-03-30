import { apiJson, toQueryString } from './api';

export interface RecurringRuleCategory {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface RecurringRuleAccount {
  _id: string;
  name: string;
  type: 'checking' | 'wallet' | 'cash' | 'savings';
  bankCode?: string | null;
  color?: string;
}

export interface RecurringRuleCreditCard {
  _id: string;
  name: string;
  bankCode?: string | null;
  limit?: number | null;
  closingDay: number;
  dueDay: number;
  color?: string;
  isActive?: boolean;
}

export type RecurringRuleType = 'income' | 'expense';
export type RecurringRulePaymentMethod =
  | 'pix'
  | 'debit'
  | 'credit'
  | 'cash'
  | 'transfer';

export type RecurringRuleFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface RecurringRule {
  _id: string;
  description?: string;
  type: RecurringRuleType;
  amount: number;
  category: RecurringRuleCategory;
  account: RecurringRuleAccount | null;
  creditCard: RecurringRuleCreditCard | null;
  paymentMethod: RecurringRulePaymentMethod;
  frequency: RecurringRuleFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  startDate: string;
  endDate?: string | null;
  lastExecutionDate?: string | null;
  nextExecutionDate?: string | null;
  isActive: boolean;
  autoGenerate: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurringRulePayload {
  description?: string;
  type: RecurringRuleType;
  amount: number;
  category: string;
  account?: string | null;
  creditCard?: string | null;
  paymentMethod: RecurringRulePaymentMethod;
  frequency: RecurringRuleFrequency;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  startDate: string;
  endDate?: string | null;
  autoGenerate?: boolean;
  isActive?: boolean;
  notes?: string;
}

interface RecurringRulesResponse {
  success: boolean;
  data: RecurringRule[];
  message?: string;
}

interface RecurringRuleResponse {
  success: boolean;
  data: RecurringRule;
  message?: string;
}

export async function fetchRecurringRules(filters: Record<string, unknown> = {}) {
  const query = toQueryString(filters);

  const response = await apiJson<RecurringRulesResponse>(`/recurring-rules${query}`, {
    method: 'GET',
  });

  return response.data;
}

export async function fetchRecurringRuleById(id: string) {
  const response = await apiJson<RecurringRuleResponse>(`/recurring-rules/${id}`, {
    method: 'GET',
  });

  return response.data;
}

export async function createRecurringRule(payload: RecurringRulePayload) {
  const response = await apiJson<RecurringRuleResponse>('/recurring-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}