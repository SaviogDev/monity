import { apiJson } from './api';
import {
  fetchTransactionById,
  type Transaction,
  type TransactionPayload,
} from './transactions';

/**
 * Financing é uma Transaction especializada com source = financing
 */
export type Financing = Transaction;

export interface FinancingSummary {
  activeContracts: number;
  totalDebt: number;
  monthlyCommitment: number;
}

export interface CreateFinancingPayload {
  description: string;
  totalAmount: number;
  downPayment: number;
  installmentValue: number;
  totalInstallments: number;
  currentInstallment?: number;
  startDate: string;
  category: string;
  account: string;
}

export interface UpdateFinancingPayload {
  description?: string;
  category?: string;
  notes?: string;
  status?: 'confirmed' | 'planned';
  /**
   * Campos abaixo existem na UI, mas hoje NÃO são suportados
   * pelo backend para grupo parcelado sem recriar o contrato.
   */
  installmentValue?: number;
  totalInstallments?: number;
  currentInstallment?: number;
  startDate?: string;
  account?: string;
  totalAmount?: number;
  downPayment?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface FinancingGroup {
  id: string;
  items: Financing[];
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getNumeric(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getInstallmentPlanValue(
  installmentPlan: unknown,
  key: 'installmentAmount' | 'currentInstallment' | 'totalInstallments'
) {
  if (typeof installmentPlan === 'object' && installmentPlan !== null && !Array.isArray(installmentPlan)) {
    return getNumeric((installmentPlan as Record<string, unknown>)[key]);
  }

  return 0;
}

function getGroupKey(financing: Financing) {
  return financing.groupId || financing._id;
}

function compareByDateDesc(a: Financing, b: Financing) {
  const aTime = new Date(a.transactionDate || a.purchaseDate || a.createdAt).getTime();
  const bTime = new Date(b.transactionDate || b.purchaseDate || b.createdAt).getTime();
  return bTime - aTime;
}

function normalizeFinancings(data: Financing[] | null | undefined): Financing[] {
  if (!Array.isArray(data)) return [];

  const byId = new Map<string, Financing>();

  for (const item of data) {
    if (!item?._id) continue;
    byId.set(String(item._id), item);
  }

  return Array.from(byId.values()).sort(compareByDateDesc);
}

function groupFinancings(financings: Financing[]): FinancingGroup[] {
  const map = new Map<string, Financing[]>();

  for (const financing of financings) {
    const key = getGroupKey(financing);
    const current = map.get(key) || [];
    current.push(financing);
    map.set(key, current);
  }

  return Array.from(map.entries()).map(([id, items]) => ({
    id,
    items: [...items].sort((a, b) => {
      const aIndex = getNumeric(a.installmentIndex);
      const bIndex = getNumeric(b.installmentIndex);
      return aIndex - bIndex;
    }),
  }));
}

function buildFinancingSummary(financings: Financing[]): FinancingSummary {
  const groups = groupFinancings(financings);

  const activeContracts = groups.length;

  const totalDebt = roundMoney(
    financings
      .filter((item) => item.status === 'planned')
      .reduce((sum, item) => sum + getNumeric(item.amount), 0)
  );

  const monthlyCommitment = roundMoney(
    groups.reduce((sum, group) => {
      const representative = group.items[0];
      const installmentAmount =
        getInstallmentPlanValue(representative.installmentPlan, 'installmentAmount') ||
        getNumeric(representative.amount);

      return sum + installmentAmount;
    }, 0)
  );

  return {
    activeContracts,
    totalDebt,
    monthlyCommitment,
  };
}

function hasUnsupportedStructuralChanges(payload: UpdateFinancingPayload) {
  return (
    payload.installmentValue !== undefined ||
    payload.totalInstallments !== undefined ||
    payload.currentInstallment !== undefined ||
    payload.startDate !== undefined ||
    payload.account !== undefined ||
    payload.totalAmount !== undefined ||
    payload.downPayment !== undefined
  );
}

/**
 * ===============================
 * FETCH
 * ===============================
 */

export async function fetchFinancings(): Promise<Financing[]> {
  const response = await apiJson<ApiResponse<Financing[]>>(
    '/transactions?source=financing',
    { method: 'GET' }
  );

  return normalizeFinancings(response.data);
}

export async function fetchFinancingSummary(): Promise<FinancingSummary> {
  const financings = await fetchFinancings();
  return buildFinancingSummary(financings);
}

/**
 * ===============================
 * CREATE
 * ===============================
 */

export async function createFinancing(payload: CreateFinancingPayload): Promise<Financing> {
  const financedAmount = roundMoney(payload.totalAmount - payload.downPayment);

  if (financedAmount <= 0) {
    throw new Error('O valor financiado precisa ser maior que zero.');
  }

  const transactionPayload: TransactionPayload = {
    description: payload.description.trim(),
    type: 'expense',
    amount: roundMoney(payload.installmentValue),
    category: payload.category,
    account: payload.account,
    paymentMethod: 'debit',
    transactionDate: payload.startDate,
    purchaseDate: payload.startDate,
    isInstallment: true,
    source: 'financing',
    installmentPlan: {
      totalInstallments: payload.totalInstallments,
      currentInstallment: payload.currentInstallment || 1,
      installmentAmount: roundMoney(payload.installmentValue),
      totalAmount: financedAmount,
      purchaseDate: payload.startDate,
      valueMode: 'installment',
      description: payload.description.trim(),
    },
  };

  const response = await apiJson<ApiResponse<Financing>>('/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionPayload),
  });

  return response.data;
}

/**
 * ===============================
 * UPDATE
 * ===============================
 *
 * IMPORTANTE:
 * Hoje o backend não permite alterar estrutura de grupos parcelados.
 * Então este método suporta apenas:
 * - description
 * - category
 * - notes
 * - status
 */

export async function updateFinancing(
  id: string,
  payload: UpdateFinancingPayload
): Promise<Financing> {
  if (hasUnsupportedStructuralChanges(payload)) {
    throw new Error(
      'No contrato atual de financiamento, só é possível editar descrição, categoria, observações e status. Para alterar parcela, prazo, conta ou datas, será preciso recriar o contrato.'
    );
  }

  const updatePayload: Partial<TransactionPayload> & {
    notes?: string;
    status?: 'confirmed' | 'planned';
  } = {
    ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
    ...(payload.category !== undefined ? { category: payload.category } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
  };

  const response = await apiJson<ApiResponse<Financing>>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updatePayload),
  });

  return response.data;
}

/**
 * ===============================
 * DELETE
 * ===============================
 */

export async function deleteFinancing(id: string): Promise<{ message: string; deletedCount?: number }> {
  const response = await apiJson<ApiResponse<{ message: string; deletedCount?: number }>>(
    `/transactions/${id}`,
    {
      method: 'DELETE',
    }
  );

  return response.data;
}

/**
 * ===============================
 * HELPERS PARA UI
 * ===============================
 */

export async function fetchFinancingGroupByAnyTransactionId(id: string): Promise<Financing[]> {
  const transaction = await fetchTransactionById(id);
  const groupId = transaction.groupId;

  if (!groupId) {
    return [transaction];
  }

  const response = await apiJson<ApiResponse<Financing[]>>(
    `/transactions?source=financing&groupId=${encodeURIComponent(groupId)}`,
    { method: 'GET' }
  );

  return normalizeFinancings(response.data);
}

export function summarizeFinancingGroup(financings: Financing[]) {
  const normalized = normalizeFinancings(financings);
  const grouped = groupFinancings(normalized);
  const firstGroup = grouped[0];

  if (!firstGroup) {
    return {
      id: '',
      description: '',
      installmentValue: 0,
      totalInstallments: 0,
      currentInstallment: 0,
      paidInstallments: 0,
      remainingInstallments: 0,
      totalDebt: 0,
      nextDueDate: null as string | null,
      items: [] as Financing[],
    };
  }

  const items = firstGroup.items;
  const representative = items[0];
  const installmentValue =
    getInstallmentPlanValue(representative.installmentPlan, 'installmentAmount') ||
    getNumeric(representative.amount);

  const totalInstallments =
    getNumeric(representative.installmentCount) ||
    getInstallmentPlanValue(representative.installmentPlan, 'totalInstallments');

  const paidInstallments = items.filter((item) => item.status === 'confirmed').length;
  const remainingInstallments = items.filter((item) => item.status === 'planned').length;

  const nextPlanned = [...items]
    .filter((item) => item.status === 'planned')
    .sort((a, b) => {
      const aTime = new Date(a.transactionDate).getTime();
      const bTime = new Date(b.transactionDate).getTime();
      return aTime - bTime;
    })[0];

  const totalDebt = roundMoney(
    items
      .filter((item) => item.status === 'planned')
      .reduce((sum, item) => sum + getNumeric(item.amount), 0)
  );

  return {
    id: firstGroup.id,
    description: representative.description || '',
    installmentValue,
    totalInstallments,
    currentInstallment:
        getInstallmentPlanValue(representative.installmentPlan, 'currentInstallment') ||
        getNumeric(representative.installmentIndex) ||
        1,
    paidInstallments,
    remainingInstallments,
    totalDebt,
    nextDueDate: nextPlanned?.transactionDate || null,
    items,
  };
}