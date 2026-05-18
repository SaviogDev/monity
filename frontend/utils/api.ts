export function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}
