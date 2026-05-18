import { getApiBaseUrl } from '@/utils/api';

export async function seedDemoData() {
  const token = localStorage.getItem('monity_token') || '';
  const response = await fetch(`${getApiBaseUrl()}/demo/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao carregar dados de demonstração.');
  }

  return response.json();
}

export async function clearDemoData() {
  const token = localStorage.getItem('monity_token') || '';
  const response = await fetch(`${getApiBaseUrl()}/demo/clear`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Falha ao remover dados de demonstração.');
  }

  return response.json();
}

export async function checkDemoStatus() {
  const token = localStorage.getItem('monity_token') || '';
  const response = await fetch(`${getApiBaseUrl()}/demo/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return { hasDemo: false };
  return response.json();
}
