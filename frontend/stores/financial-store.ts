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

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export const useFinancialStore = create<FinancialState>((set, get) => ({
  transactions: [],
  accounts: [],
  summary: emptySummary,
  projection: null,
  alerts: [],
  alertsSummary: emptyAlertsSummary,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadAll: async () => {
    set({ loading: true, error: null });

    try {
      const [
        transactionsData,
        summaryData,
        accountsData,
        projectionData,
        alertsData,
      ] = await Promise.all([
        fetchTransactions(),
        fetchTransactionSummary(),
        fetchAccountsWithBalance(),
        fetchFinancialProjection(),
        fetchAlerts(),
      ]);

      set({
        transactions: Array.isArray(transactionsData) ? transactionsData : [],
        summary: summaryData ?? emptySummary,
        accounts: Array.isArray(accountsData) ? accountsData : [],
        projection: projectionData ?? null,
        alerts: Array.isArray(alertsData?.alerts) ? alertsData.alerts : [],
        alertsSummary: alertsData?.summary ?? emptyAlertsSummary,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);

      set({
        loading: false,
        error: getErrorMessage(error, 'Não foi possível carregar os dados financeiros.'),
      });
    }
  },

  refreshDerivedData: async () => {
    try {
      const [accountsData, summaryData, projectionData, alertsData] =
        await Promise.all([
          fetchAccountsWithBalance(),
          fetchTransactionSummary(),
          fetchFinancialProjection(),
          fetchAlerts(),
        ]);

      set({
        accounts: Array.isArray(accountsData) ? accountsData : [],
        summary: summaryData ?? emptySummary,
        projection: projectionData ?? null,
        alerts: Array.isArray(alertsData?.alerts) ? alertsData.alerts : [],
        alertsSummary: alertsData?.summary ?? emptyAlertsSummary,
        error: null,
      });
    } catch (error) {
      console.error('Erro ao atualizar dados derivados:', error);

      set({
        error: getErrorMessage(
          error,
          'Não foi possível atualizar saldos, projeção e alertas.'
        ),
      });
    }
  },

  createAndSync: async (payload) => {
    set({ loading: true, error: null });

    try {
      const created = await createTransaction(payload);

      set((state) => ({
        transactions: [created, ...state.transactions],
      }));

      await get().refreshDerivedData();

      set({ loading: false, error: null });
    } catch (error) {
      console.error('Erro ao criar transação:', error);

      set({
        loading: false,
        error: getErrorMessage(error, 'Não foi possível criar a transação.'),
      });

      throw error;
    }
  },

  updateAndSync: async (id, payload) => {
    set({ loading: true, error: null });

    try {
      const updated = await updateTransaction(id, payload);

      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          transaction._id === updated._id ? updated : transaction
        ),
      }));

      await get().refreshDerivedData();

      set({ loading: false, error: null });
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);

      set({
        loading: false,
        error: getErrorMessage(error, 'Não foi possível atualizar a transação.'),
      });

      throw error;
    }
  },

  deleteAndSync: async (id) => {
    set({ loading: true, error: null });

    try {
      await deleteTransaction(id);

      set((state) => ({
        transactions: state.transactions.filter(
          (transaction) => transaction._id !== id
        ),
      }));

      await get().refreshDerivedData();

      set({ loading: false, error: null });
    } catch (error) {
      console.error('Erro ao excluir transação:', error);

      set({
        loading: false,
        error: getErrorMessage(error, 'Não foi possível excluir a transação.'),
      });

      throw error;
    }
  },
}));