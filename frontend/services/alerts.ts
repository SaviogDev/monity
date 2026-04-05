import { apiJson } from './api';

export type AlertSeverity = 'high' | 'medium' | 'low';

export type FinancialAlertType =
  | 'negative_balance'
  | 'card_limit'
  | 'upcoming_due'
  | 'recurring_rule'
  | 'installment_pressure'
  | 'financing_pressure'
  | 'cashflow_risk'
  | 'custom';

export interface FinancialAlert {
  type: FinancialAlertType | string;
  severity: AlertSeverity;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface AlertsSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface AlertsResponse {
  success: boolean;
  data?: {
    alerts?: FinancialAlert[];
    summary?: AlertsSummary;
  };
  message?: string;
}

function normalizeSeverity(value: unknown): AlertSeverity {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'low';
}

function normalizeAlert(alert: FinancialAlert): FinancialAlert {
  return {
    ...alert,
    type: alert.type || 'custom',
    severity: normalizeSeverity(alert.severity),
    title: String(alert.title || ''),
    message: String(alert.message || ''),
    meta:
      alert.meta && typeof alert.meta === 'object' && !Array.isArray(alert.meta)
        ? alert.meta
        : {},
  };
}

function normalizeAlertsSummary(summary?: AlertsSummary | null): AlertsSummary {
  return {
    total: Number(summary?.total || 0),
    high: Number(summary?.high || 0),
    medium: Number(summary?.medium || 0),
    low: Number(summary?.low || 0),
  };
}

export async function fetchAlerts(): Promise<{
  alerts: FinancialAlert[];
  summary: AlertsSummary;
}> {
  const response = await apiJson<AlertsResponse>('/alerts', {
    method: 'GET',
  });

  const alerts = Array.isArray(response.data?.alerts)
    ? response.data!.alerts!.map(normalizeAlert)
    : [];

  const summary = normalizeAlertsSummary(response.data?.summary);

  return {
    alerts,
    summary,
  };
}