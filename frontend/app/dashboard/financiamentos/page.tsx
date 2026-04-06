'use client';

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Car,
  Wallet,
  Plus,
  Loader2,
  CalendarDays,
  Landmark,
  X,
  CreditCard,
  FileText,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchFinancings,
  fetchFinancingSummary,
  createFinancing,
  updateFinancing,
  deleteFinancing,
  type Financing,
  type FinancingSummary,
} from '@/services/financings';
import { fetchCategories, type Category } from '@/services/categories';
import { fetchAccounts, type Account } from '@/services/accounts';
import type { TransactionStatus } from '@/services/transactions';

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function parseDateLikeUTC(value?: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      12,
      0,
      0
    )
  );
}

function formatISODateUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayISODateUTC() {
  const now = new Date();
  return formatISODateUTC(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  );
}

function formatMonthYearUTC(dateString?: string | null) {
  const date = parseDateLikeUTC(dateString);
  if (!date) return '---';

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function getObjectId(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id?: string })._id || '');
  }
  return '';
}

function getObjectName(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return '';
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name?: string }).name || '');
  }
  return '';
}

interface FinancingFormState {
  description: string;
  totalAmount: string;
  downPayment: string;
  installmentValue: string;
  totalInstallments: string;
  currentInstallment: string;
  startDate: string;
  category: string;
  account: string;
}

interface FinancingInstallmentPlan {
  totalInstallments?: number;
  currentInstallment?: number;
  installmentAmount?: number;
  totalAmount?: number;
  purchaseDate?: string | null;
}

interface FinancingItem extends Omit<Financing, 'category' | 'account' | 'status' | 'transactionDate'> {
  _id: string;
  groupId?: string | null;
  description?: string;
  amount: number;
  transactionDate?: string | null;
  purchaseDate?: string | null;
  status?: 'confirmed' | 'planned' | string;
  installmentIndex?: number | null;
  installmentCount?: number | null;
  totalAmount?: number;
  downPayment?: number;
  notes?: string;
  category?: { _id?: string; name?: string | null } | string | null;
  account?: { _id?: string; name?: string | null } | string | null;
  installmentPlan?: FinancingInstallmentPlan | null;
}

interface FinancingGroup {
  groupKey: string;
  anchorId: string;
  groupId: string | null;
  description: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  nextInstallmentNumber: number | null;
  progressPercent: number;
  nextDueDate: string | null;
  remainingDebt: number;
  financedAmount: number;
  assetTotalAmount: number;
  downPayment: number;
  status: 'active' | 'paid';
  installments: FinancingItem[];
}

const defaultForm: FinancingFormState = {
  description: '',
  totalAmount: '',
  downPayment: '0',
  installmentValue: '',
  totalInstallments: '',
  currentInstallment: '1',
  startDate: getTodayISODateUTC(),
  category: '',
  account: '',
};

const emptySummary: FinancingSummary = {
  activeContracts: 0,
  totalDebt: 0,
  monthlyCommitment: 0,
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
};

function extractMoneyFromNotes(notes?: string | null, label?: string) {
  if (!notes || !label) return 0;

  const regex = new RegExp(`${label}:\\s*R\\$\\s*([\\d.]+,\\d{2})`, 'i');
  const match = notes.match(regex);
  if (!match?.[1]) return 0;

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const numeric = Number(normalized);

  return Number.isFinite(numeric) ? roundMoney(numeric) : 0;
}

function groupFinancings(items: FinancingItem[]): FinancingGroup[] {
  const map = new Map<string, FinancingItem[]>();

  for (const item of items) {
    if (!item?._id) continue;
    const groupKey = String(item.groupId || item._id);
    const current = map.get(groupKey) || [];
    current.push(item);
    map.set(groupKey, current);
  }

  const groups = Array.from(map.entries()).map(([groupKey, installments]) => {
    const sortedInstallments = [...installments].sort((a, b) => {
      const indexA = Number(a.installmentIndex || a.installmentPlan?.currentInstallment || 0);
      const indexB = Number(b.installmentIndex || b.installmentPlan?.currentInstallment || 0);

      if (indexA !== indexB) return indexA - indexB;

      const dateA = parseDateLikeUTC(a.transactionDate)?.getTime() || 0;
      const dateB = parseDateLikeUTC(b.transactionDate)?.getTime() || 0;
      return dateA - dateB;
    });

    const first = sortedInstallments[0];
    const plannedInstallments = sortedInstallments.filter((item) => item.status === 'planned');
    const confirmedInstallments = sortedInstallments.filter(
      (item) => item.status === 'confirmed'
    );

    const totalInstallments = Math.max(
      ...sortedInstallments.map((item) =>
        Number(item.installmentCount || item.installmentPlan?.totalInstallments || 0)
      ),
      sortedInstallments.length,
      1
    );

    const nextInstallment =
      [...plannedInstallments].sort((a, b) => {
        const dateA = parseDateLikeUTC(a.transactionDate)?.getTime() || 0;
        const dateB = parseDateLikeUTC(b.transactionDate)?.getTime() || 0;
        return dateA - dateB;
      })[0] || null;

    const installmentAmount = roundMoney(
      Number(
        nextInstallment?.installmentPlan?.installmentAmount ||
          nextInstallment?.amount ||
          first.installmentPlan?.installmentAmount ||
          first.amount ||
          0
      )
    );

    const financedAmount = roundMoney(
      Number(first.installmentPlan?.totalAmount || installmentAmount * totalInstallments || 0)
    );

    const notesAssetAmount = extractMoneyFromNotes(first.notes, 'Valor do bem');
    const notesDownPayment = extractMoneyFromNotes(first.notes, 'Entrada');

    const assetTotalAmount = roundMoney(
      notesAssetAmount > 0 ? notesAssetAmount : financedAmount + notesDownPayment
    );

    const downPayment = roundMoney(
      notesDownPayment > 0 ? notesDownPayment : Math.max(0, assetTotalAmount - financedAmount)
    );

    const paidInstallments = confirmedInstallments.length;
    const nextInstallmentNumber = nextInstallment
      ? Number(
          nextInstallment.installmentIndex ||
            nextInstallment.installmentPlan?.currentInstallment ||
            paidInstallments + 1
        )
      : null;

    const remainingDebt = roundMoney(
      plannedInstallments.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    );

    const status: FinancingGroup['status'] = remainingDebt > 0 ? 'active' : 'paid';

    return {
      groupKey,
      anchorId: String(first._id),
      groupId: first.groupId ? String(first.groupId) : null,
      description: first.description || 'Financiamento',
      categoryId: getObjectId(first.category),
      categoryName: getObjectName(first.category) || 'Sem categoria',
      accountId: getObjectId(first.account),
      accountName: getObjectName(first.account) || 'Sem conta',
      installmentAmount,
      totalInstallments,
      paidInstallments,
      nextInstallmentNumber,
      progressPercent:
        totalInstallments > 0
          ? Math.min(100, Math.max(0, (paidInstallments / totalInstallments) * 100))
          : 0,
      nextDueDate: nextInstallment?.transactionDate || null,
      remainingDebt,
      financedAmount,
      assetTotalAmount,
      downPayment,
      status,
      installments: sortedInstallments,
    };
  });

  return groups.sort((a, b) => {
    const aDate = parseDateLikeUTC(a.nextDueDate)?.getTime() || 0;
    const bDate = parseDateLikeUTC(b.nextDueDate)?.getTime() || 0;

    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }

    if (aDate !== bDate) {
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate - bDate;
    }

    return a.description.localeCompare(b.description, 'pt-BR');
  });
}

export default function FinancingsPage() {
  const [rawTransactions, setRawTransactions] = useState<FinancingItem[]>([]);
  const [summary, setSummary] = useState<FinancingSummary>(emptySummary);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FinancingFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    description: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupedFinancings = useMemo(() => groupFinancings(rawTransactions), [rawTransactions]);

  useEffect(() => {
    if (editingId) return;

    const total = Number(form.totalAmount) || 0;
    const down = Number(form.downPayment) || 0;
    const installments = Number(form.totalInstallments) || 0;

    if (total > 0 && installments > 0) {
      const financedAmount = Math.max(0, total - down);
      const calculated = roundMoney(financedAmount / installments).toFixed(2);

      if (form.installmentValue !== calculated) {
        setForm((prev) => ({ ...prev, installmentValue: calculated }));
      }
    }
  }, [form.totalAmount, form.downPayment, form.totalInstallments, form.installmentValue, editingId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [financingsData, summaryData, categoriesData, accountsData] = await Promise.all([
        fetchFinancings(),
        fetchFinancingSummary(),
        fetchCategories({ type: 'expense' }),
        fetchAccounts(),
      ]);

      setRawTransactions(Array.isArray(financingsData) ? (financingsData as FinancingItem[]) : []);
      setSummary(summaryData || emptySummary);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Erro ao carregar financiamentos:', error);
      toast.error('Erro ao carregar os financiamentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.isActive !== false),
    [accounts]
  );

  const financedAmountPreview = useMemo(() => {
    const total = Number(form.totalAmount) || 0;
    const down = Number(form.downPayment) || 0;
    return Math.max(0, roundMoney(total - down));
  }, [form.totalAmount, form.downPayment]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
  }, [isSubmitting]);

  const openCreateModal = useCallback(() => {
    setForm({
      ...defaultForm,
      category: expenseCategories[0]?._id || '',
      account: activeAccounts[0]?._id || '',
    });
    setEditingId(null);
    setFormError(null);
    setIsModalOpen(true);
  }, [expenseCategories, activeAccounts]);

  const openEditModal = useCallback((financing: FinancingGroup) => {
    setForm({
      description: financing.description,
      totalAmount: financing.assetTotalAmount > 0 ? String(financing.assetTotalAmount) : '',
      downPayment: financing.downPayment > 0 ? String(financing.downPayment) : '0',
      installmentValue: String(financing.installmentAmount || ''),
      totalInstallments: String(financing.totalInstallments || '1'),
      currentInstallment: String(financing.nextInstallmentNumber || financing.totalInstallments || 1),
      startDate: financing.nextDueDate
        ? formatISODateUTC(parseDateLikeUTC(financing.nextDueDate) || new Date())
        : getTodayISODateUTC(),
      category: financing.categoryId,
      account: financing.accountId,
    });
    setEditingId(financing.anchorId);
    setFormError(null);
    setIsModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const description = form.description.trim();

      if (!description) {
        setFormError('Informe a descrição do contrato.');
        return;
      }

      if (!form.category) {
        setFormError('Selecione uma categoria.');
        return;
      }

      try {
        setIsSubmitting(true);

        if (editingId) {
          await updateFinancing(editingId, {
            description,
            category: form.category,
          });

          toast.success('Contrato atualizado com sucesso.');
        } else {
          const totalAssetAmount = roundMoney(Number(form.totalAmount));
          const downPayment = roundMoney(Number(form.downPayment || 0));
          const installmentValue = roundMoney(Number(form.installmentValue));
          const totalInstallments = Number(form.totalInstallments);
          const currentInstallment = Number(form.currentInstallment);
          const startDate = form.startDate;

          if (!Number.isFinite(totalAssetAmount) || totalAssetAmount <= 0) {
            setFormError('Informe um valor do bem válido.');
            return;
          }

          if (!Number.isFinite(downPayment) || downPayment < 0) {
            setFormError('A entrada deve ser zero ou maior.');
            return;
          }

          if (downPayment > totalAssetAmount) {
            setFormError('A entrada não pode ser maior que o valor do bem.');
            return;
          }

          if (!Number.isInteger(totalInstallments) || totalInstallments < 1) {
            setFormError('Informe um prazo total válido.');
            return;
          }

          if (
            !Number.isInteger(currentInstallment) ||
            currentInstallment < 1 ||
            currentInstallment > totalInstallments
          ) {
            setFormError('A parcela atual deve estar entre 1 e o prazo total.');
            return;
          }

          if (!Number.isFinite(installmentValue) || installmentValue <= 0) {
            setFormError('Informe um valor de parcela válido.');
            return;
          }

          if (!startDate) {
            setFormError('Informe a data do próximo vencimento.');
            return;
          }

          if (!form.account) {
            setFormError('Selecione a conta de pagamento.');
            return;
          }

          await createFinancing({
            description,
            totalAmount: totalAssetAmount,
            downPayment,
            installmentValue,
            totalInstallments,
            currentInstallment,
            startDate,
            category: form.category,
            account: form.account,
          });

          toast.success('Financiamento registrado com sucesso.');
        }

        closeModal();
        await loadData();
      } catch (error) {
        console.error('Erro ao salvar financiamento:', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Erro ao salvar o financiamento.';
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, editingId, closeModal, loadData]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm?.id) return;

    try {
      setIsDeleting(true);
      await deleteFinancing(deleteConfirm.id);
      toast.success('Contrato excluído com sucesso.');
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir financiamento:', error);
      toast.error('Erro ao excluir o contrato.');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-500 border-t-transparent">
            <Loader2 className="animate-spin text-amber-500" size={30} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-800">
            Consolidando contratos...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-4 lg:px-8 lg:pt-8"
    >
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm"
      >
        <div className="absolute right-0 top-0 h-64 w-64 rounded-bl-full bg-gradient-to-br from-amber-50 to-orange-50" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-2 text-amber-600">
                <Building size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">
                Financiamentos
              </h1>
            </div>
            <p className="max-w-xl font-medium text-slate-500">
              Visualize contratos consolidados, dívida futura e compromisso mensal com uma leitura
              mais limpa e consistente.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.2rem] bg-gradient-to-r from-amber-500 to-orange-500 px-8 font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.99] md:w-auto"
          >
            <Plus size={20} strokeWidth={3} />
            Novo contrato
          </button>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard
          title="Contratos Ativos"
          value={String(summary.activeContracts)}
          tone="blue"
          icon={<FileText size={22} />}
        />
        <MetricCard
          title="Dívida Restante"
          value={formatCurrency(summary.totalDebt)}
          tone="red"
          icon={<Wallet size={22} />}
        />
        <MetricCard
          title="Compromisso Mensal"
          value={formatCurrency(summary.monthlyCommitment)}
          tone="amber"
          icon={<CalendarDays size={22} />}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm"
      >
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 p-8">
          <Landmark size={20} className="text-amber-600" />
          <h3 className="text-xl font-black tracking-tight text-slate-800">Meus contratos</h3>
        </div>

        {groupedFinancings.length === 0 ? (
          <div className="p-16 text-center">
            <Car className="mx-auto mb-4 text-slate-300" size={48} />
            <h4 className="text-xl font-black text-slate-700">Tudo limpo por aqui.</h4>
            <p className="mt-2 font-medium text-slate-400">
              Cadastre seu primeiro financiamento para acompanhar o fluxo futuro.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedFinancings.map((financing) => (
              <div
                key={financing.groupKey}
                className="group relative flex flex-col gap-6 p-6 transition-colors hover:bg-slate-50/50 sm:p-8 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="absolute right-6 top-6 flex gap-2 opacity-100 transition-all xl:right-8 xl:top-8 xl:opacity-0 xl:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditModal(financing)}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 shadow-sm transition-colors hover:text-blue-600"
                    aria-label="Editar contrato"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        id: financing.anchorId,
                        description: financing.description,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 shadow-sm transition-colors hover:text-red-600"
                    aria-label="Excluir contrato"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-start gap-5 pr-20 xl:pr-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] border border-amber-200 bg-amber-100 text-amber-600">
                    <Building size={24} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-black tracking-tight text-slate-800">
                        {financing.description}
                      </h4>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                          financing.status === 'active'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {financing.status === 'active' ? 'Em aberto' : 'Quitado'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                        {financing.categoryName}
                      </span>
                      <span className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                        <CreditCard size={14} />
                        {financing.accountName}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        Saldo financiado: {formatCurrency(financing.financedAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-8 xl:w-auto xl:justify-end xl:pr-24">
                  <div className="min-w-[130px]">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Parcela mensal
                    </p>
                    <p className="text-xl font-black text-rose-600">
                      {formatCurrency(financing.installmentAmount)}
                    </p>
                  </div>

                  <div className="min-w-[170px] flex-1">
                    <div className="mb-1 flex items-end justify-between gap-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Progresso
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {financing.paidInstallments} pagos de {financing.totalInstallments}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${financing.progressPercent}%` }}
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                      />
                    </div>
                  </div>

                  <div className="min-w-[170px] border-t border-slate-100 pt-2 text-left sm:border-none sm:pt-0 sm:text-right">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Próximo vencimento
                    </p>
                    <p className="flex items-center gap-2 font-black text-slate-700 sm:justify-end">
                      <CalendarDays size={16} />
                      {financing.nextDueDate
                        ? formatMonthYearUTC(financing.nextDueDate)
                        : 'Sem parcelas pendentes'}
                    </p>
                    {financing.nextInstallmentNumber ? (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Próxima parcela: {financing.nextInstallmentNumber}/{financing.totalInstallments}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-bold text-emerald-600">Contrato finalizado</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isModalOpen ? (
          <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-10 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

              <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">
                    Financiamento
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-800">
                    {editingId ? 'Editar contrato' : 'Novo contrato'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Descrição
                    </label>
                    <input
                      type="text"
                      required
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Ex: Financiamento do apartamento"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-lg font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  {!editingId ? (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          Valor do bem
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.totalAmount}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, totalAmount: event.target.value }))
                          }
                          placeholder="0,00"
                          className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-lg font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          Entrada
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.downPayment}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, downPayment: event.target.value }))
                          }
                          placeholder="0,00"
                          className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-lg font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between rounded-[1.4rem] border border-blue-100 bg-blue-50 p-4">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">
                          Saldo a financiar
                        </span>
                        <span className="text-xl font-black text-blue-900">
                          {formatCurrency(financedAmountPreview)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Prazo total
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={form.totalInstallments}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, totalInstallments: event.target.value }))
                            }
                            className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-center text-xl font-black text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                            Próxima parcela
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={form.currentInstallment}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, currentInstallment: event.target.value }))
                            }
                            className="w-full rounded-[1.2rem] border border-blue-200 bg-blue-50 p-4 text-center text-xl font-black text-blue-700 outline-none transition-all focus:border-blue-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          Valor da parcela
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          value={form.installmentValue}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, installmentValue: event.target.value }))
                          }
                          className="w-full rounded-[1.2rem] border border-rose-200 bg-rose-50/50 p-4 text-xl font-black text-rose-600 outline-none transition-all focus:border-rose-300 focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          Data do próximo vencimento
                        </label>
                        <input
                          type="date"
                          required
                          value={form.startDate}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, startDate: event.target.value }))
                          }
                          className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-lg font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                        />
                        <p className="mt-2 text-xs font-bold text-slate-400">
                          A API vai gerar as parcelas futuras a partir desta competência.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          Conta de pagamento
                        </label>
                        <select
                          required
                          value={form.account}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, account: event.target.value }))
                          }
                          className="w-full appearance-none rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                        >
                          <option value="">Selecione</option>
                          {activeAccounts.map((account) => (
                            <option key={account._id} value={account._id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2 rounded-[1.4rem] border border-amber-100 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-800">
                        Nesta versão, a edição do contrato permite alterar apenas a descrição e a
                        categoria. Para mudar conta, prazo, parcela, datas ou estrutura do
                        financiamento, exclua e recrie o contrato.
                      </p>
                    </div>
                  )}

                  <div className={editingId ? 'md:col-span-2' : ''}>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Categoria
                    </label>
                    <select
                      required
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="w-full appearance-none rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition-all focus:border-amber-500 focus:bg-white"
                    >
                      <option value="">Selecione</option>
                      {expenseCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formError ? (
                  <div className="flex items-center gap-2 rounded-[1.2rem] bg-red-50 p-4 font-bold text-red-600">
                    <AlertTriangle size={18} />
                    {formError}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-14 px-8 font-bold text-slate-500 transition-colors hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-amber-500 to-orange-500 px-10 font-black text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        {editingId ? 'Salvar alterações' : 'Criar contrato'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={32} />
              </div>
              <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-800">
                Excluir contrato?
              </h3>
              <p className="mb-2 text-sm font-bold text-slate-700">{deleteConfirm.description}</p>
              <p className="mb-6 font-medium text-slate-400">
                Isso removerá o contrato e todas as parcelas futuras planejadas do grupo.
              </p>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="mb-3 inline-flex h-14 w-full items-center justify-center rounded-[1.2rem] bg-red-500 font-black text-white shadow-lg shadow-red-500/20 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Sim, excluir contrato'
                )}
              </button>

              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="h-14 w-full rounded-[1.2rem] bg-slate-100 font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function MetricCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone: 'blue' | 'red' | 'amber';
  icon: ReactNode;
}) {
  const toneClass = {
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-rose-600 bg-rose-50',
    amber: 'text-amber-600 bg-amber-50',
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] ${toneClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {title}
        </p>
        <p className="text-3xl font-black tracking-tight text-slate-800">{value}</p>
      </div>
    </motion.div>
  );
}