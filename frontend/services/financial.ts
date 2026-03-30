import { apiJson } from './api';

export interface FinancialProjectionCard {
  _id: string;
  name: string;
  limit: number;
  committed: number;
  available: number;
}

export interface FinancialProjectionRecurringImpact {
  monthlyIncome: number;
  monthlyExpense: number;
}

export interface FinancialProjectionInstallmentImpact {
  openInstallments: number;
  monthlyCommitted: number;
}

export interface FinancialProjectionFinancingImpact {
  activeFinancings: number;
  monthlyCommitted: number;
}

export interface FinancialProjection {
  currentBalance: number;
  futureBalance: number;
  cards: FinancialProjectionCard[];

  /**
   * Campos preparados para evolução do motor financeiro.
   * O backend atual pode ainda não retornar isso.
   */
  recurringImpact?: FinancialProjectionRecurringImpact | null;
  installmentImpact?: FinancialProjectionInstallmentImpact | null;
  financingImpact?: FinancialProjectionFinancingImpact | null;
}

interface FinancialProjectionResponse {
  success: boolean;
  data: FinancialProjection;
  message?: string;
}

export async function fetchFinancialProjection() {
  const response = await apiJson<FinancialProjectionResponse>(
    '/financial/projection'
  );

  return response.data;
}