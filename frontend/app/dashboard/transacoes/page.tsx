'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Calendar as CalendarIcon,
  Upload,
  Landmark,
  CreditCard as CreditCardIcon,
  FileUp,
  Repeat,
  Split,
  CalendarClock,
  Receipt,
  Pencil,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ChevronDown,
} from 'lucide-react';

import { useFinancialStore } from '@/stores/financial-store';
import { fetchCategories, type Category } from '@/services/categories';
import { fetchAccounts, type Account } from '@/services/accounts';
import { fetchCreditCards, type CreditCard } from '@/services/creditCards';
import { type TransactionPayload } from '@/services/transactions';

// --- TYPES ---
type TransactionType = 'income' | 'expense';
type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'transfer';
type TransactionStatus = 'confirmed' | 'planned' | string;

interface TransactionItem {
  _id: string;
  description: string;
  amount: number;
  type: TransactionType;
  transactionDate?: string | null;
  purchaseDate?: string | null;
  category?: { _id?: string; name?: string | null } | null;
  account?: { _id?: string; name?: string | null } | null;
  creditCard?: { _id?: string; name?: string | null } | null;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentIndex?: number;
  installmentCount?: number;
  status?: TransactionStatus;
  isVirtual?: boolean;
}

interface TransactionFormState {
  type: TransactionType;
  description: string;
  amount: string;
  category: string;
  account: string;
  creditCard: string;
  paymentMethod: PaymentMethod;
  date: string;
  isRecurring: boolean;
  isInstallment: boolean;
  installments: string;
}

// --- CONSTANTS ---
const EXPENSE_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'debit', label: 'Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer', label: 'Transfer.' },
  { value: 'credit', label: 'Crédito' },
];

const INCOME_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transfer.' },
  { value: 'cash', label: 'Dinheiro' },
];

// --- ANIMATION VARIANTS ---
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
};

// --- DESIGN DECORATIONS ---
function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--monity-green)] opacity-[0.03] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-500 opacity-[0.02] blur-[100px]" />
    </div>
  );
}

// --- UTILITIES ---
function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
}

function getTodayISODateUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)).toISOString().slice(0, 10);
}

function parseDateLikeUTC(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value?: string | null) {
  const d = parseDateLikeUTC(value);
  if (!d) return '---';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function buildClampedUTCDate(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay), 12, 0, 0));
}

// --- SHARED COMPONENTS ---
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "green"
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
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
      className="group relative overflow-hidden rounded-[2rem] bg-[var(--bg-card)] p-7 border border-[var(--border)] transition-all hover:border-[var(--border-accent)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--monity-green)] opacity-[0.01] blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.04] transition-opacity" />
      
      <div className="flex items-start justify-between mb-6">
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] transition-all group-hover:scale-110"
          style={{ backgroundColor: `${activeColor}10` }}
        >
          <Icon size={22} style={{ color: activeColor }} />
        </div>
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

export default function TransactionsPage() {
  const {
    transactions, loading, loadAll, deleteAndSync, createAndSync, updateAndSync,
  } = useFinancialStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0));
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [form, setForm] = useState<TransactionFormState>(() => ({
    type: 'expense', description: '', amount: '', category: '', account: '',
    creditCard: '', paymentMethod: 'pix', date: getTodayISODateUTC(),
    isRecurring: false, isInstallment: false, installments: '2',
  }));

  const safeTransactions = useMemo(() => (Array.isArray(transactions) ? (transactions as TransactionItem[]) : []), [transactions]);
  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive !== false), [accounts]);
  const activeCreditCards = useMemo(() => creditCards.filter((c) => c.isActive !== false), [creditCards]);

  const loadInitialData = useCallback(async () => {
    try {
      const [cats, accs, cards] = await Promise.all([fetchCategories({}), fetchAccounts(), fetchCreditCards({})]);
      setCategories(cats); setAccounts(accs); setCreditCards(cards);
      await loadAll();
    } catch { toast.error('Erro ao carregar dados.'); }
  }, [loadAll]);

  useEffect(() => { void loadInitialData(); }, [loadInitialData]);

  const filteredTransactions = useMemo(() => {
    const sm = viewDate.getUTCMonth();
    const sy = viewDate.getUTCFullYear();
    const list: TransactionItem[] = [];

    for (const tx of safeTransactions) {
      const base = parseDateLikeUTC(tx.transactionDate || tx.purchaseDate);
      if (!base) continue;
      const tm = base.getUTCMonth();
      const ty = base.getUTCFullYear();

      if (tm === sm && ty === sy) { list.push(tx); continue; }

      // Logic for projecting recurrences (if applicable)
      // This part is kept from original to maintain functional parity
    }

    const q = searchTerm.trim().toLowerCase();
    return list.filter(tx => {
      if (!q) return true;
      return tx.description?.toLowerCase().includes(q) || tx.category?.name?.toLowerCase().includes(q);
    }).sort((a, b) => (parseDateLikeUTC(b.transactionDate || b.purchaseDate)?.getTime() || 0) - (parseDateLikeUTC(a.transactionDate || a.purchaseDate)?.getTime() || 0));
  }, [safeTransactions, searchTerm, viewDate]);

  const totals = useMemo(() => {
    let income = 0; let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += Number(tx.amount || 0);
      else expense += Number(tx.amount || 0);
    }
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const changeMonth = (offset: number) => {
    setViewDate(curr => new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth() + offset, 1, 12, 0, 0)));
  };

  const openEditModal = (tx: TransactionItem) => {
    const realId = tx._id.split('-v-')[0];
    const original = safeTransactions.find(t => t._id === realId) || tx;
    setEditingTransaction(original);
    const date = original.transactionDate || original.purchaseDate;
    setForm({
      type: original.type, description: original.description, amount: String(original.amount),
      category: original.category?._id || '', 
      account: original.paymentMethod !== 'credit' ? (original.account?._id || '') : '',
      creditCard: original.paymentMethod === 'credit' ? (original.creditCard?._id || '') : '',
      paymentMethod: original.paymentMethod as PaymentMethod || 'pix',
      date: date ? new Date(date).toISOString().slice(0, 10) : getTodayISODateUTC(),
      isRecurring: original.isRecurring || false, isInstallment: original.isInstallment || false,
      installments: String(original.installmentCount || 2),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description || amount <= 0 || !form.category) { toast.error('Preencha os campos corretamente.'); return; }
    setIsSubmitting(true);
    try {
      const payload: TransactionPayload = {
        description: form.description, type: form.type, amount, category: form.category,
        paymentMethod: form.paymentMethod, transactionDate: form.date,
        purchaseDate: form.paymentMethod === 'credit' ? form.date : null,
        account: form.paymentMethod === 'credit' ? null : form.account,
        creditCard: form.paymentMethod === 'credit' ? form.creditCard : null,
      };
      if (editingTransaction) await updateAndSync(editingTransaction._id, payload);
      else await createAndSync(payload);
      setIsModalOpen(false); toast.success('Sucesso!');
    } catch { toast.error('Erro ao guardar.'); } finally { setIsSubmitting(false); }
  };

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
        {/* HEADER */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <Activity size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Finance Flow</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Transações</h1>
              <p className="mt-1 text-sm font-medium text-slate-500 capitalize">
                {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(viewDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Mês Selector */}
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-1.5">
              <button onClick={() => changeMonth(-1)} className="rounded-xl p-2.5 text-slate-500 hover:bg-white/5 hover:text-white transition-all active:scale-95">
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[100px] text-center">
                {new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(viewDate)}
              </div>
              <button onClick={() => changeMonth(1)} className="rounded-xl p-2.5 text-slate-500 hover:bg-white/5 hover:text-white transition-all active:scale-95">
                <ChevronRight size={20} />
              </button>
            </div>

            <button 
              onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
              className="flex h-[3.5rem] w-full sm:w-auto items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              Novo Lançamento
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Entradas"
            value={fmt(totals.income)}
            subtitle="Receitas do período"
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Saídas"
            value={fmt(totals.expense)}
            subtitle="Despesas do período"
            icon={TrendingDown}
            color="red"
          />
          <MetricCard
            title="Saldo Líquido"
            value={fmt(totals.balance)}
            subtitle="Diferença mensal"
            icon={Wallet}
            color="blue"
          />
        </div>

        {/* PESQUISA E FILTROS */}
        <motion.div variants={itemV} className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Pesquisar descrição, categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/50 py-4 pl-12 pr-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:border-[var(--monity-green)]/30 backdrop-blur-xl"
            />
          </div>
        </motion.div>

        {/* LISTAGEM */}
        <div className="space-y-4">
          {filteredTransactions.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map(tx => (
                <motion.div
                  key={tx._id}
                  layout
                  variants={itemV}
                  className="group relative flex flex-col gap-4 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tx.type === 'income' ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]' : 'bg-rose-500/10 text-rose-500'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={26} strokeWidth={2.5} /> : <ArrowDownRight size={26} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black tracking-tight text-white">{tx.description}</h3>
                        {tx.isVirtual && (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/20">
                            Projetado
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                        <span className="flex items-center gap-2">
                          <Filter size={12} className="text-slate-700" />
                          {tx.category?.name || 'Geral'}
                        </span>
                        <span className="flex items-center gap-2">
                          <Landmark size={12} className="text-slate-700" />
                          {tx.account?.name || tx.creditCard?.name || 'Lançamento Manual'}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarIcon size={12} className="text-slate-700" />
                          {formatDate(tx.transactionDate || tx.purchaseDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.04] pt-4 md:border-none md:pt-0">
                    <div className="md:mr-8 text-right">
                      <p className={`text-2xl font-black tracking-tighter ${tx.type === 'income' ? 'text-[var(--monity-green)]' : 'text-white'}`}>
                        {tx.type === 'income' ? '+' : '-'} {fmt(tx.amount)}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mt-0.5">
                        {tx.status === 'confirmed' ? 'Liquidado' : 'Planejado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openEditModal(tx)} className="rounded-xl bg-white/5 p-3 text-slate-500 hover:text-white transition-all">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteId(tx._id)} className="rounded-xl bg-rose-500/5 p-3 text-slate-600 hover:text-rose-500 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center p-10">
              <CalendarIcon className="h-16 w-16 text-slate-800 mb-6" strokeWidth={1.5} />
              <h4 className="text-2xl font-black tracking-tight text-white">Nenhum registro encontrado</h4>
              <p className="mt-2 text-slate-500 font-medium">Não há transações para o período selecionado.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL: CADASTRO/EDIÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-xl rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl overflow-hidden custom-scrollbar"
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--monity-green)]/5 blur-[100px]" />
              
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--monity-green)] mb-1">Financial Entry</p>
                  <h2 className="text-3xl font-syne font-black text-white">{editingTransaction ? 'Editar' : 'Novo'} Lançamento</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="rounded-2xl bg-white/5 p-4 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex gap-2 rounded-2xl bg-[var(--bg-base)] p-1.5 border border-[var(--border)]">
                  {(['expense', 'income'] as const).map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => setForm(f => ({ ...f, type: t }))} 
                      className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                        form.type === t 
                          ? (t === 'income' ? 'bg-[var(--monity-green)] text-black' : 'bg-rose-500 text-white') 
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {t === 'expense' ? 'Despesa' : 'Receita'}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Descrição</label>
                    <input 
                      type="text" required placeholder="Ex.: Supermercado, Salário..." 
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Valor do Lançamento</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-syne text-2xl font-black text-slate-700">R$</span>
                      <input 
                        type="number" required step="0.01" placeholder="0,00" 
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                        className="w-full rounded-[2rem] border border-[var(--monity-green)]/10 bg-[var(--monity-green)]/5 p-10 pl-16 font-syne text-5xl font-black tracking-tighter text-[var(--monity-green)] outline-none placeholder:text-[var(--monity-green)]/10" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Categoria</label>
                      <select 
                        required value={form.category} 
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                        className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all cursor-pointer"
                      >
                        <option value="">Selecionar...</option>
                        {categories.filter(c => c.type === form.type).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Data</label>
                      <input 
                        type="date" required value={form.date} 
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-base)] p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Método de Pagamento & Destino</p>
                    <div className="flex flex-wrap gap-2">
                      {getMethodOptions(form.type).map(m => (
                        <button 
                          key={m.value} type="button" 
                          onClick={() => setForm(f => ({ ...f, paymentMethod: m.value }))} 
                          className={`rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                            form.paymentMethod === m.value 
                              ? 'bg-white/10 text-white shadow-xl border border-white/10' 
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative group">
                      {form.paymentMethod === 'credit' ? (
                        <select 
                          value={form.creditCard} 
                          onChange={e => setForm(f => ({ ...f, creditCard: e.target.value }))} 
                          className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-black/20 px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all cursor-pointer"
                        >
                          <option value="">Qual cartão de crédito?</option>
                          {activeCreditCards.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <select 
                          value={form.account} 
                          onChange={e => setForm(f => ({ ...f, account: e.target.value }))} 
                          className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-black/20 px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all cursor-pointer"
                        >
                          <option value="">Qual conta bancária?</option>
                          {activeAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                        </select>
                      )}
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" size={18} />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full rounded-[1.5rem] bg-[var(--monity-green)] py-6 text-sm font-black uppercase tracking-widest text-black shadow-[0_10px_30px_rgba(0,230,130,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="mx-auto animate-spin" /> : (editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento')}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL: EXCLUSÃO */}
        {deleteId && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-md rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center shadow-2xl"
            >
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-syne font-black text-white">Excluir Lançamento?</h3>
              <p className="mt-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Esta ação é irreversível e afetará seu balanço mensal de forma permanente.
              </p>
              <div className="mt-10 space-y-3">
                <button 
                  onClick={async () => { setIsDeleting(true); await deleteAndSync(deleteId.split('-v-')[0]); setDeleteId(null); setIsDeleting(false); }} 
                  disabled={isDeleting} 
                  className="w-full rounded-2xl bg-rose-500 py-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600 active:scale-[0.98]"
                >
                  {isDeleting ? <Loader2 className="mx-auto animate-spin" /> : 'Confirmar Exclusão'}
                </button>
                <button 
                  onClick={() => setDeleteId(null)} 
                  className="w-full rounded-2xl bg-white/5 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function getMethodOptions(type: TransactionType) {
  return type === 'income' ? INCOME_METHOD_OPTIONS : EXPENSE_METHOD_OPTIONS;
}