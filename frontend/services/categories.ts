import { apiJson, toQueryString } from './api';

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryFilters extends Record<string, unknown> {
  limit?: number;
  type?: 'income' | 'expense';
  search?: string;
}

export interface CategoryPayload {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

interface CategoryListResponse {
  success: boolean;
  data?: Category[];
  message?: string;
}

interface MutationResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function normalizeCategoriesResponse(response: CategoryListResponse): Category[] {
  if (!Array.isArray(response.data)) {
    return [];
  }

  return [...response.data].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'income' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export async function fetchCategories(filters: CategoryFilters = {}): Promise<Category[]> {
  const query = toQueryString(filters);

  const response = await apiJson<CategoryListResponse>(`/categories${query}`, {
    method: 'GET',
  });

  return normalizeCategoriesResponse(response);
}

export async function createCategory(payload: CategoryPayload) {
  return apiJson<MutationResponse<Category>>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  return apiJson<MutationResponse<Category>>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: string) {
  return apiJson<MutationResponse<null>>(`/categories/${id}`, {
    method: 'DELETE',
  });
}