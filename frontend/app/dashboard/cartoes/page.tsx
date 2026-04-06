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

// Nova interface para mapear as transações e calcular o limite dinamicamente
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
  color: '#2563EB',
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
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

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

// Funções de Limite (AGORA DINÂMICAS COM BASE NO USO REAL)
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

    // Se foi pago no crédito E foi neste cartão exato
    if (t.paymentMethod === 'credit' && tCardId === cardId) {
      if (t.type === 'expense') {
        used += Number(t.amount || 0);
      } else if (t.type === 'income') {
        used -= Number(t.amount || 0); // Desconta caso haja estorno/pagamento de fatura
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
    blue: {
      box: 'bg-white border-slate-100 hover:border-blue-100',
      icon: 'bg-blue-50 text-blue-600',
      value: 'text-blue-600',
    },
    purple: {
      box: 'bg-white border-slate-100 hover:border-purple-100',
      icon: 'bg-purple-50 text-purple-600',
      value: 'text-purple-600',
    },
    green: {
      box: 'bg-white border-slate-100 hover:border-emerald-100',
      icon: 'bg-emerald-50 text-emerald-600',
      value: 'text-emerald-600',
    },
    red: {
      box: 'bg-white border-slate-100 hover:border-rose-100',
      icon: 'bg-rose-50 text-rose-600',
      value: 'text-rose-600',
    },
    slate: {
      box: 'bg-slate-900 border-slate-800 shadow-xl shadow-slate-900/10',
      icon: 'bg-slate-800 text-slate-300',
      value: 'text-white',
    },
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-[2.5rem] p-7 shadow-sm border flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md ${styles.box}`}
    >
      <div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${styles.icon}`}>
          {icon}
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-1 text-slate-400">{title}</p>
        <p className={`text-3xl font-black tracking-tighter ${styles.value}`}>{value}</p>
      </div>
      {subtitle && <p className="text-xs font-bold mt-3 text-slate-400">{subtitle}</p>}
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Agora extraímos também as transações do Store global para calcular a fatura viva!
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
      color: card.color || '#2563EB',
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

      if (!name) {
        throw new Error('Informe o nome do cartão.');
      }

      if (limit !== null && (Number.isNaN(limit) || limit < 0)) {
        throw new Error('Informe um limite válido.');
      }

      if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
        throw new Error('O dia de fechamento deve estar entre 1 e 31.');
      }

      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error('O dia de vencimento deve estar entre 1 e 31.');
      }

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

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir o cartão "${name}"?`)) return;

    try {
      setDeletingId(id);
      await deleteCreditCard(id);
      toast.success('Cartão excluído com sucesso!');
      await loadCards();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao excluir o cartão.'));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-200" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto pb-32"
    >
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Financeiro</p>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter">Cartões</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cartão, banco ou conta vinculada..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-14 pr-6 py-4.5 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-700"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="px-8 py-4.5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all font-black flex items-center gap-3"
          >
            <Plus size={20} strokeWidth={3} /> Novo Cartão
          </button>
        </div>
      </div>

      <motion.div
        variants={itemVariants}
        className="rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 sm:p-7 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Info size={22} />
          </div>

          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 mb-1">
              Agora os cartões já têm noção real de limite e pagamento
            </h3>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">
              Cada cartão já mostra quanto ainda está disponível, quanto foi consumido, o percentual usado e
              qual conta está vinculada para pagamento. Isso prepara a base para evolução futura sem precisar
              inventar um módulo de fatura separado agora.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
          tone="purple"
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

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <CreditCardIcon size={28} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">Meus Cartões</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {filteredCards.length} cartão(ões) encontrado(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as FiltersState['status'],
                }))
              }
              className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-black text-xs uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Apenas Ativos</option>
              <option value="inactive">Apenas Inativos</option>
            </select>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredCards.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <CreditCardIcon className="text-slate-300" size={48} />
              </div>
              <h4 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Nenhum cartão encontrado</h4>
              <p className="text-slate-500 font-bold">Ajuste sua busca, mude o filtro ou cadastre um novo cartão.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredCards.map((card) => {
                const cycle = getCycleInfo(card);
                const totalLimit = getTotalLimit(card);
                const usedLimit = getUsedLimit(card, safeTransactions);
                const availableLimit = getAvailableLimit(card, safeTransactions);
                const usagePercent = getUsagePercent(card, safeTransactions);

                return (
                  <motion.div
                    key={card._id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all relative flex flex-col h-full overflow-hidden"
                  >
                    <div
                      className="absolute top-0 right-0 w-36 h-36 blur-[70px] opacity-15 transition-opacity group-hover:opacity-35"
                      style={{ backgroundColor: card.color || '#2563EB' }}
                    />

                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex items-center gap-5">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
                          style={{
                            backgroundColor: `${card.color || '#2563EB'}15`,
                            color: card.color || '#2563EB',
                          }}
                        >
                          <CreditCardIcon size={28} strokeWidth={2.5} />
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1.5">
                            {card.name}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {card.bankCode || 'INSTITUIÇÃO NÃO INFORMADA'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(card)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50"
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          onClick={() => handleDelete(card._id, card.name)}
                          disabled={deletingId === card._id}
                          className="p-2 text-slate-300 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deletingId === card._id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 mb-5 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Disponível Agora
                      </p>
                      <p className="text-4xl font-black tracking-tighter text-slate-900">
                        {formatCurrency(availableLimit)}
                      </p>
                      <p className="text-sm font-bold text-slate-500">
                        Usado {formatCurrency(usedLimit)} de {formatCurrency(totalLimit)}
                      </p>
                    </div>

                    <div className="mb-6 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Consumo do Limite
                        </p>
                        <span className="text-xs font-black text-slate-600">
                          {usagePercent.toFixed(0)}%
                        </span>
                      </div>

                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${usagePercent}%`,
                            backgroundColor: card.color || '#2563EB',
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Fechamento
                        </p>
                        <p className="font-black text-slate-700 text-sm">Dia {card.closingDay}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">{cycle.nextClosingLabel}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Vencimento
                        </p>
                        <p className="font-black text-slate-700 text-sm">Dia {card.dueDay}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">{cycle.nextDueLabel}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/70 rounded-[1.75rem] p-5 border border-slate-100 relative z-10 mb-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Ciclo Atual
                      </p>

                      <div className="space-y-1.5">
                        <p className="text-sm font-black text-slate-800">
                          Compras de <span className="text-blue-600">{formatShortDate(cycle.cycleStart)}</span> até{' '}
                          <span className="text-blue-600">{formatShortDate(cycle.nextClosing)}</span>
                        </p>

                        <p className="text-sm font-bold text-slate-500">
                          Fecham em <span className="text-slate-700">{formatShortDate(cycle.nextClosing)}</span> e
                          vencem em <span className="text-slate-700">{formatShortDate(cycle.nextDue)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                          <Landmark size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Conta Vinculada
                          </p>
                          <p className="text-sm font-black text-slate-800">
                            {card.linkedAccount?.name || 'Sem conta vinculada'}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-slate-500">
                        {card.linkedAccount
                          ? `Saldo atual da conta: ${formatCurrency(card.linkedAccount.currentBalance)}`
                          : 'Defina uma conta para indicar de onde sairá o pagamento do cartão.'}
                      </p>
                    </div>

                    <div className="mt-auto pt-6 flex items-center justify-between relative z-10">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          card.isActive
                            ? 'bg-white border-emerald-100 text-emerald-600'
                            : 'bg-white border-rose-100 text-rose-600'
                        }`}
                      >
                        {card.isActive ? 'Ativo' : 'Inativo'}
                      </span>

                      {!card.isActive && (
                        <span className="text-[11px] font-bold text-rose-500">Fora de operação</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              <motion.button
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={openCreateModal}
                className="rounded-[2.5rem] border-4 border-dashed border-slate-100 p-8 flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-blue-200 hover:text-blue-400 transition-all min-h-[420px] group"
              >
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Plus size={32} />
                </div>
                <p className="font-black uppercase tracking-widest text-xs">Adicionar Cartão</p>
              </motion.button>
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
                    {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                  </h2>
                  <p className="text-slate-500 font-bold text-sm">
                    Defina limite, conta de pagamento e datas do ciclo.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="bg-slate-50 p-3 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Nome do Cartão
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex.: Nubank Black"
                      className="w-full text-xl font-black p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Instituição / Banco
                    </label>
                    <input
                      type="text"
                      value={form.bankCode}
                      onChange={(e) => setForm((prev) => ({ ...prev, bankCode: e.target.value }))}
                      placeholder="Ex.: Nubank, Itaú"
                      className="w-full text-base font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 h-[68px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Limite Total (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-blue-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.limit}
                        onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))}
                        placeholder="0.00"
                        className="w-full text-3xl font-black text-blue-600 pl-16 p-5 bg-blue-50/50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Conta Vinculada para Pagamento
                    </label>
                    <select
                      value={form.linkedAccountId}
                      onChange={(e) => setForm((prev) => ({ ...prev, linkedAccountId: e.target.value }))}
                      className="w-full text-base font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 appearance-none text-slate-700 cursor-pointer h-[68px]"
                    >
                      <option value="">Sem conta vinculada</option>
                      {accountOptions.map((account) => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <p className="px-1 text-xs font-bold text-slate-500">
                      {accountOptions.length > 0
                        ? 'Escolha de qual conta sairá o dinheiro para pagar este cartão.'
                        : 'Nenhuma conta ativa encontrada. Cadastre ou ative uma conta para vincular.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Fechamento (Dia)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.closingDay}
                      onChange={(e) => setForm((prev) => ({ ...prev, closingDay: e.target.value }))}
                      className="w-full text-lg font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all h-[68px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Vencimento (Dia)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.dueDay}
                      onChange={(e) => setForm((prev) => ({ ...prev, dueDay: e.target.value }))}
                      className="w-full text-lg font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all h-[68px]"
                    />
                  </div>

                  <div className="md:col-span-2 rounded-[2rem] border border-amber-100 bg-amber-50 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700 mb-1">
                      Regra importante do produto
                    </p>
                    <p className="text-sm font-bold text-amber-800 leading-relaxed">
                      O cartão continua preparado para separar <span className="font-black">purchaseDate</span> de{' '}
                      <span className="font-black">transactionDate</span>. É isso que vai permitir calcular
                      corretamente competência, ciclo e consumo real do limite sem gerar inconsistência entre
                      frontend e backend.
                    </p>
                  </div>

                  <div className="md:col-span-2 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl flex-1 border border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Cor de Identificação
                      </label>
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent ml-auto"
                      />
                    </div>

                    <label className="flex items-center justify-between gap-4 cursor-pointer p-4 bg-slate-50 rounded-2xl flex-1 border border-slate-100 hover:bg-white transition-all">
                      <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Cartão Ativo</span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                        className={`h-8 w-14 rounded-full flex items-center px-1 transition-colors ${
                          form.isActive ? 'bg-blue-600 shadow-inner shadow-blue-800/20' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`h-6 w-6 bg-white rounded-full shadow-md transition-transform ${
                            form.isActive ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-bold text-rose-600 flex items-center gap-3">
                    <AlertTriangle size={20} /> {formError}
                  </div>
                )}

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-5 rounded-[1.5rem] bg-blue-600 text-white font-black text-xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
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
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}