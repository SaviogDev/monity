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
  recurringImpact?: FinancialProjectionRecurringImpact | null;
  installmentImpact?: FinancialProjectionInstallmentImpact | null;
  financingImpact?: FinancialProjectionFinancingImpact | null;
}

interface FinancialProjectionResponse {
  success: boolean;
  data?: FinancialProjection | null;
  message?: string;
}

function normalizeProjectionCard(card: FinancialProjectionCard): FinancialProjectionCard {
  return {
    ...card,
    limit: Number(card.limit || 0),
    committed: Number(card.committed || 0),
    available: Number(card.available || 0),
  };
}

function normalizeRecurringImpact(
  impact?: FinancialProjectionRecurringImpact | null
): FinancialProjectionRecurringImpact | null {
  if (!impact) return null;

  return {
    monthlyIncome: Number(impact.monthlyIncome || 0),
    monthlyExpense: Number(impact.monthlyExpense || 0),
  };
}

function normalizeInstallmentImpact(
  impact?: FinancialProjectionInstallmentImpact | null
): FinancialProjectionInstallmentImpact | null {
  if (!impact) return null;

  return {
    openInstallments: Number(impact.openInstallments || 0),
    monthlyCommitted: Number(impact.monthlyCommitted || 0),
  };
}

function normalizeFinancingImpact(
  impact?: FinancialProjectionFinancingImpact | null
): FinancialProjectionFinancingImpact | null {
  if (!impact) return null;

  return {
    activeFinancings: Number(impact.activeFinancings || 0),
    monthlyCommitted: Number(impact.monthlyCommitted || 0),
  };
}

function normalizeProjection(
  projection?: FinancialProjection | null
): FinancialProjection | null {
  if (!projection) return null;

  return {
    currentBalance: Number(projection.currentBalance || 0),
    futureBalance: Number(projection.futureBalance || 0),
    cards: Array.isArray(projection.cards)
      ? projection.cards.map(normalizeProjectionCard)
      : [],
    recurringImpact: normalizeRecurringImpact(projection.recurringImpact),
    installmentImpact: normalizeInstallmentImpact(projection.installmentImpact),
    financingImpact: normalizeFinancingImpact(projection.financingImpact),
  };
}

export async function fetchFinancialProjection(): Promise<FinancialProjection | null> {
  const response = await apiJson<FinancialProjectionResponse>('/financial/projection', {
    method: 'GET',
  });

  return normalizeProjection(response.data);
}