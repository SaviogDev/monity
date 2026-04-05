import { apiJson } from './api';

export interface Insight {
  title: string;
  message: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function fetchMonthlyInsight(month: number, year: number): Promise<Insight> {
  const response = await apiJson<ApiResponse<Insight>>(`/financial/insights?month=${month}&year=${year}`, {
    method: 'GET',
  });
  return response.data;
}