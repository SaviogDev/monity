import { apiJson, toQueryString } from './api';
import type { Transaction } from './transactions';

export interface PeriodSummary {
  income: number;
  expense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyPoint {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
}

interface SummaryResponse {
  success: boolean;
  data: PeriodSummary;
}

export async function fetchReportTransactions(filters: {
  startDate: string;
  endDate: string;
  type?: 'income' | 'expense';
  category?: string;
  account?: string;
}): Promise<Transaction[]> {
  const q = toQueryString(filters as Record<string, unknown>);
  const res = await apiJson<TransactionsResponse>(`/transactions${q}`, { method: 'GET' });
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchReportSummary(filters: {
  startDate: string;
  endDate: string;
}): Promise<PeriodSummary> {
  const q = toQueryString(filters as Record<string, unknown>);
  const res = await apiJson<SummaryResponse>(`/transactions/summary${q}`, { method: 'GET' });
  return res.data;
}

/** Computa breakdown por categoria no cliente (evita nova rota no backend) */
export function computeCategoryBreakdown(
  transactions: Transaction[],
  type: 'income' | 'expense'
): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  let total = 0;

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const cat = tx.category;
    const id = cat?._id || 'sem-categoria';
    const name = cat?.name || 'Sem categoria';
    const color = cat?.color;

    const existing = map.get(id);
    if (existing) {
      existing.total += tx.amount;
      existing.count += 1;
    } else {
      map.set(id, { categoryId: id, categoryName: name, categoryColor: color, total: tx.amount, count: 1, percentage: 0 });
    }
    total += tx.amount;
  }

  return Array.from(map.values())
    .map((item) => ({ ...item, percentage: total > 0 ? (item.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Agrupa transações por mês para gráfico de evolução */
export function computeMonthlyEvolution(transactions: Transaction[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();

  for (const tx of transactions) {
    const d = new Date(tx.transactionDate);
    if (isNaN(d.getTime())) continue;
    const m = d.getUTCMonth() + 1;
    const y = d.getUTCFullYear();
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);

    if (!map.has(key)) {
      map.set(key, { month: m, year: y, label, income: 0, expense: 0, balance: 0 });
    }
    const pt = map.get(key)!;
    if (tx.type === 'income') pt.income += tx.amount;
    else pt.expense += tx.amount;
    pt.balance = pt.income - pt.expense;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}
