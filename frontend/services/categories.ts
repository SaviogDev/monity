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
  data?: Category[] | { data?: Category[]; categories?: Category[] };
  categories?: Category[];
  message?: string;
}

interface MutationResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function normalizeCategoriesResponse(response: CategoryListResponse) {
  const raw =
    Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data?.categories)
      ? response.data.categories
      : Array.isArray(response.categories)
      ? response.categories
      : [];

  return [...raw].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'income' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export async function fetchCategories(filters: CategoryFilters = {}) {
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