'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '../../../services/api';
import { clearToken } from '../../../services/auth';
import {
  fetchCategories,
  type Category,
} from '../../../services/categories';
import {
  fetchAccounts,
  type Account,
} from '../../../services/accounts';
import {
  fetchCreditCards,
  type CreditCard,
} from '../../../services/creditCards';
import {
  type PaymentMethod,
  type Transaction,
  type TransactionPayload,
} from '../../../services/transactions';
import { useFinancialStore } from '@/stores/financial-store';
import {
  ArrowUpDown,
  CreditCard as CreditCardIcon,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const PAGE_SIZE = 10;

type TransactionType = 'income' | 'expense';
type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
type InstallmentValueMode = 'total' | 'installment';

interface TransactionFormState {
  description: string;
  amount: string;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  account: string;
  creditCard: string;
  transactionDate: string;
  notes: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceDay: string;
  isInstallment: boolean;
  installmentCount: string;
  installmentCurrent: string;
  installmentValueMode: InstallmentValueMode;
  installmentPurchaseDate: string;
}

interface FiltersState {
  search: string;
  type: '' | TransactionType;
  category: string;
  account: string;
  creditCard: string;
  paymentMethod: '' | PaymentMethod;
  startDate: string;
  endDate: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  const map: Record<PaymentMethod, string> = {
    pix: 'PIX',
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
    transfer: 'Transferência',
  };

  return map[paymentMethod] || paymentMethod;
}

function getRecurrenceFrequencyLabel(frequency: RecurrenceFrequency) {
  const map: Record<RecurrenceFrequency, string> = {
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    yearly: 'Anual',
  };

  return map[frequency];
}

function buildDefaultForm(type: TransactionType = 'expense'): TransactionFormState {
  return {
    description: '',
    amount: '',
    type,
    category: '',
    paymentMethod: type === 'expense' ? 'debit' : 'transfer',
    account: '',
    creditCard: '',
    transactionDate: getTodayInputValue(),
    notes: '',
    isRecurring: false,
    recurrenceFrequency: 'monthly',
    recurrenceDay: '',
    isInstallment: false,
    installmentCount: '2',
    installmentCurrent: '1',
    installmentValueMode: 'total',
    installmentPurchaseDate: getTodayInputValue(),
  };
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: 'green' | 'red' | 'blue' | 'dark';
}) {
  const styles = {
    green: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60]',
      text: 'text-[#2ECC71]',
    },
    red: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#E74C3C] to-[#C0392B]',
      text: 'text-[#E74C3C]',
    },
    blue: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#3498DB] to-[#2980B9]',
      text: 'text-[#3498DB]',
    },
    dark: {
      box: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50]',
      icon: 'bg-white/20',
      text: 'text-white',
    },
  }[tone];

  const Icon =
    tone === 'green'
      ? TrendingUp
      : tone === 'red'
      ? TrendingDown
      : tone === 'blue'
        ? Wallet
        : ArrowUpDown;

  return (
    <div className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${styles.box}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>

      <p
        className={`mb-1 text-sm font-medium ${
          tone === 'dark' ? 'text-white/70' : 'text-slate-500'
        }`}
      >
        {title}
      </p>
      <p className={`text-2xl font-bold md:text-3xl ${styles.text}`}>{value}</p>
    </div>
  );
}

export default function TransactionsPage() {
  const router = useRouter();

  const {
    transactions,
    createAndSync,
    updateAndSync,
    deleteAndSync,
    loadAll,
    loading: financialLoading,
  } = useFinancialStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    type: '',
    category: '',
    account: '',
    creditCard: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });

  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState<TransactionFormState>(buildDefaultForm());

  const safeTransactions = useMemo(() => {
    return Array.isArray(transactions) ? transactions : [];
  }, [transactions]);

  const safeCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const safeAccounts = useMemo(() => {
    return Array.isArray(accounts) ? accounts : [];
  }, [accounts]);

  const safeCreditCards = useMemo(() => {
    return Array.isArray(creditCards) ? creditCards : [];
  }, [creditCards]);

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      const unauthorized =
        (error instanceof ApiError && error.unauthorized) ||
        (error instanceof Error && error.message === 'UNAUTHORIZED');

      if (unauthorized) {
        clearToken();
        router.replace('/login');
        return true;
      }

      return false;
    },
    [router]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const [categoryList, accountList, creditCardList] = await Promise.all([
          fetchCategories({}),
          fetchAccounts(),
          fetchCreditCards({}),
        ]);

        await loadAll();

        if (!isMounted) return;

        setCategories(Array.isArray(categoryList) ? categoryList : []);
        setAccounts(Array.isArray(accountList) ? accountList : []);
        setCreditCards(Array.isArray(creditCardList) ? creditCardList : []);
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);

        if (handleUnauthorized(error)) return;

        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados auxiliares.';

        if (isMounted) {
          setPageError(message);
          toast.error(message);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [handleUnauthorized, loadAll]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.type,
    filters.category,
    filters.account,
    filters.creditCard,
    filters.paymentMethod,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (!filters.type || !filters.category) return;

    const selectedCategory = safeCategories.find((category) => category._id === filters.category);

    if (selectedCategory && selectedCategory.type !== filters.type) {
      setFilters((prev) => ({ ...prev, category: '' }));
    }
  }, [filters.type, filters.category, safeCategories]);

  useEffect(() => {
    if (!form.category) return;

    const selectedCategory = safeCategories.find((category) => category._id === form.category);

    if (selectedCategory && selectedCategory.type !== form.type) {
      setForm((prev) => ({ ...prev, category: '' }));
    }
  }, [form.type, form.category, safeCategories]);

  useEffect(() => {
    if (form.type === 'income') {
      setForm((prev) => ({
        ...prev,
        paymentMethod: 'transfer',
        account: '',
        creditCard: '',
        isInstallment: false,
        installmentCount: '2',
        installmentCurrent: '1',
        installmentValueMode: 'total',
        installmentPurchaseDate: prev.transactionDate || getTodayInputValue(),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      isRecurring: false,
      recurrenceFrequency: 'monthly',
      recurrenceDay: '',
    }));

    if (form.paymentMethod === 'credit') {
      setForm((prev) => ({
        ...prev,
        account: '',
        installmentPurchaseDate: prev.installmentPurchaseDate || prev.transactionDate,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        creditCard: '',
        isInstallment: false,
        installmentCount: '2',
        installmentCurrent: '1',
        installmentValueMode: 'total',
        installmentPurchaseDate: prev.transactionDate || getTodayInputValue(),
      }));
    }
  }, [form.type, form.paymentMethod, form.transactionDate]);

  const availableFilterCategories = useMemo(() => {
    if (!filters.type) return safeCategories;
    return safeCategories.filter((category) => category.type === filters.type);
  }, [safeCategories, filters.type]);

  const availableFormCategories = useMemo(() => {
    return safeCategories.filter((category) => category.type === form.type);
  }, [safeCategories, form.type]);

  const activeAccounts = useMemo(() => {
    return safeAccounts.filter((account) => account.isActive !== false);
  }, [safeAccounts]);

  const activeCreditCards = useMemo(() => {
    return safeCreditCards.filter((card) => card.isActive !== false);
  }, [safeCreditCards]);

  const filteredTransactions = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return safeTransactions.filter((transaction) => {
      const matchesSearch =
        !term ||
        transaction.description?.toLowerCase().includes(term) ||
        transaction.category?.name?.toLowerCase().includes(term) ||
        transaction.account?.name?.toLowerCase().includes(term) ||
        transaction.creditCard?.name?.toLowerCase().includes(term);

      const matchesType = !filters.type || transaction.type === filters.type;
      const matchesCategory = !filters.category || transaction.category?._id === filters.category;
      const matchesAccount = !filters.account || transaction.account?._id === filters.account;
      const matchesCreditCard =
        !filters.creditCard || transaction.creditCard?._id === filters.creditCard;
      const matchesPaymentMethod =
        !filters.paymentMethod || transaction.paymentMethod === filters.paymentMethod;

      const transactionDate = transaction.transactionDate
        ? new Date(transaction.transactionDate).getTime()
        : null;

      const startDate = filters.startDate
        ? new Date(`${filters.startDate}T00:00:00`).getTime()
        : null;

      const endDate = filters.endDate
        ? new Date(`${filters.endDate}T23:59:59`).getTime()
        : null;

      const matchesStartDate =
        !startDate || (transactionDate !== null && transactionDate >= startDate);
      const matchesEndDate =
        !endDate || (transactionDate !== null && transactionDate <= endDate);

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesAccount &&
        matchesCreditCard &&
        matchesPaymentMethod &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [safeTransactions, filters]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expense = filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  const openCreateModal = () => {
    setEditingTransaction(null);
    setFormError(null);
    setForm(buildDefaultForm('expense'));
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormError(null);

    const metadata = (transaction as Transaction & {
      recurrenceRule?: {
        frequency?: RecurrenceFrequency;
        dayOfMonth?: number;
      };
      installmentPlan?: {
        totalInstallments?: number;
        currentInstallment?: number;
        purchaseDate?: string;
        valueMode?: InstallmentValueMode;
      };
      isRecurring?: boolean;
      isInstallment?: boolean;
    }) ?? {};

    const isCreditExpense =
      transaction.type === 'expense' && transaction.paymentMethod === 'credit';

    setForm({
      description: transaction.description || '',
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category?._id || '',
      paymentMethod: transaction.type === 'expense' ? transaction.paymentMethod : 'transfer',
      account: transaction.account?._id || '',
      creditCard: transaction.creditCard?._id || '',
      transactionDate: transaction.transactionDate?.slice(0, 10) || getTodayInputValue(),
      notes: transaction.notes || '',
      isRecurring: transaction.type === 'income' && Boolean(metadata.isRecurring || metadata.recurrenceRule),
      recurrenceFrequency: metadata.recurrenceRule?.frequency || 'monthly',
      recurrenceDay: metadata.recurrenceRule?.dayOfMonth
        ? String(metadata.recurrenceRule.dayOfMonth)
        : '',
      isInstallment: Boolean(metadata.isInstallment || metadata.installmentPlan || isCreditExpense),
      installmentCount: String(metadata.installmentPlan?.totalInstallments || 2),
      installmentCurrent: String(metadata.installmentPlan?.currentInstallment || 1),
      installmentValueMode: metadata.installmentPlan?.valueMode || 'total',
      installmentPurchaseDate:
        metadata.installmentPlan?.purchaseDate?.slice(0, 10) ||
        transaction.transactionDate?.slice(0, 10) ||
        getTodayInputValue(),
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const amount = Number(form.amount);
    const recurrenceDay = Number(form.recurrenceDay);
    const installmentCount = Number(form.installmentCount);
    const installmentCurrent = Number(form.installmentCurrent);

    if (!amount || amount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    if (!form.category) {
      setFormError('Selecione uma categoria.');
      return;
    }

    if (!form.transactionDate) {
      setFormError('Selecione a data da transação.');
      return;
    }

    if (form.type === 'expense' && !form.paymentMethod) {
      setFormError('Selecione a forma de pagamento.');
      return;
    }

    if (form.isRecurring) {
      if (form.type !== 'income') {
        setFormError('Recorrência só é permitida para receitas.');
        return;
      }

      if (!form.recurrenceFrequency) {
        setFormError('Selecione a frequência da recorrência.');
        return;
      }

      if (
        !form.recurrenceDay ||
        Number.isNaN(recurrenceDay) ||
        recurrenceDay < 1 ||
        recurrenceDay > 31
      ) {
        setFormError('Informe um dia de ocorrência válido entre 1 e 31.');
        return;
      }
    }

    if (form.type === 'expense' && form.paymentMethod !== 'credit' && !form.account) {
      setFormError('Selecione a conta de saída.');
      return;
    }

    if (form.type === 'expense' && form.paymentMethod === 'credit') {
      if (!form.creditCard) {
        setFormError('Selecione um cartão de crédito.');
        return;
      }

      if (form.isInstallment) {
        if (!installmentCount || Number.isNaN(installmentCount) || installmentCount < 2) {
          setFormError('Informe um número de parcelas válido a partir de 2.');
          return;
        }

        if (
          !installmentCurrent ||
          Number.isNaN(installmentCurrent) ||
          installmentCurrent < 1 ||
          installmentCurrent > installmentCount
        ) {
          setFormError('A parcela atual deve estar entre 1 e o total de parcelas.');
          return;
        }

        if (!form.installmentPurchaseDate) {
          setFormError('Informe a data da compra.');
          return;
        }
      }
    }

    const payloadBase: TransactionPayload & Record<string, unknown> = {
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category,
      paymentMethod: form.type === 'expense' ? form.paymentMethod : 'transfer',
      account: form.type === 'expense' && form.paymentMethod !== 'credit' ? form.account : null,
      creditCard: form.type === 'expense' && form.paymentMethod === 'credit' ? form.creditCard : null,
      transactionDate:
        form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment
          ? form.installmentPurchaseDate
          : form.transactionDate,
      status: 'confirmed',
      source: 'manual',
      notes: form.notes.trim(),
      isRecurring: false,
      recurrenceRule: null,
    };

    if (form.isRecurring) {
      payloadBase.isRecurring = true;
      payloadBase.recurrenceRule = {
        type: form.type,
        value: amount,
        category: form.category,
        frequency: form.recurrenceFrequency,
        dayOfMonth: recurrenceDay,
        startDate: form.transactionDate,
      };
    }

    if (form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment) {
      const parcelValue =
        form.installmentValueMode === 'total'
          ? Number((amount / installmentCount).toFixed(2))
          : amount;

      const totalValue =
        form.installmentValueMode === 'total'
          ? amount
          : Number((amount * installmentCount).toFixed(2));

      payloadBase.amount = form.installmentValueMode === 'total' ? amount : parcelValue;
      payloadBase.isInstallment = true;
      payloadBase.groupId =
        editingTransaction && (editingTransaction as Transaction & { groupId?: string }).groupId
          ? (editingTransaction as Transaction & { groupId?: string }).groupId
          : crypto.randomUUID();
      payloadBase.installmentPlan = {
        totalInstallments: installmentCount,
        currentInstallment: installmentCurrent,
        installmentAmount: parcelValue,
        totalAmount: totalValue,
        purchaseDate: form.installmentPurchaseDate,
        valueMode: form.installmentValueMode,
        description: form.description.trim(),
      };
    }

    try {
      setIsSubmitting(true);

      if (editingTransaction) {
        await updateAndSync(editingTransaction._id, payloadBase as TransactionPayload);
        toast.success('Transação atualizada com sucesso!');
      } else {
        await createAndSync(payloadBase as TransactionPayload);

        if (form.type === 'income' && form.isRecurring) {
          toast.success('Entrada recorrente criada com sucesso!');
        } else if (form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment) {
          toast.success('Despesa parcelada criada com sucesso!');
        } else {
          toast.success('Transação criada com sucesso!');
        }
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      setFormError(null);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);

      if (handleUnauthorized(error)) return;

      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar a transação.';

      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    const confirmed = window.confirm(
      `Deseja excluir a transação "${transaction.description || 'sem descrição'}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(transaction._id);
      await deleteAndSync(transaction._id);
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir transação:', error);

      if (handleUnauthorized(error)) return;

      const message =
        error instanceof Error ? error.message : 'Não foi possível excluir a transação.';

      setPageError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingTransaction ? 'Editar transação' : 'Nova transação'}
                </h2>
                <p className="text-sm text-slate-500">
                  O formulário se adapta conforme o tipo de transação
                </p>
              </div>

              <button
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <span className="sr-only">Fechar</span>×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Tipo de transação
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...buildDefaultForm('income'),
                        description: prev.type === 'income' ? prev.description : '',
                      }))
                    }
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      form.type === 'income'
                        ? 'border-[#2ECC71] bg-green-50 text-[#1f8f56] shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          form.type === 'income'
                            ? 'bg-[#2ECC71] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">Entrada</p>
                        <p className="text-xs opacity-80">
                          Salário, recebimentos e outras receitas
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...buildDefaultForm('expense'),
                        description: prev.type === 'expense' ? prev.description : '',
                      }))
                    }
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      form.type === 'expense'
                        ? 'border-[#E74C3C] bg-red-50 text-[#C0392B] shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          form.type === 'expense'
                            ? 'bg-[#E74C3C] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <TrendingDown size={20} />
                      </div>
                      <div>
                        <p className="font-semibold">Saída</p>
                        <p className="text-xs opacity-80">
                          Compras, contas, despesas e pagamentos
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Descrição <span className="text-slate-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder={
                      form.type === 'income'
                        ? 'Ex.: Salário, comissão, aluguel recebido...'
                        : 'Ex.: Supermercado, aluguel, assinatura...'
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder="0,00"
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Categoria *
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                  >
                    <option value="">Selecione</option>
                    {availableFormCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.icon ? `${category.icon} ` : ''}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={form.transactionDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, transactionDate: event.target.value }))
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                  />
                </div>

                {form.type === 'expense' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Forma de pagamento *
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          paymentMethod: event.target.value as PaymentMethod,
                        }))
                      }
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                    >
                      <option value="cash">Dinheiro</option>
                      <option value="debit">Débito</option>
                      <option value="pix">PIX</option>
                      <option value="credit">Cartão de crédito</option>
                      <option value="transfer">Transferência</option>
                    </select>
                  </div>
                )}

                {form.type === 'expense' && form.paymentMethod !== 'credit' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Conta *
                    </label>
                    <select
                      value={form.account}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, account: event.target.value }))
                      }
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                    >
                      <option value="">Selecione</option>
                      {activeAccounts.map((account) => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.type === 'expense' && form.paymentMethod === 'credit' && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Cartão de crédito *
                      </label>
                      <select
                        value={form.creditCard}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, creditCard: event.target.value }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                      >
                        <option value="">Selecione</option>
                        {activeCreditCards.map((card) => (
                          <option key={card._id} value={card._id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            Compra parcelada?
                          </p>
                          <p className="text-xs text-slate-500">
                            Gere as parcelas automaticamente vinculadas ao mesmo grupo
                          </p>
                        </div>

                        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, isInstallment: false }))}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                              !form.isInstallment
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, isInstallment: true }))}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                              form.isInstallment
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Sim
                          </button>
                        </div>
                      </div>

                      {form.isInstallment && (
                        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Número total de parcelas *
                            </label>
                            <input
                              type="number"
                              min="2"
                              value={form.installmentCount}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  installmentCount: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Parcela atual *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.installmentCurrent}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  installmentCurrent: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Valor informado representa
                            </label>
                            <select
                              value={form.installmentValueMode}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  installmentValueMode: event.target
                                    .value as InstallmentValueMode,
                                }))
                              }
                              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                            >
                              <option value="total">Valor total da compra</option>
                              <option value="installment">Valor de cada parcela</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Data da compra *
                            </label>
                            <input
                              type="date"
                              value={form.installmentPurchaseDate}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  installmentPurchaseDate: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {form.type === 'income' && (
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-[#2ECC71]">
                          <Repeat size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            Essa entrada é recorrente?
                          </p>
                          <p className="text-xs text-slate-500">
                            Use para salário, aluguel recebido e outras receitas fixas
                          </p>
                        </div>
                      </div>

                      <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              isRecurring: false,
                              recurrenceFrequency: 'monthly',
                              recurrenceDay: '',
                            }))
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            !form.isRecurring
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              isRecurring: true,
                            }))
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            form.isRecurring
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    {form.isRecurring && (
                      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Frequência *
                          </label>
                          <select
                            value={form.recurrenceFrequency}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                recurrenceFrequency: event.target
                                  .value as RecurrenceFrequency,
                              }))
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                          >
                            <option value="weekly">
                              {getRecurrenceFrequencyLabel('weekly')}
                            </option>
                            <option value="biweekly">
                              {getRecurrenceFrequencyLabel('biweekly')}
                            </option>
                            <option value="monthly">
                              {getRecurrenceFrequencyLabel('monthly')}
                            </option>
                            <option value="quarterly">
                              {getRecurrenceFrequencyLabel('quarterly')}
                            </option>
                            <option value="yearly">
                              {getRecurrenceFrequencyLabel('yearly')}
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Dia de ocorrência *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={form.recurrenceDay}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                recurrenceDay: event.target.value,
                              }))
                            }
                            placeholder="Ex.: 5"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Observações <span className="text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={4}
                    placeholder="Observações opcionais"
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-12 rounded-xl border border-slate-200 px-5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] px-5 font-semibold text-white shadow-lg shadow-green-500/30 transition-all hover:shadow-green-500/50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : editingTransaction ? (
                    'Salvar alterações'
                  ) : (
                    'Criar transação'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Saldo filtrado"
          value={formatCurrency(totals.balance)}
          tone={totals.balance >= 0 ? 'blue' : 'dark'}
        />
        <SummaryCard title="Entradas" value={formatCurrency(totals.income)} tone="green" />
        <SummaryCard title="Saídas" value={formatCurrency(totals.expense)} tone="red" />
        <SummaryCard title="Qtde. transações" value={String(totals.count)} tone="dark" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Filtros</h3>
              <p className="text-sm text-slate-500">
                Refine a listagem por texto, tipo, categoria, conta, cartão e período
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setFilters({
                  search: '',
                  type: '',
                  category: '',
                  account: '',
                  creditCard: '',
                  paymentMethod: '',
                  startDate: '',
                  endDate: '',
                })
              }
              className="h-11 rounded-xl border border-slate-200 px-4 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Buscar
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Descrição, categoria, conta..."
                  className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: event.target.value as FiltersState['type'],
                  }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              >
                <option value="">Todos</option>
                <option value="income">Entradas</option>
                <option value="expense">Saídas</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Categoria
              </label>
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, category: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              >
                <option value="">Todas</option>
                {availableFilterCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.icon ? `${category.icon} ` : ''}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Método
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value as FiltersState['paymentMethod'],
                  }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              >
                <option value="">Todos</option>
                <option value="pix">PIX</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="cash">Dinheiro</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                De
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, startDate: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Até
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, endDate: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Conta
              </label>
              <select
                value={filters.account}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, account: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              >
                <option value="">Todas</option>
                {activeAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Cartão
              </label>
              <select
                value={filters.creditCard}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, creditCard: event.target.value }))
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 focus:border-[#2ECC71] focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30"
              >
                <option value="">Todos</option>
                {activeCreditCards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Lista de transações</h3>
            <p className="text-sm text-slate-500">
              {filteredTransactions.length} resultado(s) encontrado(s)
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="h-11 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] px-4 font-medium text-white shadow-lg shadow-green-500/30"
          >
            Nova transação
          </button>
        </div>

        {pageError && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 lg:mx-6">
            {pageError}
          </div>
        )}

        {financialLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Carregando transações...
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ArrowUpDown className="text-slate-400" size={28} />
            </div>
            <h4 className="mb-1 text-lg font-semibold text-slate-800">
              Nenhuma transação encontrada
            </h4>
            <p className="text-slate-500">
              Ajuste os filtros ou crie uma nova transação para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="px-6 py-4 font-semibold">Descrição</th>
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Origem</th>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 font-semibold">Valor</th>
                    <th className="px-6 py-4 text-right font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTransactions.map((transaction) => (
                    <tr
                      key={transaction._id}
                      className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {transaction.description || 'Sem descrição'}
                        </div>
                        {transaction.notes ? (
                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {transaction.notes}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: transaction.category?.color || '#3498DB',
                            }}
                          />
                          <span>
                            {transaction.category?.icon ? `${transaction.category.icon} ` : ''}
                            {transaction.category?.name || 'Sem categoria'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {transaction.type === 'income' ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-slate-400" />
                            <span>Entrada manual</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              {transaction.paymentMethod === 'credit' ? (
                                <CreditCardIcon size={16} className="text-slate-400" />
                              ) : (
                                <Landmark size={16} className="text-slate-400" />
                              )}
                              <span>
                                {transaction.paymentMethod === 'credit'
                                  ? transaction.creditCard?.name || 'Cartão'
                                  : transaction.account?.name || 'Conta'}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {getPaymentMethodLabel(transaction.paymentMethod)}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(transaction.transactionDate)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            transaction.type === 'income'
                              ? 'bg-green-100 text-[#2ECC71]'
                              : 'bg-red-100 text-[#E74C3C]'
                          }`}
                        >
                          {transaction.type === 'income' ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 font-bold ${
                          transaction.type === 'income'
                            ? 'text-[#2ECC71]'
                            : 'text-[#E74C3C]'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}{' '}
                        {formatCurrency(transaction.amount)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(transaction)}
                            disabled={deletingId === transaction._id}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                            title="Excluir"
                          >
                            {deletingId === transaction._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedTransactions.map((transaction) => (
                <div key={transaction._id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {transaction.description || 'Sem descrição'}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Data: {formatDate(transaction.transactionDate)}
                      </p>
                    </div>

                    <span
                      className={`text-sm font-bold ${
                        transaction.type === 'income'
                          ? 'text-[#2ECC71]'
                          : 'text-[#E74C3C]'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}{' '}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: transaction.category?.color || '#3498DB',
                      }}
                    />
                    <span>
                      {transaction.category?.icon ? `${transaction.category.icon} ` : ''}
                      {transaction.category?.name || 'Sem categoria'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {transaction.type === 'income' ? (
                      <>
                        <TrendingUp size={16} />
                        <span>Entrada manual</span>
                      </>
                    ) : (
                      <>
                        {transaction.paymentMethod === 'credit' ? (
                          <CreditCardIcon size={16} />
                        ) : (
                          <Landmark size={16} />
                        )}
                        <span>
                          {transaction.paymentMethod === 'credit'
                            ? transaction.creditCard?.name || 'Cartão'
                            : transaction.account?.name || 'Conta'}
                        </span>
                        <span>•</span>
                        <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-[#2ECC71]'
                          : 'bg-red-100 text-[#E74C3C]'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(transaction)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(transaction)}
                        disabled={deletingId === transaction._id}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === transaction._id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={openCreateModal}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white shadow-xl shadow-green-500/50 sm:hidden"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}