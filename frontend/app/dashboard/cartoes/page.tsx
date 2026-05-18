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
  Receipt,
  Calendar,
  ChevronRight,
} from 'lucide-react';

// IMPORT DO MODAL DE HISTÓRICO
import { CreditCardHistoryModal } from '@/components/CreditCardHistoryModal';

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
  color: '#00e682',
  isActive: true,
};

// --- ANIMATION VARIANTS (Standardized) ---
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

// --- DESIGN DECORATIONS (Standardized) ---
function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--monity-green)] opacity-[0.03] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-[var(--monity-green)] opacity-[0.02] blur-[100px]" />
      <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] rounded-full bg-blue-500 opacity-[0.01] blur-[100px]" />
    </div>
  );
}

// --- UTILITIES ---
function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
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

// --- SHARED COMPONENTS ---
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "green"
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  trend?: { value: string; isPositive: boolean };
  color?: "green" | "blue" | "purple" | "red" | "orange";
}) {
  const colorMap = {
    green: "var(--monity-green)",
    blue: "#3b82f6",
    purple: "#a855f7",
    red: "#ef4444",
    orange: "#f97316"
  };

  const activeColor = colorMap[color];

  return (
    <motion.div
      variants={itemV}
      className="group relative overflow-hidden rounded-[2rem] bg-[var(--bg-card)] p-7 border border-[var(--border)] transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--monity-green)] opacity-[0.02] blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.05] transition-opacity" />
      
      <div className="flex items-start justify-between mb-6">
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] transition-all group-hover:scale-110 group-hover:border-[var(--border-accent)]"
          style={{ backgroundColor: `${activeColor}10` }}
        >
          <Icon size={22} style={{ color: activeColor }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${trend.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend.value}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5">{title}</p>
        <h3 className="text-3xl font-black tracking-tight text-white">{value}</h3>
        {subtitle && (
          <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p>
        )}
      </div>
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

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryCardId, setSelectedHistoryCardId] = useState<string | null>(null);
  const [selectedHistoryCardName, setSelectedHistoryCardName] = useState("");

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
    loadAll();
  }, [loadCards, loadAll]);

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
      color: card.color || '#00e682',
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
        <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
      </div>
    );
  }

  return (
    <>
      <BackgroundDecorations />
      
      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-8 px-4 pb-32 pt-6 sm:px-6 lg:px-10"
      >
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <CreditCardIcon size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Crédito & Finanças</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Cartões</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Gerencie limites e acompanhe suas faturas de forma inteligente.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[var(--monity-green)]" size={18} />
              <input
                type="text"
                placeholder="Buscar cartão..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-base)] py-4 pl-12 pr-4 font-medium text-white outline-none transition-all focus:border-[var(--monity-green)]/50 focus:ring-4 focus:ring-[var(--monity-green)]/10"
              />
            </div>
            <button
              onClick={openCreateModal}
              className="flex h-[3.5rem] items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              Novo Cartão
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Cartões Ativos"
            value={String(stats.active)}
            subtitle={`De um total de ${stats.total}`}
            icon={CreditCardIcon}
            color="blue"
          />
          <MetricCard
            title="Limite Global"
            value={formatCurrency(stats.totalLimit)}
            subtitle="Soma total de todos os cartões"
            icon={Wallet}
            color="purple"
          />
          <MetricCard
            title="Disponível"
            value={formatCurrency(stats.totalAvailable)}
            subtitle="Pronto para utilização"
            icon={CheckCircle2}
            color="green"
          />
          <MetricCard
            title="Utilizado"
            value={formatCurrency(stats.totalUsed)}
            subtitle={`${((stats.totalUsed / (stats.totalLimit || 1)) * 100).toFixed(1)}% do limite total`}
            icon={Gauge}
            color="orange"
          />
        </div>

        {/* INFO CARD */}
        <motion.div variants={itemV} className="group relative overflow-hidden rounded-[2rem] border border-[var(--monity-green)]/20 bg-[var(--monity-green)]/[0.03] p-8 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--monity-green)] opacity-[0.02] blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--monity-green)]/10 text-[var(--monity-green)] border border-[var(--monity-green)]/20">
              <Info size={28} />
            </div>
            <div>
              <h3 className="mb-2 text-xl font-black tracking-tight text-white">Sincronização de Faturas</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-400 max-w-3xl">
                Suas faturas são calculadas dinamicamente com base nas datas de fechamento e vencimento configuradas. Todas as transações marcadas como &quot;Crédito&quot; para um cartão específico afetam automaticamente seu limite disponível.
              </p>
            </div>
          </div>
        </motion.div>

        {/* LISTAGEM DE CARTÕES */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[var(--monity-green)] shadow-[0_0_10px_rgba(0,230,130,0.5)]" />
              <h2 className="font-syne text-2xl font-bold text-white uppercase tracking-tight">Seus Cartões</h2>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as FiltersState['status'] }))}
              className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none transition-all hover:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--monity-green)]/20"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCards.length === 0 ? (
              <div className="col-span-full flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center">
                <CreditCardIcon className="mb-6 text-slate-700" size={64} />
                <h4 className="text-2xl font-black tracking-tight text-white">Nenhum cartão</h4>
                <p className="mt-2 text-slate-500 font-medium max-w-xs">Ajuste os filtros ou comece cadastrando seu primeiro cartão de crédito.</p>
                <button onClick={openCreateModal} className="mt-8 flex items-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all">
                  <Plus size={18} /> Cadastrar agora
                </button>
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {filteredCards.map((card) => {
                  const cycle = getCycleInfo(card);
                  const totalLimit = getTotalLimit(card);
                  const usedLimit = getUsedLimit(card, safeTransactions);
                  const availableLimit = getAvailableLimit(card, safeTransactions);
                  const usagePercent = getUsagePercent(card, safeTransactions);
                  const cardColor = card.color || 'var(--monity-green)';

                  return (
                    <motion.div
                      key={card._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] p-8 transition-all hover:border-[var(--border-accent)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                      {/* CARD VISUAL EFFECT */}
                      <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity overflow-hidden">
                        <div 
                          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[80px]"
                          style={{ backgroundColor: cardColor }}
                        />
                      </div>

                      <div className="relative z-10 flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div 
                            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 shadow-2xl"
                            style={{ 
                              background: `linear-gradient(135deg, ${cardColor}20 0%, ${cardColor}10 100%)`,
                              color: cardColor 
                            }}
                          >
                            <CreditCardIcon size={28} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h4 className="text-xl font-black tracking-tight text-white">{card.name}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                              {card.bankCode || 'BANCO'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                          <button 
                            onClick={() => openEditModal(card)} 
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-blue-500 hover:text-white transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ id: card._id, name: card.name })}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 mb-8">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Disponível</p>
                            <h3 className="text-3xl font-black tracking-tight text-white">{formatCurrency(availableLimit)}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Utilizado</p>
                            <p className="text-lg font-black text-slate-300">{formatCurrency(usedLimit)}</p>
                          </div>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/[0.03]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className="h-full relative"
                            style={{ backgroundColor: cardColor }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                          </motion.div>
                        </div>
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[10px] font-bold text-slate-500">Total: {formatCurrency(totalLimit)}</span>
                          <span className="text-[10px] font-black" style={{ color: cardColor }}>{usagePercent.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.03] p-4 group-hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Fechamento</span>
                          </div>
                          <p className="text-sm font-black text-white">Dia {card.closingDay}</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">{cycle.nextClosingLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.03] p-4 group-hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Vencimento</span>
                          </div>
                          <p className="text-sm font-black text-white">Dia {card.dueDay}</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">{cycle.nextDueLabel}</p>
                        </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/[0.05] flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs px-1">
                          <div className="flex items-center gap-2">
                            <Landmark size={14} className="text-slate-500" />
                            <span className="font-bold text-slate-400">{card.linkedAccount?.name || 'Sem vínculo'}</span>
                          </div>
                          <span className={`h-2 w-2 rounded-full ${card.isActive ? 'bg-[var(--monity-green)] shadow-[0_0_8px_rgba(0,230,130,0.4)]' : 'bg-slate-700'}`} />
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedHistoryCardId(card._id);
                            setSelectedHistoryCardName(card.name);
                            setIsHistoryModalOpen(true);
                          }}
                          className="flex items-center justify-between w-full group/btn rounded-2xl bg-white/5 py-4 px-5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[var(--monity-green)] hover:text-black active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-3">
                            <Receipt size={16} />
                            Consultar Fatura
                          </div>
                          <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={closeModal} 
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-2xl overflow-hidden rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[var(--monity-green)] to-transparent opacity-50" />
                
                <div className="p-8 sm:p-12 max-h-[90vh] overflow-y-auto">
                  <div className="mb-10 flex items-center justify-between">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Configuração de Cartão</p>
                      <h2 className="font-syne text-3xl font-extrabold text-white">{editingCard ? 'Editar Detalhes' : 'Novo Cartão'}</h2>
                    </div>
                    <button onClick={closeModal} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome do Cartão</label>
                        <input 
                          type="text" 
                          required 
                          value={form.name} 
                          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} 
                          placeholder="Ex: Cartão Black"
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-lg font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50 focus:ring-4 focus:ring-[var(--monity-green)]/10"
                        />
                      </div>

                      <div>
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Instituição</label>
                        <input 
                          type="text" 
                          value={form.bankCode} 
                          onChange={(e) => setForm(prev => ({ ...prev, bankCode: e.target.value }))} 
                          placeholder="Ex: Nubank, Itaú"
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50"
                        />
                      </div>

                      <div>
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Limite Total</label>
                        <div className="relative group">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-[var(--monity-green)]">R$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            required
                            value={form.limit} 
                            onChange={(e) => setForm(prev => ({ ...prev, limit: e.target.value }))} 
                            placeholder="0,00"
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 pl-14 text-2xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Conta para Pagamento</label>
                        <select 
                          value={form.linkedAccountId} 
                          onChange={(e) => setForm(prev => ({ ...prev, linkedAccountId: e.target.value }))}
                          className="w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50 appearance-none"
                        >
                          <option value="">Nenhuma conta vinculada</option>
                          {accountOptions.map(acc => (
                            <option key={acc._id} value={acc._id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <div>
                          <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Dia Fechamento</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="31" 
                            required 
                            value={form.closingDay} 
                            onChange={(e) => setForm(prev => ({ ...prev, closingDay: e.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-center text-xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50"
                          />
                        </div>
                        <div>
                          <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Dia Vencimento</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="31" 
                            required 
                            value={form.dueDay} 
                            onChange={(e) => setForm(prev => ({ ...prev, dueDay: e.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-center text-xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/50">
                        <div className="flex items-center gap-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cor do Cartão</label>
                          <input 
                            type="color" 
                            value={form.color} 
                            onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                            className="h-10 w-16 cursor-pointer rounded-lg border-none bg-transparent"
                          />
                        </div>
                        <div className="h-8 w-px bg-[var(--border)]" />
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cartão Ativo</span>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.isActive ? 'bg-[var(--monity-green)]' : 'bg-slate-700'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {formError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-rose-500/10 p-5 text-sm font-bold text-rose-400 border border-rose-500/20">
                        <AlertTriangle size={20} className="shrink-0" />
                        {formError}
                      </motion.div>
                    )}

                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className="relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,230,130,0.2)] active:scale-[0.98] disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        <>
                          <CheckCircle2 size={24} />
                          {editingCard ? 'Salvar Alterações' : 'Cadastrar Cartão'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md overflow-hidden rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border)] p-10 text-center shadow-2xl"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Trash2 size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-syne mb-2 text-2xl font-extrabold text-white">Excluir Cartão?</h3>
                <p className="mb-2 text-lg font-bold text-slate-300">{deleteConfirm.name}</p>
                <p className="mb-10 text-sm font-medium text-slate-500">
                  Esta ação é irreversível. Todas as configurações e histórico de faturas deste cartão serão removidos permanentemente.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-2xl bg-rose-500 py-5 font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="w-full rounded-2xl bg-white/5 py-5 font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <CreditCardHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          creditCardId={selectedHistoryCardId}
          cardName={selectedHistoryCardName}
        />

      </motion.div>
    </>
  );
}
