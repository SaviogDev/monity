'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  BrainCircuit,
  CheckCircle2,
  Plus,
  X,
  Landmark,
  CreditCard as CreditCardIcon,
  Loader2,
  Repeat,
  Split,
  ChevronRight,
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

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
  return Number((account as { balance?: number }).balance || 0);
}

function parseISODateOnlyUTC(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseDateLikeUTC(value?: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISODateOnlyUTC(value);
  }

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
  return formatISODateUTC(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  );
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
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 12, 0, 0)
  );
}

function calculateCreditCardDueDate(
  purchaseDateISO: string,
  closingDay: number,
  dueDay: number
): string {
  const purchaseDate = parseISODateOnlyUTC(purchaseDateISO);
  if (!purchaseDate) return purchaseDateISO;

  const purchaseYear = purchaseDate.getUTCFullYear();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const purchaseDay = purchaseDate.getUTCDate();

  let dueMonth = purchaseMonth;
  let dueYear = purchaseYear;

  if (purchaseDay > closingDay) {
    dueMonth += 1;
  }

  if (dueDay <= closingDay) {
    dueMonth += 1;
  }

  while (dueMonth > 11) {
    dueMonth -= 12;
    dueYear += 1;
  }

  const safeDueDay = Math.min(dueDay, getLastDayOfMonthUTC(dueYear, dueMonth));
  return formatISODateUTC(new Date(Date.UTC(dueYear, dueMonth, safeDueDay, 12, 0, 0)));
}

function getPaymentMethodLabel(method?: string | null) {
  const map: Record<string, string> = {
    pix: 'PIX',
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
    transfer: 'Transferência',
  };

  return method ? map[method] || method : 'Outro';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#2ECC71]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#9B59B6]/10 blur-[100px]" />
    </div>
  );
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
  tone: 'green' | 'red' | 'blue' | 'dark';
  icon: ReactNode;
}) {
  const styles = {
    green: {
      box: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-white shadow-xl shadow-[#2ECC71]/30 border-none',
      icon: 'bg-white/20 text-white backdrop-blur-md',
      value: 'text-white',
      label: 'text-white/85',
    },
    red: {
      box: 'bg-gradient-to-br from-[#FF3366] to-[#E74C3C] text-white shadow-xl shadow-[#FF3366]/30 border-none',
      icon: 'bg-white/20 text-white backdrop-blur-md',
      value: 'text-white',
      label: 'text-white/85',
    },
    blue: {
      box: 'bg-white/80 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50',
      icon: 'bg-[#3498DB]/10 text-[#3498DB]',
      value: 'text-[#34495E]',
      label: 'text-slate-400',
    },
    dark: {
      box: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50] text-white shadow-xl shadow-[#34495E]/30 border-none',
      icon: 'bg-white/10 text-white backdrop-blur-md',
      value: 'text-white',
      label: 'text-white/75',
    },
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:rounded-[2rem] sm:p-6 ${styles.box}`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      
      <div className="relative z-10">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon}`}>
          {icon}
        </div>
        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.24em] ${styles.label}`}>
          {title}
        </p>
        <p className={`truncate text-3xl font-black tracking-tighter sm:text-4xl ${styles.value}`}>
          {value}
        </p>
      </div>

      {subtitle ? <p className={`relative z-10 mt-4 text-xs font-bold ${styles.label}`}>{subtitle}</p> : null}
    </motion.div>
  );
}

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

  const safeTransactions = useMemo(
    () => (Array.isArray(transactions) ? (transactions as TransactionItem[]) : []),
    [transactions]
  );

  const currentUTCDate = useMemo(() => getCurrentUTCDate(), []);
  const monthStart = useMemo(() => startOfMonthUTC(currentUTCDate), [currentUTCDate]);
  const monthEnd = useMemo(() => endOfMonthUTC(currentUTCDate), [currentUTCDate]);
  const next30Days = useMemo(() => addDaysUTC(currentUTCDate, 30), [currentUTCDate]);

  const syncDashboardData = useCallback(
    async (showErrorToast = false) => {
      try {
        await loadAll();
        const accs = await fetchAccounts();
        setAccounts(accs);
      } catch {
        if (showErrorToast) {
          toast.error('Não foi possível sincronizar o dashboard.');
        }
      }
    },
    [loadAll]
  );

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

      if (user?.name) {
        setUserName(user.name.split(' ')[0]);
      }

      if (accs.length === 1) {
        setForm((prev) => ({ ...prev, account: prev.account || accs[0]._id }));
      }

      if (cards.length === 1) {
        setForm((prev) => ({ ...prev, creditCard: prev.creditCard || cards[0]._id }));
      }

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
    const handleWindowFocus = () => {
      void syncDashboardData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncDashboardData();
      }
    };

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
        const reference = currentUTCDate;
        const data = await fetchMonthlyInsight(reference.getUTCMonth() + 1, reference.getUTCFullYear());
        setInsight(data);
      } catch {
        setInsight(null);
      }
    }

    if (safeTransactions.length > 0) {
      void loadInsight();
    } else {
      setInsight(null);
    }
  }, [currentUTCDate, safeTransactions.length]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.isActive !== false),
    [accounts]
  );

  const activeCreditCards = useMemo(
    () => creditCards.filter((card) => card.isActive !== false),
    [creditCards]
  );

  const accountsTotalBalance = useMemo(
    () => activeAccounts.reduce((sum, account) => sum + getAccountBalance(account), 0),
    [activeAccounts]
  );

  const currentBalanceBase = useMemo(
    () =>
      typeof projection?.currentBalance === 'number'
        ? projection.currentBalance
        : accountsTotalBalance,
    [accountsTotalBalance, projection]
  );

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
    let income = 0;
    let expense = 0;

    for (const transaction of safeTransactions) {
      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) continue;

      const time = date.getTime();
      if (time < monthStart.getTime() || time > monthEnd.getTime()) continue;

      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }
    }

    return {
      income: roundMoney(income),
      expense: roundMoney(expense),
      balance: roundMoney(income - expense),
    };
  }, [monthEnd, monthStart, safeTransactions]);

  const paymentMethodData = useMemo<PaymentMethodView[]>(() => {
    const totals = new Map<string, PaymentMethodView>();
    const colors: Record<string, string> = {
      pix: '#2ECC71',
      debit: '#3498DB',
      credit: '#9B59B6',
      cash: '#F1C40F',
      transfer: '#34495E',
      other: '#95A5A6',
    };

    for (const transaction of safeTransactions) {
      if (transaction.type !== 'expense') continue;

      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) continue;

      const time = date.getTime();
      if (time < monthStart.getTime() || time > monthEnd.getTime()) continue;

      const key = transaction.paymentMethod || 'other';
      const current = totals.get(key);

      if (current) {
        current.amount += Number(transaction.amount || 0);
        current.count += 1;
      } else {
        totals.set(key, {
          name: getPaymentMethodLabel(key),
          amount: Number(transaction.amount || 0),
          count: 1,
          color: colors[key] || colors.other,
        });
      }
    }

    return Array.from(totals.values())
      .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthEnd, monthStart, safeTransactions]);

  const projectionTimeline = useMemo<ProjectionPoint[]>(() => {
    const groups = new Map<string, { date: Date; entradas: number; saidas: number }>();

    for (let index = 0; index <= 30; index += 1) {
      const date = addDaysUTC(currentUTCDate, index);
      groups.set(formatISODateUTC(date), { date, entradas: 0, saidas: 0 });
    }

    for (const transaction of safeTransactions) {
      const date = parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
      if (!date) continue;

      const normalized = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
      );

      const time = normalized.getTime();
      if (time < currentUTCDate.getTime() || time > next30Days.getTime()) continue;

      const key = formatISODateUTC(normalized);
      const bucket = groups.get(key);
      if (!bucket) continue;

      if (transaction.type === 'income') {
        bucket.entradas += Number(transaction.amount || 0);
      } else {
        bucket.saidas += Number(transaction.amount || 0);
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .reduce<ProjectionPoint[]>((accumulator, item, index) => {
        const previousBalance = index === 0 ? currentBalanceBase : accumulator[index - 1].saldo;
        const saldo = roundMoney(previousBalance + item.entradas - item.saidas);

        accumulator.push({
          date: item.date.toISOString(),
          label: new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
          }).format(item.date),
          saldo,
          entradas: roundMoney(item.entradas),
          saidas: roundMoney(item.saidas),
        });

        return accumulator;
      }, []);
  }, [currentBalanceBase, currentUTCDate, next30Days, safeTransactions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const description = form.description.trim();
    const numericAmount = roundMoney(Number(form.amount));
    const installmentCount = form.isInstallment ? Math.max(2, Number(form.installments) || 2) : 1;

    if (!description) {
      toast.error('Informe uma descrição.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }

    if (!form.category) {
      toast.error('Selecione uma categoria.');
      return;
    }

    if (form.paymentMethod === 'credit' && !form.creditCard) {
      toast.error('Selecione um cartão de crédito.');
      return;
    }

    if (form.paymentMethod !== 'credit' && !form.account) {
      toast.error('Selecione uma conta.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalTransactionDate = form.date;

      if (form.paymentMethod === 'credit' && form.creditCard) {
        const selectedCard = activeCreditCards.find((card) => card._id === form.creditCard);

        if (selectedCard) {
          finalTransactionDate = calculateCreditCardDueDate(
            form.date,
            Number(selectedCard.closingDay),
            Number(selectedCard.dueDay)
          );
        }
      }

      const installmentValue =
        form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment
          ? roundMoney(numericAmount / installmentCount)
          : numericAmount;

      const payload: {
        description: string;
        type: TransactionType;
        amount: number;
        transactionDate: string;
        purchaseDate: string;
        category: string;
        paymentMethod: PaymentMethod;
        status: TransactionStatus;
        account?: string;
        creditCard?: string;
        isRecurring?: boolean;
        recurrenceRule?: {
          type: TransactionType;
          category: string;
          frequency: 'monthly';
          startDate: string;
          value: number;
        };
        isInstallment?: boolean;
        installmentIndex?: number;
        installmentCount?: number;
        installmentPlan?: {
          totalAmount: number;
          totalInstallments: number;
          currentInstallment: number;
          installmentAmount: number;
          purchaseDate: string;
        };
      } = {
        description,
        type: form.type,
        amount: numericAmount,
        transactionDate: finalTransactionDate,
        purchaseDate: form.date,
        category: form.category,
        paymentMethod: form.paymentMethod,
        status: finalTransactionDate <= getTodayISODateUTC() ? 'confirmed' : 'planned',
      };

      if (form.paymentMethod === 'credit') {
        payload.creditCard = form.creditCard;
      } else {
        payload.account = form.account;
      }

      if (form.paymentMethod !== 'credit' && form.isRecurring) {
        payload.isRecurring = true;
        payload.recurrenceRule = {
          type: form.type,
          category: form.category,
          frequency: 'monthly',
          startDate: finalTransactionDate,
          value: numericAmount,
        };
      }

      if (form.type === 'expense' && form.paymentMethod === 'credit' && form.isInstallment) {
        payload.isInstallment = true;
        payload.installmentIndex = 1;
        payload.installmentCount = installmentCount;
        payload.installmentPlan = {
          totalAmount: numericAmount,
          totalInstallments: installmentCount,
          currentInstallment: 1,
          installmentAmount: installmentValue,
          purchaseDate: form.date,
        };
      }

      await createAndSync(payload);
      await syncDashboardData();

      toast.success(
        finalTransactionDate !== form.date
          ? 'Lançamento criado e competência da fatura recalculada.'
          : 'Lançamento realizado com sucesso.'
      );

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
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#2ECC71] border-t-transparent shadow-lg shadow-[#2ECC71]/20" />
      </div>
    );
  }

  const greetingText = userName ? `${greeting}, ${userName}` : greeting;

  return (
    <>
      <BackgroundBlobs />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-7xl space-y-5 px-4 pb-32 pt-6 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">
              {greetingText}
            </h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">
              Aqui está o resumo financeiro da sua operação.
            </p>
          </div>
        </div>

        <motion.div variants={containerVariants} className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          <div className="col-span-2">
            <MetricCard
              title="Saldo disponível"
              value={formatCurrency(accountsTotalBalance)}
              subtitle="Somando todas as contas ativas"
              tone="green"
              icon={<Wallet size={24} />}
            />
          </div>

          <MetricCard
            title="Entradas"
            value={formatCurrency(monthSummary.income)}
            subtitle="Mês atual"
            tone="blue"
            icon={<TrendingUp size={24} />}
          />

          <MetricCard
            title="Saídas"
            value={formatCurrency(monthSummary.expense)}
            subtitle="Mês atual"
            tone="red"
            icon={<TrendingDown size={24} />}
          />
        </motion.div>

        <AnimatePresence>
          {insight ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start gap-4 sm:items-center">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                    insight.status === 'danger'
                      ? 'bg-gradient-to-br from-rose-100 to-rose-50 text-[#FF3366] shadow-inner'
                      : 'bg-gradient-to-br from-[#2ECC71]/20 to-[#2ECC71]/5 text-[#2ECC71] shadow-inner'
                  }`}
                >
                  <BrainCircuit size={26} />
                </div>

                <div className="pt-1 sm:pt-0">
                  <h3 className="text-base font-black tracking-tight text-[#34495E]">{insight.title}</h3>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-slate-500">
                    {insight.message}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-5 lg:col-span-2 lg:space-y-6">
            <motion.div
              variants={itemVariants}
              className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
            >
              <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#34495E]">Fluxo de caixa</h3>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Próximos 30 dias
                  </p>
                </div>
                <div className="rounded-2xl bg-white/50 px-4 py-2 text-xs font-black text-slate-500 shadow-sm ring-1 ring-slate-100">
                  Base: {formatCurrency(currentBalanceBase)}
                </div>
              </div>

              <div className="h-[220px] min-w-0 sm:h-[260px]">
                {projectionTimeline.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/30 text-slate-400">
                    <p className="text-xs font-black uppercase tracking-[0.22em]">Sem dados projetados</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: 'rgba(52, 73, 94, 0.95)',
                          backdropFilter: 'blur(8px)',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="#2ECC71"
                        strokeWidth={4}
                        dot={false}
                        activeDot={{ r: 6, fill: '#2ECC71', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2rem]"
            >
              <div className="flex items-center justify-between border-b border-slate-100/50 p-5 sm:p-6 sm:px-8">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#34495E]">Transações recentes</h3>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Últimos lançamentos registrados
                  </p>
                </div>

                <Link
                  href="/dashboard/transacoes"
                  className="group flex items-center gap-1 text-xs font-black uppercase tracking-[0.22em] text-[#3498DB] transition-colors hover:text-[#2980b9]"
                >
                  Ver todas
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100/50">
                {recentTransactions.length === 0 ? (
                  <div className="p-12 text-center text-sm font-bold text-slate-400">
                    Nenhuma transação recente no momento.
                  </div>
                ) : (
                  recentTransactions.map((transaction) => {
                    const isIncome = transaction.type === 'income';
                    const destination = transaction.account?.name || transaction.creditCard?.name || 'Manual';

                    return (
                      <div
                        key={transaction._id}
                        className="flex items-center justify-between gap-4 p-4 px-5 transition-colors hover:bg-white/50 sm:p-5 sm:px-8"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                              isIncome ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-[#2ECC71]' : 'bg-gradient-to-br from-rose-50 to-rose-100 text-[#FF3366]'
                            }`}
                          >
                            {isIncome ? (
                              <TrendingUp size={22} strokeWidth={2.5} />
                            ) : (
                              <TrendingDown size={22} strokeWidth={2.5} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate text-sm font-black text-[#34495E] sm:text-base">
                              <span className="truncate">{transaction.description}</span>
                              {transaction.isInstallment ? (
                                <span className="rounded-lg bg-[#3498DB]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#3498DB]">
                                  P {transaction.installmentIndex}/{transaction.installmentCount}
                               </span>
                              ) : null}
                            </p>
                            <p className="mt-1.5 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                              {transaction.category?.name || 'Geral'} • {destination} •{' '}
                              {formatDate(transaction.transactionDate || transaction.purchaseDate)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-sm font-black tracking-tight sm:text-base ${
                              isIncome ? 'text-[#2ECC71]' : 'text-[#34495E]'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatCurrency(Number(transaction.amount || 0))}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${
                              transaction.status === 'confirmed' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {transaction.status === 'confirmed' ? 'Liquidado' : 'Planejado'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-5 lg:space-y-6">
            <motion.div
              variants={itemVariants}
              className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
            >
              <div className="mb-5">
                <h3 className="text-xl font-black tracking-tight text-[#34495E]">Contas e cartões</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Sua carteira digital
                </p>
              </div>

              <div className="space-y-3">
                {activeAccounts.slice(0, 3).map((account) => (
                  <div
                    key={account._id}
                    className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-white/50 p-4 transition-all hover:bg-white"
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-2">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3498DB]/20 to-[#3498DB]/5 text-[#3498DB]">
                        <Landmark size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#34495E]">{account.name}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Conta Bancária
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black tracking-tight text-[#34495E]">
                      {formatCurrency(getAccountBalance(account))}
                    </p>
                  </div>
                ))}

                {activeCreditCards.slice(0, 2).map((card) => (
                  <div
                    key={card._id}
                    className="relative flex items-center justify-between overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-md transition-transform hover:scale-[1.02]"
                  >
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                    <div className="relative z-10 flex min-w-0 items-center gap-3 pr-2">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm">
                        <CreditCardIcon size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{card.name}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                          Vencimento dia {card.dueDay}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {activeAccounts.length === 0 && activeCreditCards.length === 0 ? (
                  <div className="rounded-[1.25rem] border-2 border-dashed border-slate-200 bg-white/30 px-4 py-8 text-center text-sm font-bold text-slate-400">
                    Cadastre suas contas e cartões para completar o painel.
                  </div>
                ) : null}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
            >
              <h3 className="text-xl font-black tracking-tight text-[#34495E]">Despesas</h3>
              <p className="mb-6 mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Por meio de pagamento
              </p>

              <div className="flex flex-1 items-center justify-center">
                {paymentMethodData.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-bold text-slate-400">Sem despesas registradas.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={paymentMethodData}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        stroke="none"
                        cornerRadius={4}
                      >
                        {paymentMethodData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          backgroundColor: 'rgba(52, 73, 94, 0.95)',
                          backdropFilter: 'blur(8px)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {paymentMethodData.length > 0 ? (
                <div className="mt-6 space-y-2">
                  {paymentMethodData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3 shadow-sm transition-colors hover:bg-white">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-3 w-3 rounded-full shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-black text-[#34495E]">{item.name}</span>
                      </div>
                      <span className="text-xs font-black tracking-tight text-slate-500">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="fixed bottom-6 right-4 z-50 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-10">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#2ECC71] to-[#27AE60] text-white shadow-xl shadow-[#2ECC71]/40 transition-all hover:scale-110 active:scale-95 sm:h-16 sm:w-16"
          aria-label="Adicionar lançamento"
        >
          <Plus size={30} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
              aria-label="Fechar modal"
            />

            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">
                    Lançamento rápido
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-[#34495E]">Novo registro</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Fechar"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex rounded-[1.25rem] bg-slate-100/80 p-1.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        type: 'expense',
                      }))
                    }
                    className={`flex-1 rounded-xl py-3 text-xs font-black transition-all ${
                      form.type === 'expense' ? 'bg-white text-[#FF3366] shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        type: 'income',
                        isInstallment: false,
                        installments: '2',
                      }))
                    }
                    className={`flex-1 rounded-xl py-3 text-xs font-black transition-all ${
                      form.type === 'income' ? 'bg-white text-[#2ECC71] shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Receita
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    placeholder="O que foi?"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                  />

                  <div className="relative">
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={form.amount}
                      onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                      className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 pl-14 text-3xl font-black tracking-tighter text-[#34495E] outline-none transition-all placeholder:text-slate-300 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      required
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                    >
                      <option value="">Categoria</option>
                      {categories
                        .filter((category) => category.type === form.type)
                        .map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                    </select>

                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Forma de pagamento
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'pix', label: 'PIX' },
                      { value: 'debit', label: 'Débito' },
                      { value: 'credit', label: 'Crédito' },
                    ] as const).map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            paymentMethod: method.value,
                            account: method.value === 'credit' ? '' : prev.account,
                            creditCard: method.value === 'credit' ? prev.creditCard : '',
                            isRecurring: method.value === 'credit' ? false : prev.isRecurring,
                            isInstallment: method.value === 'credit' ? prev.isInstallment : false,
                            installments: method.value === 'credit' ? prev.installments : '2',
                          }))
                        }
                        className={`rounded-xl py-3 text-[11px] font-black uppercase tracking-wide transition-all ${
                          form.paymentMethod === method.value
                            ? 'bg-[#34495E] text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>

                  {form.paymentMethod === 'credit' ? (
                    <div className="space-y-3 pt-2">
                      <select
                        required
                        value={form.creditCard}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, creditCard: event.target.value }))
                        }
                        className="w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                      >
                        <option value="">Selecione o Cartão</option>
                        {activeCreditCards.map((card) => (
                          <option key={card._id} value={card._id}>
                            {card.name}
                          </option>
                        ))}
                      </select>

                      {form.type === 'expense' ? (
                        <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                                <Split size={16} className="text-[#3498DB]" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#34495E]">
                                Parcelar compra
                              </span>
                            </div>

                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={form.isInstallment}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    isInstallment: event.target.checked,
                                    installments: event.target.checked ? prev.installments || '2' : '2',
                                  }))
                                }
                                className="h-5 w-5 accent-[#3498DB]"
                              />
                            </label>
                          </div>

                          {form.isInstallment ? (
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-slate-100">
                              <span className="text-xs font-bold text-slate-500">Qtd. de Parcelas</span>
                              <input
                                type="number"
                                min="2"
                                step="1"
                                value={form.installments}
                                onChange={(event) =>
                                  setForm((prev) => ({ ...prev, installments: event.target.value }))
                                }
                                className="w-20 rounded-lg border-2 border-slate-100 bg-slate-50 px-3 py-2 text-center text-sm font-black text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <select
                        required
                        value={form.account}
                        onChange={(event) => setForm((prev) => ({ ...prev, account: event.target.value }))}
                        className="w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
                      >
                        <option value="">Selecione a Conta</option>
                        {activeAccounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.name}
                          </option>
                        ))}
                      </select>

                      <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                              <Repeat size={16} className="text-[#2ECC71]" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#34495E]">
                              Recorrente mensal
                            </span>
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.isRecurring}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, isRecurring: event.target.checked }))
                              }
                              className="h-5 w-5 accent-[#2ECC71]"
                            />
                          </label>
                        </div>

                        <p className="mt-3 text-xs font-bold leading-relaxed text-slate-400">
                          Útil para salários, assinaturas, aluguel e contas fixas do mês.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#2ECC71] to-[#27AE60] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#2ECC71]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#2ECC71]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
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
                      <span className="relative z-10">Confirmar lançamento</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}