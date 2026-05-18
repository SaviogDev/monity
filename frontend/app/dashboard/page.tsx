'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  BrainCircuit,
  Plus,
  X,
  Landmark,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Activity,
  Target,
  History,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';

import { useFinancialStore } from '@/stores/financial-store';
import { fetchMonthlyInsight, type Insight } from '@/services/insights';
import { fetchCategories, type Category } from '@/services/categories';
import { fetchAccounts, type Account } from '@/services/accounts';
import { fetchCreditCards, type CreditCard } from '@/services/creditCards';
import { fetchMe } from '@/services/auth';
import type { TransactionPayload } from '@/services/transactions';

// --- TYPES ---
type TransactionType = 'income' | 'expense';
type PaymentMethod = 'pix' | 'debit' | 'credit';
type TransactionStatus = 'confirmed' | 'planned';

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
  paymentMethod?: PaymentMethod | string;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentIndex?: number;
  installmentCount?: number;
  status?: TransactionStatus;
}

interface PaymentMethodView {
  name: string;
  amount: number;
  count: number;
  color: string;
}

interface ProjectionPoint {
  date: string;
  label: string;
  saldo: number;
  entradas: number;
  saidas: number;
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

// --- UTILITIES ---
function createInitialForm(): TransactionFormState {
  return {
    type: 'expense',
    description: '',
    amount: '',
    category: '',
    account: '',
    creditCard: '',
    paymentMethod: 'pix',
    date: getTodayISODateUTC(),
    isRecurring: false,
    isInstallment: false,
    installments: '2',
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getAccountBalance(account: Account) {
  const accountWithBalance = account as Account & {
    currentBalance?: number;
    balance?: number;
  };

  return Number(accountWithBalance.currentBalance || accountWithBalance.balance || 0);
}

function getTooltipCurrencyValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value || 0);
}

function parseISODateOnlyUTC(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseDateLikeUTC(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseISODateOnlyUTC(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value?: string | null) {
  const date = parseDateLikeUTC(value);
  if (!date) return '---';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatISODateUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayISODateUTC() {
  const now = new Date();
  return formatISODateUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)));
}

function getCurrentUTCDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
}

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0));
}

function endOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12, 0, 0));
}

function getLastDayOfMonthUTC(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

function addDaysUTC(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 12, 0, 0));
}

function calculateCreditCardDueDate(purchaseDateISO: string, closingDay: number, dueDay: number): string {
  const purchaseDate = parseISODateOnlyUTC(purchaseDateISO);
  if (!purchaseDate) return purchaseDateISO;
  const purchaseYear = purchaseDate.getUTCFullYear();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const purchaseDay = purchaseDate.getUTCDate();
  let dueMonth = purchaseMonth;
  let dueYear = purchaseYear;
  if (purchaseDay > closingDay) dueMonth += 1;
  if (dueDay <= closingDay) dueMonth += 1;
  while (dueMonth > 11) { dueMonth -= 12; dueYear += 1; }
  const safeDueDay = Math.min(dueDay, getLastDayOfMonthUTC(dueYear, dueMonth));
  return formatISODateUTC(new Date(Date.UTC(dueYear, dueMonth, safeDueDay, 12, 0, 0)));
}

function getPaymentMethodLabel(method?: string | null) {
  const map: Record<string, string> = { pix: 'PIX', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro', transfer: 'Transferência' };
  return method ? map[method] || method : 'Outro';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// --- DESIGN COMPONENTS ---
function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--monity-green)] opacity-[0.03] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-500 opacity-[0.02] blur-[100px]" />
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "glass"
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "glass" | "green";
}) {
  if (variant === "green") {
    return (
      <motion.div
        variants={itemV}
        className="group relative overflow-hidden rounded-[2.5rem] bg-[var(--monity-green)] p-8 text-black shadow-[0_20px_50px_rgba(0,230,130,0.25)] transition-all hover:scale-[1.02]"
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-black/5 blur-2xl" />
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10">
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">{title}</p>
        </div>
        <h3 className="font-syne text-5xl font-black tracking-tighter sm:text-6xl">{value}</h3>
        {subtitle && <p className="mt-3 text-sm font-bold opacity-50">{subtitle}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={itemV}
      className="group relative overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] p-8 border border-[var(--border)] transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--monity-green)] opacity-[0.01] blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.04] transition-opacity" />
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/5 group-hover:scale-110 transition-transform">
          <Icon size={24} className="text-slate-400 group-hover:text-[var(--monity-green)]" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
      </div>
      <h3 className="font-syne text-4xl font-black tracking-tight text-white">{value}</h3>
      {subtitle && <p className="mt-2 text-sm font-medium text-slate-600">{subtitle}</p>}
    </motion.div>
  );
}

// --- MAIN PAGE ---
export default function DashboardPage() {
  const { transactions = [], projection, loading, loadAll, createAndSync } = useFinancialStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [userName, setUserName] = useState('');
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Olá');
  const [form, setForm] = useState<TransactionFormState>(createInitialForm);

  const safeTransactions = useMemo(() => (Array.isArray(transactions) ? (transactions as TransactionItem[]) : []), [transactions]);

  const currentUTCDate = useMemo(() => getCurrentUTCDate(), []);
  const monthStart = useMemo(() => startOfMonthUTC(currentUTCDate), [currentUTCDate]);
  const monthEnd = useMemo(() => endOfMonthUTC(currentUTCDate), [currentUTCDate]);
  const next30Days = useMemo(() => addDaysUTC(currentUTCDate, 30), [currentUTCDate]);

  const syncDashboardData = useCallback(async (showErrorToast = false) => {
    try {
      await loadAll();
      const accs = await fetchAccounts();
      setAccounts(accs);
    } catch {
      if (showErrorToast) toast.error('Não foi possível sincronizar o dashboard.');
    }
  }, [loadAll]);

  const loadInitialData = useCallback(async () => {
    try {
      const [cats, accs, cards, user] = await Promise.all([
        fetchCategories({}),
        fetchAccounts(),
        fetchCreditCards({}),
        fetchMe().catch(() => null),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setCreditCards(cards);
      if (user?.name) setUserName(user.name.split(' ')[0]);
      if (accs.length === 1) setForm((prev) => ({ ...prev, account: prev.account || accs[0]._id }));
      if (cards.length === 1) setForm((prev) => ({ ...prev, creditCard: prev.creditCard || cards[0]._id }));
      await syncDashboardData(true);
    } catch {
      toast.error('Não foi possível carregar os dados do dashboard.');
    }
  }, [syncDashboardData]);

  useEffect(() => {
    void loadInitialData();
    setGreeting(getGreeting());
  }, [loadInitialData]);

  useEffect(() => {
    const handleWindowFocus = () => { void syncDashboardData(); };
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') void syncDashboardData(); };
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncDashboardData]);

  useEffect(() => {
    async function loadInsight() {
      try {
        const data = await fetchMonthlyInsight(currentUTCDate.getUTCMonth() + 1, currentUTCDate.getUTCFullYear());
        setInsight(data);
      } catch {
        setInsight(null);
      }
    }
    if (safeTransactions.length > 0) void loadInsight();
    else setInsight(null);
  }, [currentUTCDate, safeTransactions.length]);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive !== false), [accounts]);
  const activeCreditCards = useMemo(() => creditCards.filter((card) => card.isActive !== false), [creditCards]);
  const accountsTotalBalance = useMemo(() => activeAccounts.reduce((sum, account) => sum + getAccountBalance(account), 0), [activeAccounts]);
  const currentBalanceBase = useMemo(() => typeof projection?.currentBalance === 'number' ? projection.currentBalance : accountsTotalBalance, [accountsTotalBalance, projection]);

  const sortedTransactions = useMemo(() => {
    return [...safeTransactions].sort((a, b) => {
      const dateA = parseDateLikeUTC(a.transactionDate || a.purchaseDate)?.getTime() || 0;
      const dateB = parseDateLikeUTC(b.transactionDate || b.purchaseDate)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [safeTransactions]);

  const recentTransactions = useMemo(() => {
    return sortedTransactions.filter((transaction) => {
      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) return false;
      const time = date.getTime();
      return time >= monthStart.getTime() && time <= monthEnd.getTime();
    }).slice(0, 5);
  }, [sortedTransactions, monthStart, monthEnd]);

  const monthSummary = useMemo(() => {
    let income = 0; let expense = 0;
    for (const transaction of safeTransactions) {
      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) continue;
      const time = date.getTime();
      if (time < monthStart.getTime() || time > monthEnd.getTime()) continue;
      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'income') income += amount;
      else expense += amount;
    }
    return { income: roundMoney(income), expense: roundMoney(expense), balance: roundMoney(income - expense) };
  }, [monthEnd, monthStart, safeTransactions]);

  const paymentMethodData = useMemo<PaymentMethodView[]>(() => {
    const totals = new Map<string, PaymentMethodView>();
    const colors: Record<string, string> = { pix: '#00E682', debit: '#3498DB', credit: '#9B59B6', cash: '#F1C40F', transfer: '#E67E22', other: '#95A5A6' };
    for (const transaction of safeTransactions) {
      if (transaction.type !== 'expense') continue;
      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) continue;
      const time = date.getTime();
      if (time < monthStart.getTime() || time > monthEnd.getTime()) continue;
      const key = transaction.paymentMethod || 'other';
      const current = totals.get(key);
      if (current) { current.amount += Number(transaction.amount || 0); current.count += 1; }
      else totals.set(key, { name: getPaymentMethodLabel(key), amount: Number(transaction.amount || 0), count: 1, color: colors[key] || colors.other });
    }
    return Array.from(totals.values()).map((item) => ({ ...item, amount: roundMoney(item.amount) })).sort((a, b) => b.amount - a.amount);
  }, [monthEnd, monthStart, safeTransactions]);

  const projectionTimeline = useMemo<ProjectionPoint[]>(() => {
    const groups = new Map<string, { date: Date; entradas: number; saidas: number }>();
    for (let i = 0; i <= 30; i++) {
      const d = addDaysUTC(currentUTCDate, i);
      groups.set(formatISODateUTC(d), { date: d, entradas: 0, saidas: 0 });
    }
    for (const tx of safeTransactions) {
      const dt = parseDateLikeUTC(tx.transactionDate || tx.purchaseDate);
      if (!dt) continue;
      const norm = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0));
      const t = norm.getTime();
      if (t < currentUTCDate.getTime() || t > next30Days.getTime()) continue;
      const key = formatISODateUTC(norm);
      const bucket = groups.get(key);
      if (!bucket) continue;
      if (tx.type === 'income') bucket.entradas += Number(tx.amount || 0);
      else bucket.saidas += Number(tx.amount || 0);
    }
    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime()).reduce<ProjectionPoint[]>((acc, item, i) => {
      const prevBal = i === 0 ? currentBalanceBase : acc[i - 1].saldo;
      const saldo = roundMoney(prevBal + item.entradas - item.saidas);
      acc.push({ date: item.date.toISOString(), label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(item.date), saldo, entradas: roundMoney(item.entradas), saidas: roundMoney(item.saidas) });
      return acc;
    }, []);
  }, [currentBalanceBase, currentUTCDate, next30Days, safeTransactions]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const desc = form.description.trim();
    const amt = roundMoney(Number(form.amount));
    const instCount = form.isInstallment ? Math.max(2, Number(form.installments) || 2) : 1;
    if (!desc) { toast.error('Informe uma descrição.'); return; }
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('Informe um valor válido.'); return; }
    if (!form.category) { toast.error('Selecione uma categoria.'); return; }
    if (form.paymentMethod === 'credit' && !form.creditCard) { toast.error('Selecione um cartão.'); return; }
    if (form.paymentMethod !== 'credit' && !form.account) { toast.error('Selecione uma conta.'); return; }
    setIsSubmitting(true);
    try {
      let txDate = form.date;
      if (form.paymentMethod === 'credit' && form.creditCard) {
        const card = activeCreditCards.find((c) => c._id === form.creditCard);
        if (card) txDate = calculateCreditCardDueDate(form.date, Number(card.closingDay), Number(card.dueDay));
      }
      const instVal = form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment ? roundMoney(amt / instCount) : amt;
      const payload: TransactionPayload = { description: desc, type: form.type, amount: amt, transactionDate: txDate, purchaseDate: form.date, category: form.category, paymentMethod: form.paymentMethod, status: txDate <= getTodayISODateUTC() ? 'confirmed' : 'planned' };
      if (form.paymentMethod === 'credit') payload.creditCard = form.creditCard;
      else payload.account = form.account;
      if (form.paymentMethod !== 'credit' && form.isRecurring) {
        payload.isRecurring = true;
        payload.recurrenceRule = { type: form.type, category: form.category, frequency: 'monthly', startDate: txDate, value: amt };
      }
      if (form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment) {
        payload.isInstallment = true;
        payload.installmentIndex = 1;
        payload.installmentCount = instCount;
        payload.installmentPlan = { totalAmount: amt, totalInstallments: instCount, currentInstallment: 1, installmentAmount: instVal, purchaseDate: form.date };
      }
      await createAndSync(payload);
      await syncDashboardData();
      toast.success('Lançamento realizado com sucesso.');
      setIsModalOpen(false);
      setForm(createInitialForm());
    } catch {
      toast.error('Erro ao salvar o lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
      </div>
    );
  }

  const greetingText = userName ? `${greeting}, ${userName}` : greeting;

  return (
    <>
      <BackgroundDecorations />
      
      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-10 px-4 pb-32 pt-6 sm:px-6 lg:px-10"
      >
        {/* HEADER */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)] ml-1">Control Center</p>
            <h1 className="font-syne text-5xl font-black tracking-tighter text-white sm:text-6xl">{greetingText}</h1>
            <p className="text-sm font-medium text-slate-500 ml-1 flex items-center gap-2">
              <Activity size={14} className="text-[var(--monity-green)]" />
              Sua saúde financeira em tempo real.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-[3.5rem] items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.95]"
          >
            <Plus size={20} strokeWidth={3} />
            Novo Lançamento
          </button>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Saldo Consolidado" value={formatCurrency(currentBalanceBase)} subtitle="Contas Ativas" icon={Wallet} variant="green" />
          <MetricCard title="Receitas Mensais" value={formatCurrency(monthSummary.income)} subtitle="Entradas neste mês" icon={TrendingUp} />
          <MetricCard title="Despesas Mensais" value={formatCurrency(monthSummary.expense)} subtitle="Saídas neste mês" icon={TrendingDown} />
        </div>

        {/* GRID CENTRAL: GRÁFICO E TRANSAÇÕES RECENTES */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* GRÁFICO DE PROJEÇÃO */}
          <motion.div variants={itemV} className="xl:col-span-2 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 backdrop-blur-3xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <h3 className="font-syne text-2xl font-black tracking-tight text-white">Fluxo de Caixa</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Próximos 30 dias</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--monity-green)]" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Previsto</span>
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionTimeline}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--monity-green)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--monity-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }} 
                    interval={Math.floor(projectionTimeline.length / 6)}
                  />
                  <YAxis 
                    hide 
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '15px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}
                    labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}
                    formatter={(val) => [formatCurrency(getTooltipCurrencyValue(val)), 'Saldo']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="var(--monity-green)" 
                    strokeWidth={4} 
                    dot={false} 
                    activeDot={{ r: 6, stroke: 'var(--monity-green)', strokeWidth: 4, fill: '#000' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* TRANSAÇÕES RECENTES */}
          <motion.div variants={itemV} className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="font-syne text-2xl font-black tracking-tight text-white">Recentes</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Atividades do mês</p>
                </div>
              </div>
              <Link href="/dashboard/transacoes" className="rounded-xl bg-white/5 p-3 text-slate-500 hover:text-white transition-all">
                <ChevronRight size={20} />
              </Link>
            </div>

            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Activity size={24} className="text-slate-700" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Nenhuma transação recente registrada.</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx._id} className="group flex items-center gap-4 p-4 rounded-3xl border border-transparent hover:border-[var(--border)] hover:bg-white/[0.02] transition-all">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      tx.type === 'income' ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{tx.description}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-0.5">
                        {tx.category?.name || 'Sem categoria'} • {formatDate(tx.transactionDate || tx.purchaseDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${tx.type === 'income' ? 'text-[var(--monity-green)]' : 'text-white'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      {tx.status === 'planned' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Previsto</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Link href="/dashboard/transacoes" className="mt-8 flex w-full items-center justify-center py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              Ver Todas as Transações
            </Link>
          </motion.div>
        </div>

        {/* CARDS AUXILIARES: CONTAS E MÉTODOS DE PAGAMENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MINHAS CONTAS */}
          <motion.div variants={itemV} className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                    <Landmark size={24} />
                  </div>
                  <div>
                    <h3 className="font-syne text-2xl font-black tracking-tight text-white">Minhas Contas</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldos Disponíveis</p>
                  </div>
                </div>
                <Link href="/dashboard/contas" className="rounded-xl bg-white/5 p-3 text-slate-500 hover:text-white transition-all">
                  <ChevronRight size={20} />
                </Link>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {activeAccounts.slice(0, 4).map((acc) => (
                 <div key={acc._id} className="flex flex-col p-6 rounded-3xl bg-[var(--bg-base)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-all">
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{acc.bankCode || 'Conta'}</span>
                     <div className="h-2 w-2 rounded-full bg-[var(--monity-green)]" />
                   </div>
                   <h4 className="text-lg font-black text-white truncate mb-1">{acc.name}</h4>
                   <p className="text-xl font-black text-[var(--monity-green)]">{formatCurrency(getAccountBalance(acc))}</p>
                 </div>
               ))}
               {activeAccounts.length === 0 && (
                  <div className="sm:col-span-2 py-10 text-center bg-white/[0.02] rounded-3xl border border-dashed border-[var(--border)]">
                    <p className="text-xs font-bold text-slate-600">Nenhuma conta cadastrada.</p>
                  </div>
               )}
             </div>
          </motion.div>

          {/* MÉTODOS DE PAGAMENTO */}
          <motion.div variants={itemV} className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <Target size={24} />
              </div>
              <div>
                <h3 className="font-syne text-2xl font-black tracking-tight text-white">Distribuição</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gasto por Modalidade</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
               <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <RechartsPieChart>
                     <Pie
                        data={paymentMethodData}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="amount"
                     >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '1rem' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 900 }}
                     />
                   </RechartsPieChart>
                 </ResponsiveContainer>
               </div>

               <div className="space-y-4">
                 {paymentMethodData.map((item) => (
                   <div key={item.name} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.name}</span>
                     </div>
                     <span className="text-xs font-black text-white">{formatCurrency(item.amount)}</span>
                   </div>
                 ))}
                 {paymentMethodData.length === 0 && (
                    <p className="text-center text-xs font-bold text-slate-600 py-10">Aguardando lançamentos...</p>
                 )}
               </div>
            </div>
          </motion.div>
        </div>

        {/* INSIGHTS COM IA */}
        {insight && (
          <motion.div variants={itemV} className="rounded-[3rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BrainCircuit size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[2rem] bg-white text-indigo-600 shadow-2xl">
                <BrainCircuit size={40} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 justify-center md:justify-start">
                   <span className="rounded-full bg-indigo-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">IA Financial Expert</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análise de Tendência Mensal</span>
                </div>
                <h3 className="font-syne text-3xl font-black tracking-tight text-white mb-4">Análise Estratégica</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 font-medium leading-relaxed text-lg">{insight.message}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* MODAL: NOVO LANÇAMENTO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl custom-scrollbar"
              >
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Quick Entry</p>
                    <h2 className="text-3xl font-syne font-black tracking-tighter text-white">Registrar Lançamento</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="rounded-2xl bg-white/5 p-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Tipo de Transação */}
                  <div className="flex rounded-[2rem] bg-[var(--bg-base)] p-2 border border-[var(--border)] shadow-inner">
                    <button
                      type="button" onClick={() => setForm(p => ({ ...p, type: 'expense' }))}
                      className={`flex-1 rounded-[1.5rem] py-4 text-xs font-black uppercase tracking-widest transition-all ${form.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button" onClick={() => setForm(p => ({ ...p, type: 'income' }))}
                      className={`flex-1 rounded-[1.5rem] py-4 text-xs font-black uppercase tracking-widest transition-all ${form.type === 'income' ? 'bg-[var(--monity-green)] text-black shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Receita
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Descrição */}
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">O que você comprou/recebeu?</label>
                      <input
                        type="text" required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Ex: Supermercado, Aluguel..."
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                      />
                    </div>

                    {/* Valor */}
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor do Registro</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black">R$</span>
                        <input
                          type="number" step="0.01" required value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                          placeholder="0,00"
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] pl-14 pr-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                        />
                      </div>
                    </div>

                    {/* Data */}
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Data da Operação</label>
                      <input
                        type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                      />
                    </div>

                    {/* Categoria */}
                    <div className="relative group">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria</label>
                      <select
                        value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                      >
                        <option value="">Selecione...</option>
                        {categories.filter(c => c.type === form.type).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none group-focus-within:text-[var(--monity-green)]" size={18} />
                    </div>

                    {/* Forma de Pagamento */}
                    <div className="relative group">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Forma de Pagamento</label>
                      <select
                        value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                        className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                      >
                        <option value="pix">PIX</option>
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito (Cartão)</option>
                        <option value="cash">Dinheiro</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none group-focus-within:text-[var(--monity-green)]" size={18} />
                    </div>

                    {/* Condicional: Conta ou Cartão */}
                    {form.paymentMethod === 'credit' ? (
                       <div className="md:col-span-2 relative group">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Selecione o Cartão</label>
                        <select
                          value={form.creditCard} onChange={e => setForm(p => ({ ...p, creditCard: e.target.value }))}
                          className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                        >
                          <option value="">Escolha um cartão...</option>
                          {activeCreditCards.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none" size={18} />
                      </div>
                    ) : (
                      <div className="md:col-span-2 relative group">
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Selecione a Conta</label>
                        <select
                          value={form.account} onChange={e => setForm(p => ({ ...p, account: e.target.value }))}
                          className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                        >
                          <option value="">Escolha uma conta...</option>
                          {activeAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none" size={18} />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit" disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-[var(--monity-green)] py-6 text-sm font-black uppercase tracking-widest text-black shadow-[0_10px_30px_rgba(0,230,130,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : 'Finalizar Registro'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
