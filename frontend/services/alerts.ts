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
  data: {
    alerts: FinancialAlert[];
    summary: AlertsSummary;
  };
  message?: string;
}

export async function fetchAlerts() {
  const response = await apiJson<AlertsResponse>('/alerts', {
    method: 'GET',
  });

  return response.data;
} 