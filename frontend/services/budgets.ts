import { apiJson, toQueryString } from './api';

export interface BudgetCategory {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Budget {
  _id: string;
  category: BudgetCategory;
  month: number;
  year: number;
  limit: number;
  spent: number; // calculado pelo backend
}

interface BudgetsResponse {
  success: boolean;
  data: Budget[];
}

interface BudgetResponse {
  success: boolean;
  data: Budget;
}

export async function fetchBudgets(month: number, year: number): Promise<Budget[]> {
  const q = toQueryString({ month, year });
  const res = await apiJson<BudgetsResponse>(`/budgets${q}`, { method: 'GET' });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createBudget(payload: {
  category: string;
  month: number;
  year: number;
  limit: number;
}): Promise<Budget> {
  const res = await apiJson<BudgetResponse>('/budgets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateBudget(id: string, limit: number): Promise<Budget> {
  const res = await apiJson<BudgetResponse>(`/budgets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ limit }),
  });
  return res.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await apiJson(`/budgets/${id}`, { method: 'DELETE' });
}
