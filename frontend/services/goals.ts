import { apiJson } from './api';

export interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function fetchGoals(): Promise<Goal[]> {
  const response = await apiJson<ApiResponse<Goal[]>>('/goals', {
    method: 'GET',
  });
  return response.data;
}

export async function createGoal(payload: Partial<Goal>): Promise<Goal> {
  const response = await apiJson<ApiResponse<Goal>>('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateGoalAmount(id: string, amountToAdd: number, accountId: string): Promise<Goal> {
  const response = await apiJson<ApiResponse<Goal>>(`/goals/${id}/amount`, {
    method: 'PATCH',
    body: JSON.stringify({ amountToAdd, accountId }), // Enviando a conta
  });
  return response.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await apiJson<ApiResponse<void>>(`/goals/${id}`, {
    method: 'DELETE',
  });
}