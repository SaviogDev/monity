import { create } from 'zustand';

import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchTransactionSummary,
  type Transaction,
  type TransactionPayload,
  type TransactionSummary,
} from '@/services/transactions';

import {
  fetchAccountsWithBalance,
  type AccountWithBalance,
} from '@/services/accounts';

import {
  fetchFinancialProjection,
  type FinancialProjection,
} from '@/services/financial';

import {
  fetchAlerts,
  type FinancialAlert,
  type AlertsSummary,
} from '@/services/alerts';

type FinancialState = {
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  summary: TransactionSummary;
  projection: FinancialProjection | null;
  alerts: FinancialAlert[];
  alertsSummary: AlertsSummary | null;

  loading: boolean;
  syncing: boolean;
  initialized: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  refreshDerivedData: () => Promise<void>;

  createAndSync: (payload: TransactionPayload) => Promise<void>;
  updateAndSync: (id: string, payload: Partial<TransactionPayload>) => Promise<void>;
  deleteAndSync: (id: string) => Promise<void>;

  clearError: () => void;
};

const emptySummary: TransactionSummary = {
  income: 0,
  expense: 0,
  incomeCount: 0,
  expenseCount: 0,
  balance: 0,
};

const emptyAlertsSummary: AlertsSummary = {
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
};

let snapshotRequestSequence = 0;
let lastAppliedSnapshotSequence = 0;

function cloneEmptySummary(): TransactionSummary {
  return { ...emptySummary };
}

function cloneEmptyAlertsSummary(): AlertsSummary {
  return { ...emptyAlertsSummary };
}

function getNextSnapshotSequence() {
  snapshotRequestSequence += 1;
  return snapshotRequestSequence;
}

function shouldApplySnapshot(sequence: number) {
  if (sequence < lastAppliedSnapshotSequence) {
    return false;
  }

  lastAppliedSnapshotSequence = sequence;
  return true;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function parseTransactionTimestamp(value?: string | Date | null) {
  if (!value) return 0;

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getTransactionPrimaryTimestamp(transaction: Partial<Transaction>) {
  return parseTransactionTimestamp(
    (transaction as Transaction).transactionDate ??
      (transaction as Transaction).purchaseDate ??
      null
  );
}

function getTransactionSecondaryTimestamp(transaction: Partial<Transaction>) {
  return parseTransactionTimestamp(
    (transaction as Transaction).createdAt ??
      (transaction as Transaction).updatedAt ??
      null
  );
}

function compareTransactions(a: Transaction, b: Transaction) {
  const primaryDiff =
    getTransactionPrimaryTimestamp(b) - getTransactionPrimaryTimestamp(a);

  if (primaryDiff !== 0) {
    return primaryDiff;
  }

  const secondaryDiff =
    getTransactionSecondaryTimestamp(b) - getTransactionSecondaryTimestamp(a);

  if (secondaryDiff !== 0) {
    return secondaryDiff;
  }

  return String(b._id || '').localeCompare(String(a._id || ''));
}

function normalizeTransactions(data: Transaction[] | null | undefined): Transaction[] {
  if (!Array.isArray(data)) return [];

  const byId = new Map<string, Transaction>();

  for (const transaction of data) {
    if (!transaction || typeof transaction !== 'object') continue;

    const id = String(transaction._id || '').trim();
    if (!id) continue;

    byId.set(id, transaction);
  }

  return Array.from(byId.values()).sort(compareTransactions);
}

function normalizeAccounts(data: AccountWithBalance[] | null | undefined): AccountWithBalance[] {
  if (!Array.isArray(data)) return [];

  return [...data];
}

function normalizeSummary(data: TransactionSummary | null | undefined): TransactionSummary {
  if (!data) return cloneEmptySummary();

  return {
    income: Number(data.income || 0),
    expense: Number(data.expense || 0),
    incomeCount: Number(data.incomeCount || 0),
    expenseCount: Number(data.expenseCount || 0),
    balance: Number(data.balance || 0),
  };
}

function normalizeAlertsSummary(data: AlertsSummary | null | undefined): AlertsSummary {
  if (!data) return cloneEmptyAlertsSummary();

  return {
    total: Number(data.total || 0),
    high: Number(data.high || 0),
    medium: Number(data.medium || 0),
    low: Number(data.low || 0),
  };
}

function applySnapshotToStore(
  set: (partial: Partial<FinancialState>) => void,
  snapshot: {
    transactions: Transaction[];
    summary: TransactionSummary;
    accounts: AccountWithBalance[];
    projection: FinancialProjection | null;
    alerts: FinancialAlert[];
    alertsSummary: AlertsSummary;
  },
  extra?: Partial<FinancialState>
) {
  set({
    transactions: snapshot.transactions,
    summary: snapshot.summary,
    accounts: snapshot.accounts,
    projection: snapshot.projection,
    alerts: snapshot.alerts,
    alertsSummary: snapshot.alertsSummary,
    ...extra,
  });
}

async function fetchOptionalProjection(
  fallback: FinancialProjection | null
): Promise<FinancialProjection | null> {
  try {
    const projection = await fetchFinancialProjection();
    return projection ?? null;
  } catch (error) {
    console.warn('Não foi possível atualizar a projeção financeira.', error);
    return fallback ?? null;
  }
}

async function fetchOptionalAlerts(
  fallbackAlerts: FinancialAlert[],
  fallbackSummary: AlertsSummary | null
): Promise<{ alerts: FinancialAlert[]; alertsSummary: AlertsSummary }> {
  try {
    const alertsData = await fetchAlerts();

    return {
      alerts: Array.isArray(alertsData?.alerts) ? alertsData.alerts : [],
      alertsSummary: normalizeAlertsSummary(alertsData?.summary),
    };
  } catch (error) {
    console.warn('Não foi possível atualizar os alertas financeiros.', error);

    return {
      alerts: Array.isArray(fallbackAlerts) ? fallbackAlerts : [],
      alertsSummary: normalizeAlertsSummary(fallbackSummary),
    };
  }
}

async function fetchServerSnapshot(
  previousState?: Pick<FinancialState, 'projection' | 'alerts' | 'alertsSummary'>
) {
  const fallbackProjection = previousState?.projection ?? null;
  const fallbackAlerts = previousState?.alerts ?? [];
  const fallbackAlertsSummary = previousState?.alertsSummary ?? cloneEmptyAlertsSummary();

  const [transactionsData, summaryData, accountsData, projectionData, alertsData] =
    await Promise.all([
      fetchTransactions(),
      fetchTransactionSummary(),
      fetchAccountsWithBalance(),
      fetchOptionalProjection(fallbackProjection),
      fetchOptionalAlerts(fallbackAlerts, fallbackAlertsSummary),
    ]);

  return {
    transactions: normalizeTransactions(transactionsData),
    summary: normalizeSummary(summaryData),
    accounts: normalizeAccounts(accountsData),
    projection: projectionData,
    alerts: alertsData.alerts,
    alertsSummary: alertsData.alertsSummary,
  };
}

async function runMutationAndRefresh(
  mutation: () => Promise<unknown>,
  get: () => FinancialState
) {
  await mutation();
  await get().refreshDerivedData();
}

export const useFinancialStore = create<FinancialState>((set, get) => ({
  transactions: [],
  accounts: [],
  summary: cloneEmptySummary(),
  projection: null,
  alerts: [],
  alertsSummary: cloneEmptyAlertsSummary(),

  loading: false,
  syncing: false,
  initialized: false,
  error: null,

  clearError: () => set({ error: null }),

  loadAll: async () => {
    const sequence = getNextSnapshotSequence();

    set({ loading: true, error: null });

    try {
      const current = get();

      const snapshot = await fetchServerSnapshot({
        projection: current.projection,
        alerts: current.alerts,
        alertsSummary: current.alertsSummary,
      });

      if (!shouldApplySnapshot(sequence)) {
        return;
      }

      applySnapshotToStore(set, snapshot, {
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);

      if (!shouldApplySnapshot(sequence)) {
        return;
      }

      set({
        loading: false,
        initialized: true,
        error: getErrorMessage(error, 'Não foi possível carregar os dados financeiros.'),
      });
    }
  },

  refreshDerivedData: async () => {
    const sequence = getNextSnapshotSequence();

    try {
      const current = get();

      const snapshot = await fetchServerSnapshot({
        projection: current.projection,
        alerts: current.alerts,
        alertsSummary: current.alertsSummary,
      });

      if (!shouldApplySnapshot(sequence)) {
        return;
      }

      applySnapshotToStore(set, snapshot, {
        error: null,
      });
    } catch (error) {
      console.error('Erro ao sincronizar dados financeiros:', error);

      if (!shouldApplySnapshot(sequence)) {
        return;
      }

      set({
        error: getErrorMessage(
          error,
          'Não foi possível sincronizar transações, saldos, projeção e alertas.'
        ),
      });

      throw error;
    }
  },

  createAndSync: async (payload) => {
    set({ syncing: true, error: null });

    try {
      await runMutationAndRefresh(() => createTransaction(payload), get);

      set({ syncing: false, error: null });
    } catch (error) {
      console.error('Erro ao criar transação:', error);

      set({
        syncing: false,
        error: getErrorMessage(error, 'Não foi possível criar a transação.'),
      });

      throw error;
    }
  },

  updateAndSync: async (id, payload) => {
    set({ syncing: true, error: null });

    try {
      await runMutationAndRefresh(() => updateTransaction(id, payload), get);

      set({ syncing: false, error: null });
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);

      set({
        syncing: false,
        error: getErrorMessage(error, 'Não foi possível atualizar a transação.'),
      });

      throw error;
    }
  },

  deleteAndSync: async (id) => {
    const normalizedId = String(id || '').trim();
    const previousTransactions = get().transactions;

    set({
      syncing: true,
      error: null,
      transactions: previousTransactions.filter(
        (transaction) => String(transaction._id || '').trim() !== normalizedId
      ),
    });

    try {
      await runMutationAndRefresh(() => deleteTransaction(normalizedId), get);

      set({ syncing: false, error: null });
    } catch (error) {
      console.error('Erro ao excluir transação:', error);

      set({
        syncing: false,
        transactions: previousTransactions,
        error: getErrorMessage(error, 'Não foi possível excluir a transação.'),
      });

      throw error;
    }
  },
}));