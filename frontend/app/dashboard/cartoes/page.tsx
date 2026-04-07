'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  createCreditCard,
  deleteCreditCard,
  fetchCreditCards,
  updateCreditCard,
  type CreditCard,
  type CreditCardPayload,
} from '../../../services/creditCards';
import { useFinancialStore } from '@/stores/financial-store';
import {
  CreditCard as CreditCardIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
  AlertTriangle,
  X,
  CheckCircle2,
  Info,
  Landmark,
  Gauge,
} from 'lucide-react';

interface CreditCardFormState {
  name: string;
  bankCode: string;
  limit: string;
  linkedAccountId: string;
  closingDay: string;
  dueDay: string;
  color: string;
  isActive: boolean;
}

interface FiltersState {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

interface AccountOption {
  _id: string;
  name: string;
  type?: string;
  color?: string;
  currentBalance?: number;
  isActive: boolean;
}

interface CardTransactionBase {
  type: string;
  amount?: number;
  paymentMethod?: string;
  creditCard?: string | { _id?: string } | null;
}

const INITIAL_FORM: CreditCardFormState = {
  name: '',
  bankCode: '',
  limit: '',
  linkedAccountId: '',
  closingDay: '25',
  dueDay: '5',
  color: '#3498DB',
  isActive: true,
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
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
  'w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10';

const SELECT_CLASS =
  'w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10 cursor-pointer';

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#9B59B6]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#2ECC71]/10 blur-[100px]" />
    </div>
  );
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function clampDay(day: number) {
  return Math.min(31, Math.max(1, day));
}

function buildUtcDate(year: number, monthIndex: number, day: number) {
  const normalizedBase = new Date(Date.UTC(year, monthIndex, 1));
  const normalizedYear = normalizedBase.getUTCFullYear();
  const normalizedMonth = normalizedBase.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(normalizedYear, normalizedMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(normalizedYear, normalizedMonth, Math.min(clampDay(day), lastDayOfMonth)));
}

function getUtcToday(reference = new Date()) {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
}

function getNextOccurrenceDate(day: number, reference = new Date()) {
  const today = getUtcToday(reference);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const thisMonth = buildUtcDate(year, month, day);
  if (thisMonth.getTime() >= today.getTime()) return thisMonth;

  return buildUtcDate(year, month + 1, day);
}

function diffInDays(target: Date, reference = new Date()) {
  const today = getUtcToday(reference);
  const distance = target.getTime() - today.getTime();
  return Math.round(distance / 86400000);
}

function getRelativeLabel(target: Date, reference = new Date()) {
  const days = diffInDays(target, reference);

  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}

function getCycleInfo(card: Pick<CreditCard, 'closingDay' | 'dueDay'>, reference = new Date()) {
  const nextClosing = getNextOccurrenceDate(card.closingDay, reference);
  const dueMonthOffset = card.dueDay > card.closingDay ? 0 : 1;
  const nextDue = buildUtcDate(
    nextClosing.getUTCFullYear(),
    nextClosing.getUTCMonth() + dueMonthOffset,
    card.dueDay,
  );

  const previousClosing = buildUtcDate(
    nextClosing.getUTCFullYear(),
    nextClosing.getUTCMonth() - 1,
    card.closingDay,
  );

  const cycleStart = new Date(previousClosing.getTime() + 86400000);

  return {
    cycleStart,
    nextClosing,
    nextDue,
    nextClosingLabel: getRelativeLabel(nextClosing, reference),
    nextDueLabel: getRelativeLabel(nextDue, reference),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const typedError = error as {
      response?: { data?: { message?: unknown } };
    };

    if (typeof typedError.response?.data?.message === 'string') {
      return typedError.response.data.message;
    }
  }

  return fallback;
}

function getTotalLimit(card: CreditCard) {
  const value = Number(card.limit ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getUsedLimit(card: CreditCard, transactions: CardTransactionBase[]) {
  const cardId = String(card._id);
  let used = 0;

  for (const t of transactions) {
    let tCardId = '';
    
    if (typeof t.creditCard === 'string') {
      tCardId = t.creditCard;
    } else if (t.creditCard && typeof t.creditCard === 'object' && '_id' in t.creditCard) {
      tCardId = String(t.creditCard._id);
    }

    if (t.paymentMethod === 'credit' && tCardId === cardId) {
      if (t.type === 'expense') {
        used += Number(t.amount || 0);
      } else if (t.type === 'income') {
        used -= Number(t.amount || 0);
      }
    }
  }

  return Math.max(0, used);
}

function getAvailableLimit(card: CreditCard, transactions: CardTransactionBase[]) {
  const total = getTotalLimit(card);
  const used = getUsedLimit(card, transactions);
  return Math.max(0, total - used);
}

function getUsagePercent(card: CreditCard, transactions: CardTransactionBase[]) {
  const total = getTotalLimit(card);
  if (total <= 0) return 0;
  const used = getUsedLimit(card, transactions);
  return Math.min(100, Math.max(0, (used / total) * 100));
}

function MetricCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone: 'blue' | 'purple' | 'green' | 'red' | 'slate';
  icon: ReactNode;
}) {
  const styles = {
    blue: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#3498DB]/10',
    purple: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#9B59B6]/10',
    green: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#2ECC71]/10',
    red: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#FF3366]/10',
    slate: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50] border-none text-white shadow-xl shadow-[#34495E]/30',
  }[tone];

  const iconStyles = {
    blue: 'bg-[#3498DB]/10 text-[#3498DB]',
    purple: 'bg-[#9B59B6]/10 text-[#9B59B6]',
    green: 'bg-[#2ECC71]/10 text-[#2ECC71]',
    red: 'bg-rose-50 text-[#FF3366]',
    slate: 'bg-white/10 text-white backdrop-blur-md',
  }[tone];

  const textStyles = tone === 'slate' ? 'text-white' : 'text-[#34495E]';
  const labelStyles = tone === 'slate' ? 'text-white/70' : 'text-slate-400';

  return (
    <motion.div
      variants={itemVariants}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-1 sm:rounded-[2rem] ${styles}`}
    >
      {tone === 'slate' && <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />}
      <div className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner ${iconStyles}`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.24em] ${labelStyles}`}>
          {title}
        </p>
        <p className={`truncate text-2xl font-black tracking-tighter sm:text-3xl ${textStyles}`}>
          {value}
        </p>
      </div>
      {subtitle && <p className={`relative z-10 mt-3 text-xs font-bold ${labelStyles}`}>{subtitle}</p>}
    </motion.div>
  );
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>({ search: '', status: 'all' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CreditCardFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { accounts, transactions = [], loadAll } = useFinancialStore();

  const safeTransactions = useMemo(() => {
    return Array.isArray(transactions) ? (transactions as CardTransactionBase[]) : [];
  }, [transactions]);

  const accountOptions = useMemo(() => {
    const safeAccounts = ((accounts || []) as AccountOption[]).filter(Boolean);

    return safeAccounts
      .filter((account) => account.isActive || account._id === form.linkedAccountId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [accounts, form.linkedAccountId]);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCreditCards({});
      setCards(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Não foi possível carregar os cartões.');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredCards = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      const linkedAccountName = card.linkedAccount?.name?.toLowerCase() || '';

      const matchesSearch =
        !term ||
        card.name.toLowerCase().includes(term) ||
        String(card.bankCode || '').toLowerCase().includes(term) ||
        linkedAccountName.includes(term);

      const matchesStatus =
        filters.status === 'all'
          ? true
          : filters.status === 'active'
            ? card.isActive
            : !card.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [cards, filters]);

  const stats = useMemo(() => {
    const activeCards = cards.filter((card) => card.isActive);
    const totalLimit = cards.reduce((sum, card) => sum + getTotalLimit(card), 0);
    const totalAvailable = cards.reduce((sum, card) => sum + getAvailableLimit(card, safeTransactions), 0);
    const totalUsed = cards.reduce((sum, card) => sum + getUsedLimit(card, safeTransactions), 0);

    return {
      total: cards.length,
      active: activeCards.length,
      inactive: cards.length - activeCards.length,
      totalLimit,
      totalAvailable,
      totalUsed,
    };
  }, [cards, safeTransactions]);

  function openCreateModal() {
    setEditingCard(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(card: CreditCard) {
    setEditingCard(card);
    setForm({
      name: card.name || '',
      bankCode: card.bankCode || '',
      limit: card.limit != null ? String(card.limit) : '',
      linkedAccountId: card.linkedAccount?._id || '',
      closingDay: String(card.closingDay || 25),
      dueDay: String(card.dueDay || 5),
      color: card.color || '#3498DB',
      isActive: card.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingCard(null);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError(null);

      const name = form.name.trim();
      const bankCode = form.bankCode.trim();
      const limit = form.limit.trim() ? Number(form.limit) : null;
      const closingDay = Number(form.closingDay);
      const dueDay = Number(form.dueDay);

      if (!name) throw new Error('Informe o nome do cartão.');
      if (limit !== null && (Number.isNaN(limit) || limit < 0)) throw new Error('Informe um limite válido.');
      if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) throw new Error('O dia de fechamento deve estar entre 1 e 31.');
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('O dia de vencimento deve estar entre 1 e 31.');

      const payload: CreditCardPayload = {
        name,
        bankCode: bankCode || null,
        limit,
        linkedAccount: form.linkedAccountId || null,
        closingDay,
        dueDay,
        color: form.color,
        isActive: form.isActive,
      };

      if (editingCard) {
        await updateCreditCard(editingCard._id, payload);
        toast.success('Cartão atualizado com sucesso!');
      } else {
        await createCreditCard(payload);
        toast.success('Cartão criado com sucesso!');
      }

      await loadCards();
      closeModal();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Erro ao salvar cartão.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm?.id) return;

    try {
      setIsDeleting(true);
      await deleteCreditCard(deleteConfirm.id);
      toast.success('Cartão excluído com sucesso!');
      await loadCards();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao excluir o cartão.'));
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#3498DB] border-t-transparent shadow-lg shadow-[#3498DB]/20" />
      </div>
    );
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    await handleDeleteConfirm();
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
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">
              Controle de Crédito
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">Cartões</h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">
              Gerencie limites, defina contas para pagamento e acompanhe suas faturas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar cartão..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-white/50 py-3.5 pl-12 pr-4 font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
              />
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] px-6 py-3.5 font-black text-white shadow-lg shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] sm:w-auto"
            >
              <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" /> Novo Cartão
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard
            title="Total de cartões"
            value={String(stats.total)}
            subtitle={`${stats.active} ativos`}
            tone="blue"
            icon={<CreditCardIcon size={24} />}
          />
          <MetricCard
            title="Limite total"
            value={formatCurrency(stats.totalLimit)}
            subtitle="Soma dos limites cadastrados"
            tone="slate"
            icon={<Wallet size={24} />}
          />
          <MetricCard
            title="Disponível agora"
            value={formatCurrency(stats.totalAvailable)}
            subtitle="Ainda livre para comprar"
            tone="green"
            icon={<CheckCircle2 size={24} />}
          />
          <MetricCard
            title="Já utilizado"
            value={formatCurrency(stats.totalUsed)}
            subtitle="Consumo acumulado do limite"
            tone="red"
            icon={<Gauge size={24} />}
          />
        </div>

        {/* INFO CARD */}
        <motion.div variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-[#3498DB]/20 bg-[#3498DB]/5 p-6 sm:p-8 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB] shadow-inner">
              <Info size={24} />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-black tracking-tight text-[#34495E]">
                Fatura Dinâmica Integrada
              </h3>
              <p className="text-sm font-bold leading-relaxed text-slate-500">
                O limite consumido e disponível do seu cartão é atualizado automaticamente com base nas transações registradas nele. Ele se conecta perfeitamente ao seu controle principal!
              </p>
            </div>
          </div>
        </motion.div>

        {/* LISTAGEM DE CARTÕES */}
        <motion.div variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
          <div className="flex flex-col gap-4 border-b border-slate-100/50 bg-white/40 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB] shadow-inner">
                <CreditCardIcon size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#34495E]">Meus Cartões</h3>
                <p className="mt-1 text-sm font-bold text-slate-400">{filteredCards.length} encontrado(s)</p>
              </div>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as FiltersState['status'] }))}
              className="cursor-pointer appearance-none rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm outline-none transition-all hover:bg-white focus:border-[#3498DB]/40 focus:ring-4 focus:ring-[#3498DB]/10"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Apenas Ativos</option>
              <option value="inactive">Apenas Inativos</option>
            </select>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCards.length === 0 ? (
              <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center text-center">
                <CreditCardIcon className="mb-4 text-slate-300" size={52} />
                <h4 className="text-xl font-black tracking-tight text-[#34495E]">Nenhum cartão encontrado.</h4>
                <p className="mt-2 text-sm font-bold text-slate-400">Ajuste sua busca, filtros ou cadastre um novo cartão.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredCards.map((card) => {
                  const cycle = getCycleInfo(card);
                  const totalLimit = getTotalLimit(card);
                  const usedLimit = getUsedLimit(card, safeTransactions);
                  const availableLimit = getAvailableLimit(card, safeTransactions);
                  const usagePercent = getUsagePercent(card, safeTransactions);
                  const cardColor = card.color || '#3498DB';

                  return (
                    <motion.div
                      key={card._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl sm:p-7"
                    >
                      {/* Efeito luminoso do cartão */}
                      <div
                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                        style={{ backgroundColor: cardColor }}
                      />

                      <div className="relative z-10 mb-6 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-[1rem] shadow-sm"
                            style={{ backgroundColor: `${cardColor}15`, color: cardColor }}
                          >
                            <CreditCardIcon size={24} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black tracking-tight text-[#34495E]">{card.name}</h4>
                            <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                              {card.bankCode || 'Instituição não informada'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                          <button onClick={() => openEditModal(card)} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-[#3498DB]/10 hover:text-[#3498DB]">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ id: card._id, name: card.name })} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-[#FF3366]">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 mb-5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Disponível Agora</p>
                        <p className="text-3xl font-black tracking-tighter text-[#34495E]">{formatCurrency(availableLimit)}</p>
                        <p className="text-xs font-bold text-slate-500">Usado {formatCurrency(usedLimit)} de {formatCurrency(totalLimit)}</p>
                      </div>

                      <div className="relative z-10 mb-6">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Consumo do Limite</span>
                          <span style={{ color: cardColor }}>{usagePercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cardColor }}
                          />
                        </div>
                      </div>

                      <div className="relative z-10 mb-6 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50/50 p-3">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Fechamento</p>
                          <p className="text-sm font-black text-[#34495E]">Dia {card.closingDay}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">{cycle.nextClosingLabel}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50/50 p-3">
                          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Vencimento</p>
                          <p className="text-sm font-black text-[#34495E]">Dia {card.dueDay}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">{cycle.nextDueLabel}</p>
                        </div>
                      </div>

                      <div className="relative z-10 mt-auto rounded-[1.25rem] border border-slate-100 bg-white/80 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Landmark size={14} className="text-slate-400" />
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Conta Vinculada</p>
                        </div>
                        <p className="text-sm font-black text-[#34495E]">{card.linkedAccount?.name || 'Sem conta vinculada'}</p>
                      </div>

                      <div className="relative z-10 mt-5 flex items-center justify-between">
                        <span
                          className={`rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                            card.isActive
                              ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
                              : 'bg-rose-50 text-rose-500'
                          }`}
                        >
                          {card.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">Controle de Crédito</p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</h2>
                  </div>
                  <button onClick={closeModal} className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Nome do Cartão</label>
                      <input type="text" required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex.: Nubank Black" className={INPUT_CLASS} />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Instituição / Banco (Opcional)</label>
                      <input type="text" value={form.bankCode} onChange={(e) => setForm((prev) => ({ ...prev, bankCode: e.target.value }))} placeholder="Ex.: Itaú, Nubank" className={INPUT_CLASS} />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Limite Total (R$)</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-[#3498DB]">R$</span>
                        <input type="number" step="0.01" min="0" value={form.limit} onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))} placeholder="0.00" className="w-full rounded-[1.25rem] border-2 border-[#3498DB]/30 bg-[#3498DB]/5 p-4 pl-14 text-3xl font-black tracking-tighter text-[#3498DB] outline-none transition-all placeholder:text-[#3498DB]/50 focus:border-[#3498DB] focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Conta Vinculada para Pagamento</label>
                      <select value={form.linkedAccountId} onChange={(e) => setForm((prev) => ({ ...prev, linkedAccountId: e.target.value }))} className={SELECT_CLASS}>
                        <option value="">Sem conta vinculada</option>
                        {accountOptions.map((account) => (
                          <option key={account._id} value={account._id}>{account.name}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
                        {accountOptions.length > 0 ? 'Escolha de qual conta sairá o dinheiro para pagar este cartão.' : 'Nenhuma conta ativa encontrada para vincular.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:col-span-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Fechamento (Dia)</label>
                        <input type="number" min="1" max="31" required value={form.closingDay} onChange={(e) => setForm((prev) => ({ ...prev, closingDay: e.target.value }))} className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 text-center text-lg font-black text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Vencimento (Dia)</label>
                        <input type="number" min="1" max="31" required value={form.dueDay} onChange={(e) => setForm((prev) => ({ ...prev, dueDay: e.target.value }))} className="w-full rounded-[1.25rem] border-2 border-[#3498DB]/30 bg-[#3498DB]/5 p-4 text-center text-lg font-black text-[#3498DB] outline-none transition-all focus:border-[#3498DB] focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm mt-2">
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cor de Identificação</label>
                        <input type="color" value={form.color} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} className="h-10 w-12 cursor-pointer rounded-lg border-none bg-transparent p-0 outline-none" />
                      </div>
                      
                      <div className="hidden h-8 w-px bg-slate-100 sm:block" />
                      
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status do Cartão</span>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                          className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-all ${
                            form.isActive ? 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60] shadow-inner' : 'bg-slate-200 shadow-inner'
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-3 rounded-[1.25rem] bg-rose-50 p-4 text-sm font-bold text-[#FF3366]">
                      <AlertTriangle size={18} className="shrink-0" />
                      {formError}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {submitting ? <Loader2 className="animate-spin relative z-10" size={20} /> : <><CheckCircle2 size={20} className="relative z-10" /><span className="relative z-10">{editingCard ? 'Salvar Alterações' : 'Cadastrar Cartão'}</span></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
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
                  Excluir cartão?
                </h3>
                <p className="mb-2 text-sm font-black text-[#34495E]">{deleteConfirm.name}</p>
                <p className="mb-8 text-xs font-bold leading-relaxed text-slate-400">
                  Tem certeza? Esta ação removerá o cartão permanentemente do seu painel.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-[1.25rem] bg-[#FF3366] py-4 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all hover:bg-[#e62e5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir cartão'}
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