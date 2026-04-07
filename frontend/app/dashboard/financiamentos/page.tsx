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
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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

interface FinancingItem extends Omit<Financing, 'category' | 'account' | 'status' | 'transactionDate' | 'installmentPlan'> {
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
};

const INPUT_CLASS =
  'w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#F39C12]/40 focus:bg-white focus:ring-4 focus:ring-[#F39C12]/10';

const SELECT_CLASS =
  'w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#F39C12]/40 focus:bg-white focus:ring-4 focus:ring-[#F39C12]/10';

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#F39C12]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#E74C3C]/10 blur-[100px]" />
    </div>
  );
}

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
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#F39C12] border-t-transparent shadow-lg shadow-[#F39C12]/20" />
      </div>
    );
  }

  return (
    <>
      <BackgroundBlobs />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-6 px-4 pb-32 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-10"
      >
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F39C12]/10 text-[#F39C12] shadow-inner">
                <Building size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">
                Financiamentos
              </h1>
            </div>
            <p className="mt-1.5 max-w-xl text-sm font-bold text-slate-500">
              Visualize contratos consolidados, dívida futura e compromisso mensal de forma simples.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="group flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-tr from-[#F39C12] to-[#E67E22] px-8 py-4 font-black text-white shadow-xl shadow-[#F39C12]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#F39C12]/40 active:translate-y-0 active:scale-[0.98] sm:w-auto"
          >
            <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
            Novo contrato
          </button>
        </div>

        <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
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
          className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]"
        >
          <div className="flex items-center gap-4 border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F39C12]/10 text-[#F39C12] shadow-inner">
              <Landmark size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-[#34495E]">Meus contratos</h3>
              <p className="mt-1 text-sm font-bold text-slate-400">Acompanhe e gerencie sua frota/imóveis.</p>
            </div>
          </div>

          {groupedFinancings.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center p-10 text-center">
              <Car className="mb-4 text-slate-300" size={52} />
              <h4 className="text-xl font-black tracking-tight text-[#34495E]">Tudo limpo por aqui.</h4>
              <p className="mt-2 text-sm font-bold text-slate-400">
                Cadastre seu primeiro financiamento para acompanhar o fluxo futuro.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/50">
              {groupedFinancings.map((financing) => (
                <div
                  key={financing.groupKey}
                  className="group relative flex flex-col gap-6 p-6 transition-colors hover:bg-white/50 sm:p-8 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="absolute right-6 top-6 flex gap-2 opacity-100 transition-all xl:right-8 xl:top-8 xl:opacity-0 xl:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(financing)}
                      className="rounded-xl border border-white/60 bg-white/50 p-2.5 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-[#3498DB]"
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
                      className="rounded-xl border border-white/60 bg-white/50 p-2.5 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-[#FF3366]"
                      aria-label="Excluir contrato"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-start gap-5 pr-20 xl:pr-0">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-[#F39C12] shadow-sm">
                      <Building size={24} strokeWidth={2.5} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl font-black tracking-tight text-[#34495E]">
                          {financing.description}
                        </h4>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                            financing.status === 'active'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-[#2ECC71]/10 text-[#2ECC71]'
                          }`}
                        >
                          {financing.status === 'active' ? 'Em aberto' : 'Quitado'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <span className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white/60 px-3 py-1.5 shadow-sm">
                          {financing.categoryName}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-xl border border-[#3498DB]/10 bg-[#3498DB]/5 px-3 py-1.5 text-[#3498DB]">
                          <CreditCard size={14} />
                          {financing.accountName}
                        </span>
                        <span className="rounded-xl border border-[#2ECC71]/10 bg-[#2ECC71]/5 px-3 py-1.5 text-[#2ECC71]">
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
                      <p className="text-xl font-black text-[#FF3366]">
                        {formatCurrency(financing.installmentAmount)}
                      </p>
                    </div>

                    <div className="min-w-[170px] flex-1">
                      <div className="mb-1.5 flex items-end justify-between gap-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Progresso
                        </p>
                        <p className="text-[11px] font-black text-[#34495E]">
                          {financing.paidInstallments} de {financing.totalInstallments}
                        </p>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-slate-100 bg-slate-100/50 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${financing.progressPercent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[#F39C12] to-[#E67E22]"
                        />
                      </div>
                    </div>

                    <div className="min-w-[170px] border-t border-slate-100/50 pt-4 text-left sm:border-none sm:pt-0 sm:text-right">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Próximo vencimento
                      </p>
                      <p className="flex items-center gap-2 font-black text-[#34495E] sm:justify-end">
                        <CalendarDays size={16} className="text-[#3498DB]" />
                        {financing.nextDueDate
                          ? formatMonthYearUTC(financing.nextDueDate)
                          : 'Sem parcelas'}
                      </p>
                      {financing.nextInstallmentNumber ? (
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          Próxima parcela: <strong className="text-[#34495E]">{financing.nextInstallmentNumber}/{financing.totalInstallments}</strong>
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-[#2ECC71]">
                          Finalizado
                        </p>
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
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              />

              <motion.div
                initial={{ y: '100%', scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#F39C12]">
                      Financiamento
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">
                      {editingId ? 'Editar contrato' : 'Novo contrato'}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                    aria-label="Fechar modal"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
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
                        className={INPUT_CLASS}
                      />
                    </div>

                    {!editingId ? (
                      <>
                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Valor do bem
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={form.totalAmount}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, totalAmount: event.target.value }))
                              }
                              placeholder="0,00"
                              className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 pl-12 text-lg font-black text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#F39C12]/40 focus:bg-white focus:ring-4 focus:ring-[#F39C12]/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Entrada
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={form.downPayment}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, downPayment: event.target.value }))
                              }
                              placeholder="0,00"
                              className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 pl-12 text-lg font-black text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#F39C12]/40 focus:bg-white focus:ring-4 focus:ring-[#F39C12]/10"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-between rounded-[1.25rem] border border-[#3498DB]/20 bg-[#3498DB]/5 p-5">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3498DB]">
                            Saldo a financiar
                          </span>
                          <span className="text-xl font-black tracking-tight text-[#3498DB]">
                            {formatCurrency(financedAmountPreview)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
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
                              placeholder="Meses"
                              className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 text-center text-lg font-black text-[#34495E] outline-none transition-all focus:border-[#F39C12]/40 focus:bg-white focus:ring-4 focus:ring-[#F39C12]/10"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[#3498DB]">
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
                              className="w-full rounded-[1.25rem] border-2 border-[#3498DB]/30 bg-[#3498DB]/5 p-4 text-center text-lg font-black text-[#3498DB] outline-none transition-all focus:border-[#3498DB] focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Valor da parcela
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              min="0.01"
                              value={form.installmentValue}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, installmentValue: event.target.value }))
                              }
                              className="w-full rounded-[1.25rem] border-2 border-[#FF3366]/20 bg-rose-50/50 p-4 pl-12 text-xl font-black text-[#FF3366] outline-none transition-all focus:border-[#FF3366]/40 focus:bg-white focus:ring-4 focus:ring-[#FF3366]/10"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Data do próximo vencimento
                          </label>
                          <input
                            type="date"
                            required
                            value={form.startDate}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, startDate: event.target.value }))
                            }
                            className={INPUT_CLASS}
                          />
                          <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
                            O sistema gerará todas as parcelas futuras a partir desta competência automaticamente.
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            Conta de pagamento
                          </label>
                          <select
                            required
                            value={form.account}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, account: event.target.value }))
                            }
                            className={SELECT_CLASS}
                          >
                            <option value="">Selecione a conta</option>
                            {activeAccounts.map((account) => (
                              <option key={account._id} value={account._id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-2 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5">
                        <p className="text-sm font-bold leading-relaxed text-amber-800">
                          Nesta versão, a edição do contrato permite alterar apenas a descrição e a
                          categoria. Para mudar conta, prazo, parcela, datas ou estrutura do
                          financiamento, você deve excluir e recriar o contrato.
                        </p>
                      </div>
                    )}

                    <div className={editingId ? 'md:col-span-2' : ''}>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Categoria
                      </label>
                      <select
                        required
                        value={form.category}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        className={SELECT_CLASS}
                      >
                        <option value="">Selecione a categoria</option>
                        {expenseCategories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formError ? (
                    <div className="flex items-center gap-3 rounded-[1.25rem] bg-rose-50 p-4 text-sm font-bold text-[#FF3366]">
                      <AlertTriangle size={18} className="shrink-0" />
                      {formError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#F39C12] to-[#E67E22] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#F39C12]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#F39C12]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin relative z-10" size={20} />
                        <span className="relative z-10">Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} className="relative z-10" />
                        <span className="relative z-10">{editingId ? 'Salvar alterações' : 'Criar contrato'}</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirm ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 text-center shadow-2xl"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#FF3366]">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="mb-2 text-xl font-black tracking-tighter text-[#34495E]">
                  Excluir contrato?
                </h3>
                <p className="mb-2 text-sm font-black text-[#34495E]">{deleteConfirm.description}</p>
                <p className="mb-8 text-xs font-bold leading-relaxed text-slate-400">
                  Isso removerá o contrato e todas as parcelas futuras planejadas associadas a ele.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-[1.25rem] bg-[#FF3366] py-4 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all hover:bg-[#e62e5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="w-full rounded-[1.25rem] bg-slate-100 py-4 font-bold text-slate-500 transition-all hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
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
  const styles = {
    blue: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#3498DB]/10',
    red: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#FF3366]/10',
    amber: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#F39C12]/10',
  }[tone];

  const iconStyles = {
    blue: 'bg-[#3498DB]/10 text-[#3498DB]',
    red: 'bg-rose-50 text-[#FF3366]',
    amber: 'bg-[#F39C12]/10 text-[#F39C12]',
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className={`flex flex-col justify-between rounded-[1.75rem] p-6 transition-all hover:-translate-y-1 sm:rounded-[2rem] ${styles}`}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner ${iconStyles}`}>
        {icon}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {title}
        </p>
        <p className="truncate text-2xl font-black tracking-tighter text-[#34495E] sm:text-3xl">
          {value}
        </p>
      </div>
    </motion.div>
  );
}