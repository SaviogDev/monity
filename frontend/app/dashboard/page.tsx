'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialStore } from '@/stores/financial-store';
import {
  ArrowUpDown,
  CreditCard,
  Landmark,
  LayoutDashboard,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  PiggyBank,
  CalendarDays,
  Repeat,
  Receipt,
  Activity,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';

interface CategoryView {
  name: string;
  amount: number;
  count: number;
  color: string;
}

interface PaymentMethodView {
  name: string;
  amount: number;
  count: number;
  color: string;
}

interface UpcomingTransactionView {
  _id: string;
  label: string;
  amount: number;
  type: 'income' | 'expense';
  transactionDate?: string | null;
  categoryName?: string;
  paymentMethod?: string | null;
  isRecurring?: boolean;
  isInstallment?: boolean;
  isSimulated?: boolean;
}

interface ProjectionPoint {
  date: string;
  label: string;
  saldo: number;
  entradas: number;
  saidas: number;
}

interface SimulatedTransaction {
  _id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transactionDate: string;
  paymentMethod?: string | null;
  isRecurring?: boolean;
  isInstallment?: boolean;
  isSimulated: true;
  category?: {
    name?: string;
    color?: string;
  };
}

interface SimulationState {
  enabled: boolean;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  paymentMethod: 'pix' | 'debit' | 'credit' | 'cash' | 'transfer';
  isInstallment: boolean;
  installments: number;
  description: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatShortDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatFullDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPaymentMethodLabel(method?: string | null) {
  const map: Record<string, string> = {
    pix: 'PIX',
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
    transfer: 'Transferência',
  };

  return method ? map[method] || method : '-';
}

function getAccountTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    checking: 'Conta corrente',
    wallet: 'Carteira',
    cash: 'Dinheiro',
    savings: 'Poupança',
  };

  return type ? map[type] || type : '-';
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(baseDate: Date, months: number) {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getMonthKey(dateString?: string | null) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
  tone: 'green' | 'red' | 'blue' | 'dark' | 'purple' | 'amber' | 'teal';
  icon: ReactNode;
}) {
  const styles = {
    green: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60]',
      value: 'text-[#2ECC71]',
      label: 'text-slate-500',
    },
    red: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#E74C3C] to-[#C0392B]',
      value: 'text-[#E74C3C]',
      label: 'text-slate-500',
    },
    blue: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#3498DB] to-[#2980B9]',
      value: 'text-[#3498DB]',
      label: 'text-slate-500',
    },
    purple: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]',
      value: 'text-[#9B59B6]',
      label: 'text-slate-500',
    },
    amber: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#F39C12] to-[#D68910]',
      value: 'text-[#F39C12]',
      label: 'text-slate-500',
    },
    teal: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#1ABC9C] to-[#16A085]',
      value: 'text-[#16A085]',
      label: 'text-slate-500',
    },
    dark: {
      box: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50]',
      icon: 'bg-white/20',
      value: 'text-white',
      label: 'text-white/70',
    },
  }[tone];

  return (
    <div className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${styles.box}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>

      <p className={`text-sm font-medium mb-1 ${styles.label}`}>{title}</p>
      <p className={`text-2xl md:text-3xl font-bold ${styles.value}`}>{value}</p>
      {subtitle ? <p className={`text-xs mt-2 ${styles.label}`}>{subtitle}</p> : null}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  gradient,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center`}>
        <div className="text-white">{icon}</div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const {
    transactions = [],
    accounts = [],
    summary,
    projection,
    alerts = [],
    loading,
    error,
    loadAll,
  } = useFinancialStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(now), [now]);
  const next30Days = useMemo(() => endOfDay(addDays(now, 30)), [now]);

  const [simulation, setSimulation] = useState<SimulationState>({
    enabled: false,
    type: 'expense',
    amount: 0,
    date: formatDateInput(new Date()),
    paymentMethod: 'cash',
    isInstallment: false,
    installments: 2,
    description: '',
  });

  const simulatedTransactions = useMemo<SimulatedTransaction[]>(() => {
    if (!simulation.enabled) return [];

    const amount = Number(simulation.amount || 0);
    const rawInstallments = Number(simulation.installments || 1);
    const installments = Math.max(1, Math.floor(rawInstallments));
    const description =
      simulation.description.trim() ||
      (simulation.type === 'income' ? 'Receita simulada' : 'Despesa simulada');

    const baseDate = new Date(`${simulation.date}T12:00:00`);
    if (Number.isNaN(baseDate.getTime()) || amount <= 0) return [];

    if (simulation.type === 'income') {
      return [
        {
          _id: 'sim-income-0',
          description,
          amount,
          type: 'income',
          transactionDate: baseDate.toISOString(),
          paymentMethod: 'transfer',
          isSimulated: true,
          category: {
            name: 'Simulação',
            color: '#3498DB',
          },
        },
      ];
    }

    if (!simulation.isInstallment || simulation.paymentMethod !== 'credit') {
      return [
        {
          _id: 'sim-expense-0',
          description,
          amount,
          type: 'expense',
          transactionDate: baseDate.toISOString(),
          paymentMethod: simulation.paymentMethod,
          isSimulated: true,
          category: {
            name: 'Simulação',
            color: '#9B59B6',
          },
        },
      ];
    }

    const cents = Math.round(amount * 100);
    const baseInstallmentCents = Math.floor(cents / installments);
    const remainderCents = cents - baseInstallmentCents * installments;

    return Array.from({ length: installments }).map((_, index) => {
      const installmentDate = addMonths(baseDate, index);
      const installmentCents =
        index === installments - 1
          ? baseInstallmentCents + remainderCents
          : baseInstallmentCents;

      return {
        _id: `sim-installment-${index}`,
        description: `${description} (${index + 1}/${installments})`,
        amount: installmentCents / 100,
        type: 'expense' as const,
        transactionDate: installmentDate.toISOString(),
        paymentMethod: 'credit',
        isInstallment: true,
        isSimulated: true,
        category: {
          name: 'Simulação',
          color: '#9B59B6',
        },
      };
    });
  }, [simulation]);

  const timelineTransactions = useMemo(() => {
    return [...transactions, ...simulatedTransactions];
  }, [transactions, simulatedTransactions]);

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive !== false);
  }, [accounts]);

  const accountsTotalBalance = useMemo(() => {
    return activeAccounts.reduce((acc, account) => {
      return acc + Number(account.currentBalance || 0);
    }, 0);
  }, [activeAccounts]);

  const currentBalanceBase = useMemo(() => {
    if (typeof projection?.currentBalance === 'number') return projection.currentBalance;
    return accountsTotalBalance;
  }, [projection, accountsTotalBalance]);

  const futureBalanceBase = useMemo(() => {
    if (typeof projection?.futureBalance === 'number') return projection.futureBalance;
    return currentBalanceBase;
  }, [projection, currentBalanceBase]);

  const sortedTransactions = useMemo(() => {
    return [...timelineTransactions].sort((a, b) => {
      const aDate = new Date(a.transactionDate).getTime();
      const bDate = new Date(b.transactionDate).getTime();
      return bDate - aDate;
    });
  }, [timelineTransactions]);

  const recentTransactions = useMemo(() => {
    return sortedTransactions.slice(0, 5);
  }, [sortedTransactions]);

  const monthSummary = useMemo(() => {
    const start = startOfCurrentMonth().getTime();
    const end = endOfCurrentMonth().getTime();

    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const transaction of timelineTransactions) {
      const date = new Date(transaction.transactionDate).getTime();

      if (Number.isNaN(date) || date < start || date > end) continue;

      if (transaction.type === 'income') {
        income += Number(transaction.amount || 0);
        incomeCount += 1;
      } else {
        expense += Number(transaction.amount || 0);
        expenseCount += 1;
      }
    }

    return {
      income,
      expense,
      incomeCount,
      expenseCount,
      balance: income - expense,
    };
  }, [timelineTransactions]);

  const chartData = useMemo(() => {
    const referenceDate = new Date();
    const months: { key: string; label: string; receitas: number; despesas: number }[] = [];

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date);

      months.push({
        key,
        label,
        receitas: 0,
        despesas: 0,
      });
    }

    const monthMap = new Map(months.map((item) => [item.key, item]));

    for (const transaction of timelineTransactions) {
      const key = getMonthKey(transaction.transactionDate);
      if (!key) continue;

      const current = monthMap.get(key);
      if (!current) continue;

      if (transaction.type === 'income') {
        current.receitas += Number(transaction.amount || 0);
      } else {
        current.despesas += Number(transaction.amount || 0);
      }
    }

    return months.map((item) => ({
      month: item.label.replace('.', ''),
      receitas: item.receitas,
      despesas: item.despesas,
    }));
  }, [timelineTransactions]);

  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, CategoryView>();

    for (const transaction of timelineTransactions) {
      if (transaction.type !== 'expense') continue;

      const categoryName = transaction.category?.name || 'Sem categoria';
      const existing = map.get(categoryName);

      if (existing) {
        existing.amount += Number(transaction.amount || 0);
        existing.count += 1;
      } else {
        map.set(categoryName, {
          name: categoryName,
          amount: Number(transaction.amount || 0),
          count: 1,
          color: transaction.category?.color || '#3498DB',
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [timelineTransactions]);

  const paymentMethodData = useMemo(() => {
    const map = new Map<string, PaymentMethodView>();

    for (const transaction of timelineTransactions) {
      if (transaction.type !== 'expense') continue;

      const key = transaction.paymentMethod || 'other';
      const label = getPaymentMethodLabel(key);
      const existing = map.get(key);

      const colorMap: Record<string, string> = {
        pix: '#3498DB',
        debit: '#2ECC71',
        credit: '#9B59B6',
        cash: '#F39C12',
        transfer: '#34495E',
        other: '#95A5A6',
      };

      if (existing) {
        existing.amount += Number(transaction.amount || 0);
        existing.count += 1;
      } else {
        map.set(key, {
          name: label,
          amount: Number(transaction.amount || 0),
          count: 1,
          color: colorMap[key] || '#95A5A6',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [timelineTransactions]);

  const maxCategoryAmount = useMemo(() => {
    if (topExpenseCategories.length === 0) return 1;
    return Math.max(...topExpenseCategories.map((category) => category.amount), 1);
  }, [topExpenseCategories]);

  const currentMonthExpenseRatio = useMemo(() => {
    if (monthSummary.income <= 0) return monthSummary.expense > 0 ? 100 : 0;
    return Math.min((monthSummary.expense / monthSummary.income) * 100, 999);
  }, [monthSummary]);

  const currentMonthTransactionCount = useMemo(() => {
    const start = startOfCurrentMonth().getTime();
    const end = endOfCurrentMonth().getTime();

    return timelineTransactions.filter((transaction) => {
      const date = new Date(transaction.transactionDate).getTime();
      return !Number.isNaN(date) && date >= start && date <= end;
    }).length;
  }, [timelineTransactions]);

  const mostCommittedCard = useMemo(() => {
    if (!projection?.cards?.length) return null;
    return [...projection.cards].sort((a, b) => b.committed - a.committed)[0] || null;
  }, [projection]);

  const largestAccount = useMemo(() => {
    if (!activeAccounts.length) return null;
    return [...activeAccounts].sort(
      (a, b) => Number(b.currentBalance || 0) - Number(a.currentBalance || 0)
    )[0];
  }, [activeAccounts]);

  const upcomingTransactions = useMemo<UpcomingTransactionView[]>(() => {
    return [...timelineTransactions]
      .filter((transaction) => {
        const time = new Date(transaction.transactionDate).getTime();
        return !Number.isNaN(time) && time >= todayStart.getTime() && time <= next30Days.getTime();
      })
      .sort((a, b) => {
        const aTime = new Date(a.transactionDate).getTime();
        const bTime = new Date(b.transactionDate).getTime();
        return aTime - bTime;
      })
      .slice(0, 8)
      .map((transaction) => ({
        _id: transaction._id,
        label: transaction.description || transaction.category?.name || 'Transação programada',
        amount: Number(transaction.amount || 0),
        type: transaction.type,
        transactionDate: transaction.transactionDate,
        categoryName: transaction.category?.name,
        paymentMethod: transaction.paymentMethod,
        isRecurring: Boolean(transaction.isRecurring),
        isInstallment: Boolean(transaction.isInstallment),
        isSimulated: Boolean((transaction as SimulatedTransaction).isSimulated),
      }));
  }, [timelineTransactions, todayStart, next30Days]);

  const next30DaysSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let recurring = 0;
    let installments = 0;

    for (const transaction of timelineTransactions) {
      const time = new Date(transaction.transactionDate).getTime();

      if (Number.isNaN(time) || time < todayStart.getTime() || time > next30Days.getTime()) {
        continue;
      }

      const amount = Number(transaction.amount || 0);

      if (transaction.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }

      if (transaction.isRecurring) recurring += amount;
      if (transaction.isInstallment) installments += amount;
    }

    return {
      income,
      expense,
      balance: income - expense,
      recurring,
      installments,
    };
  }, [timelineTransactions, todayStart, next30Days]);

  const recurringAndInstallmentStats = useMemo(() => {
    let recurringCount = 0;
    let recurringAmount = 0;
    let installmentCount = 0;
    let installmentAmount = 0;

    for (const transaction of timelineTransactions) {
      const amount = Number(transaction.amount || 0);

      if (transaction.isRecurring) {
        recurringCount += 1;
        recurringAmount += amount;
      }

      if (transaction.isInstallment) {
        installmentCount += 1;
        installmentAmount += amount;
      }
    }

    return {
      recurringCount,
      recurringAmount,
      installmentCount,
      installmentAmount,
    };
  }, [timelineTransactions]);

  const projectionTimeline = useMemo<ProjectionPoint[]>(() => {
    const groups = new Map<string, { entradas: number; saidas: number; date: Date }>();

    for (let i = 0; i <= 30; i += 1) {
      const date = startOfDay(addDays(now, i));
      const key = date.toISOString().slice(0, 10);

      groups.set(key, {
        date,
        entradas: 0,
        saidas: 0,
      });
    }

    for (const transaction of timelineTransactions) {
      const date = new Date(transaction.transactionDate);
      const time = date.getTime();

      if (Number.isNaN(time)) continue;
      if (time < todayStart.getTime() || time > next30Days.getTime()) continue;

      const normalized = startOfDay(date);
      const key = normalized.toISOString().slice(0, 10);
      const current = groups.get(key);

      if (!current) continue;

      if (transaction.type === 'income') {
        current.entradas += Number(transaction.amount || 0);
      } else {
        current.saidas += Number(transaction.amount || 0);
      }
    }

    const sortedItems = Array.from(groups.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return sortedItems.reduce<ProjectionPoint[]>((acc, item, index) => {
      const previousBalance = index === 0 ? currentBalanceBase : acc[index - 1].saldo;
      const currentBalance = previousBalance + item.entradas - item.saidas;

      acc.push({
        date: item.date.toISOString(),
        label: new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }).format(item.date),
        saldo: currentBalance,
        entradas: item.entradas,
        saidas: item.saidas,
      });

      return acc;
    }, []);
  }, [timelineTransactions, now, todayStart, next30Days, currentBalanceBase]);

  const worstProjectionPoint = useMemo(() => {
    if (!projectionTimeline.length) return null;

    return projectionTimeline.reduce((worst, point) => {
      if (!worst) return point;
      return point.saldo < worst.saldo ? point : worst;
    }, projectionTimeline[0] as ProjectionPoint | null);
  }, [projectionTimeline]);

  const projectionSummary = useMemo(() => {
    const finalPoint = projectionTimeline[projectionTimeline.length - 1] || null;
    const lowestPoint = worstProjectionPoint;

    return {
      finalBalance: finalPoint?.saldo ?? futureBalanceBase,
      lowestBalance: lowestPoint?.saldo ?? futureBalanceBase,
      lowestDate: lowestPoint?.date ?? null,
    };
  }, [projectionTimeline, worstProjectionPoint, futureBalanceBase]);

  const simulationImpact = useMemo(() => {
    const totalImpact = simulatedTransactions.reduce((acc, transaction) => {
      return acc + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
    }, 0);

    const impact30Days = simulatedTransactions.reduce((acc, transaction) => {
      const time = new Date(transaction.transactionDate).getTime();
      if (Number.isNaN(time) || time < todayStart.getTime() || time > next30Days.getTime()) {
        return acc;
      }

      return acc + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
    }, 0);

    const count30Days = simulatedTransactions.filter((transaction) => {
      const time = new Date(transaction.transactionDate).getTime();
      return !Number.isNaN(time) && time >= todayStart.getTime() && time <= next30Days.getTime();
    }).length;

    return {
      totalImpact,
      impact30Days,
      totalCount: simulatedTransactions.length,
      count30Days,
    };
  }, [simulatedTransactions, todayStart, next30Days]);

  const financialDiagnosis = useMemo(() => {
    const drop = projectionSummary.finalBalance - currentBalanceBase;

    if (projectionSummary.lowestBalance < 0) {
      return {
        tone: 'red' as const,
        title: simulation.enabled ? 'Simulação crítica' : 'Atenção imediata',
        message: `Seu caixa pode ficar negativo em ${formatCurrency(
          projectionSummary.lowestBalance
        )}.`,
        helper: projectionSummary.lowestDate
          ? `O pior ponto projetado acontece em ${formatFullDate(projectionSummary.lowestDate)}.`
          : 'O foco agora é reduzir pressão de saída ou postergar compromissos.',
      };
    }

    if (drop < 0) {
      return {
        tone: 'amber' as const,
        title: simulation.enabled ? 'Simulação pressionando o fluxo' : 'Fluxo em queda',
        message: `Seu saldo projetado cai ${formatCurrency(Math.abs(drop))} nos próximos 30 dias.`,
        helper: simulation.enabled
          ? 'A simulação ainda fecha positiva, mas reduz sua folga financeira.'
          : 'Você ainda fecha positivo, mas com menos folga financeira.',
      };
    }

    return {
      tone: 'green' as const,
      title: simulation.enabled ? 'Simulação controlada' : 'Fluxo saudável',
      message: `Se continuar assim, você termina a janela com ${formatCurrency(
        projectionSummary.finalBalance
      )}.`,
      helper: simulation.enabled
        ? 'A simulação não gera ruptura imediata no caixa projetado.'
        : 'Agora o dashboard já responde presente, futuro e ponto de maior pressão.',
    };
  }, [projectionSummary, currentBalanceBase, simulation.enabled]);

  const diagnosisStyles = {
    red: {
      box: 'bg-red-50 border-red-200',
      title: 'text-red-700',
      message: 'text-red-900',
      helper: 'text-red-700/80',
      icon: 'text-red-500',
    },
    amber: {
      box: 'bg-amber-50 border-amber-200',
      title: 'text-amber-700',
      message: 'text-amber-900',
      helper: 'text-amber-700/80',
      icon: 'text-amber-500',
    },
    green: {
      box: 'bg-green-50 border-green-200',
      title: 'text-green-700',
      message: 'text-green-900',
      helper: 'text-green-700/80',
      icon: 'text-green-500',
    },
  }[financialDiagnosis.tone];

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar</h3>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      <div className={`rounded-2xl border p-6 shadow-lg ${diagnosisStyles.box}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-sm font-semibold mb-1 ${diagnosisStyles.title}`}>
              {financialDiagnosis.title}
            </p>
            <h2 className={`text-2xl lg:text-3xl font-bold ${diagnosisStyles.message}`}>
              {financialDiagnosis.message}
            </h2>
            <p className={`text-sm mt-2 ${diagnosisStyles.helper}`}>
              {financialDiagnosis.helper}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/70 p-4 border border-white/60 min-w-[160px]">
              <p className="text-xs text-slate-500 mb-1">Saldo atual</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(currentBalanceBase)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 border border-white/60 min-w-[160px]">
              <p className="text-xs text-slate-500 mb-1">Saldo projetado</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(projectionSummary.finalBalance)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 border border-white/60 min-w-[160px]">
              <p className="text-xs text-slate-500 mb-1">Pior ponto</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(projectionSummary.lowestBalance)}
              </p>
            </div>

            <AlertTriangle className={`hidden lg:block ${diagnosisStyles.icon}`} size={28} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <SectionHeader
          icon={<FlaskConical size={20} />}
          title="Simulação de decisão"
          subtitle="Teste uma compra, entrada ou parcelamento sem gravar nada no banco"
          gradient="bg-gradient-to-br from-[#34495E] to-[#2C3E50]"
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Ativar simulação</p>
                <p className="text-xs text-slate-500 mt-1">
                  Quando ligada, todo o dashboard passa a usar a timeline combinada.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSimulation((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  simulation.enabled ? 'bg-[#16A085]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    simulation.enabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Descrição</label>
                <input
                  type="text"
                  value={simulation.description}
                  onChange={(e) =>
                    setSimulation((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Ex.: iPhone, entrada extra, viagem..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Tipo</label>
                <select
                  value={simulation.type}
                  onChange={(e) =>
                    setSimulation((prev) => ({
                      ...prev,
                      type: e.target.value as 'income' | 'expense',
                      paymentMethod:
                        e.target.value === 'income' ? 'transfer' : prev.paymentMethod,
                      isInstallment: e.target.value === 'income' ? false : prev.isInstallment,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB] bg-white"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Valor</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={simulation.amount || ''}
                  onChange={(e) =>
                    setSimulation((prev) => ({
                      ...prev,
                      amount: Number(e.target.value || 0),
                    }))
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Data</label>
                <input
                  type="date"
                  value={simulation.date}
                  onChange={(e) =>
                    setSimulation((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Forma de pagamento
                </label>
                <select
                  value={simulation.type === 'income' ? 'transfer' : simulation.paymentMethod}
                  onChange={(e) =>
                    setSimulation((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value as SimulationState['paymentMethod'],
                    }))
                  }
                  disabled={simulation.type === 'income'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB] bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="pix">PIX</option>
                  <option value="debit">Débito</option>
                  <option value="credit">Crédito</option>
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Parcelado?</label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <input
                    id="simulation-installment"
                    type="checkbox"
                    checked={
                      simulation.type === 'expense' &&
                      simulation.paymentMethod === 'credit' &&
                      simulation.isInstallment
                    }
                    onChange={(e) =>
                      setSimulation((prev) => ({
                        ...prev,
                        isInstallment: e.target.checked,
                      }))
                    }
                    disabled={simulation.type === 'income' || simulation.paymentMethod !== 'credit'}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="simulation-installment" className="text-sm text-slate-600">
                    Gerar parcelas mensais no crédito
                  </label>
                </div>
              </div>

              {simulation.type === 'expense' &&
                simulation.paymentMethod === 'credit' &&
                simulation.isInstallment && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Quantidade de parcelas
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="48"
                      step="1"
                      value={simulation.installments}
                      onChange={(e) =>
                        setSimulation((prev) => ({
                          ...prev,
                          installments: Math.max(2, Number(e.target.value || 2)),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#3498DB]"
                    />
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-[#9B59B6]" />
                <p className="text-sm font-semibold text-slate-800">Impacto da simulação</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Impacto total</p>
                  <p
                    className={`text-xl font-bold ${
                      simulationImpact.totalImpact >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                    }`}
                  >
                    {simulationImpact.totalImpact >= 0 ? '+' : ''}
                    {formatCurrency(simulationImpact.totalImpact)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Impacto em 30 dias</p>
                  <p
                    className={`text-xl font-bold ${
                      simulationImpact.impact30Days >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                    }`}
                  >
                    {simulationImpact.impact30Days >= 0 ? '+' : ''}
                    {formatCurrency(simulationImpact.impact30Days)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">Lançamentos</p>
                    <p className="font-bold text-slate-900">{simulationImpact.totalCount}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">Na janela</p>
                    <p className="font-bold text-slate-900">{simulationImpact.count30Days}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500 mb-1">Leitura</p>
                  <p className="text-sm text-slate-600">
                    {!simulation.enabled
                      ? 'Ative a simulação para testar cenários no dashboard.'
                      : simulationImpact.totalCount === 0
                      ? 'Preencha valor e data válidos para gerar o cenário.'
                      : projectionSummary.lowestBalance < 0
                      ? 'Essa decisão empurra o caixa para terreno negativo.'
                      : simulationImpact.impact30Days < 0
                      ? 'A decisão pressiona sua folga na janela imediata.'
                      : 'A decisão cabe no fluxo atual sem ruptura na janela.'}
                  </p>
                </div>
              </div>
            </div>

            {simulatedTransactions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-800 mb-3">Prévia gerada</p>
                <div className="space-y-3 max-h-[260px] overflow-auto pr-1">
                  {simulatedTransactions.map((transaction) => (
                    <div key={transaction._id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatFullDate(transaction.transactionDate)} •{' '}
                            {getPaymentMethodLabel(transaction.paymentMethod)}
                          </p>
                        </div>

                        <p
                          className={`text-sm font-bold ${
                            transaction.type === 'income' ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}{' '}
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Saldo operacional"
          value={formatCurrency(accountsTotalBalance)}
          subtitle={
            activeAccounts.length > 0
              ? 'Baseado no saldo real das contas ativas'
              : 'Cadastre contas para consolidar o caixa'
          }
          tone={accountsTotalBalance >= 0 ? 'teal' : 'dark'}
          icon={<Wallet size={24} />}
        />

        <MetricCard
          title="Entradas do mês"
          value={formatCurrency(monthSummary.income)}
          subtitle={`${monthSummary.incomeCount} lançamento(s)`}
          tone="green"
          icon={<TrendingUp size={24} />}
        />

        <MetricCard
          title="Saídas do mês"
          value={formatCurrency(monthSummary.expense)}
          subtitle={`${monthSummary.expenseCount} lançamento(s)`}
          tone="red"
          icon={<TrendingDown size={24} />}
        />

        <MetricCard
          title="Resultado do mês"
          value={formatCurrency(monthSummary.balance)}
          subtitle={`${currentMonthTransactionCount} transação(ões) neste mês`}
          tone="dark"
          icon={<LayoutDashboard size={24} />}
        />
      </div>

      {projection && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Saldo atual"
            value={formatCurrency(projection.currentBalance)}
            subtitle="Apenas movimentos confirmados"
            tone="green"
            icon={<Wallet size={24} />}
          />

          <MetricCard
            title="Saldo projetado"
            value={formatCurrency(projectionSummary.finalBalance)}
            subtitle={
              simulation.enabled ? 'Recalculado com a simulação ativa' : 'Inclui movimentos planejados'
            }
            tone="purple"
            icon={<TrendingUp size={24} />}
          />

          <MetricCard
            title="Cartões monitorados"
            value={String(projection.cards.length)}
            subtitle="Cartões ativos com projeção"
            tone="blue"
            icon={<CreditCard size={24} />}
          />

          <MetricCard
            title="Maior pressão"
            value={
              worstProjectionPoint
                ? formatCurrency(worstProjectionPoint.saldo)
                : mostCommittedCard
                ? formatCurrency(mostCommittedCard.committed)
                : formatCurrency(0)
            }
            subtitle={
              worstProjectionPoint
                ? `Ponto crítico do fluxo`
                : mostCommittedCard
                ? `${mostCommittedCard.name} comprometido`
                : 'Nenhum cartão comprometido'
            }
            tone="amber"
            icon={<AlertTriangle size={24} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<CalendarDays size={20} />}
            title="Próximos 30 dias"
            subtitle="A leitura central do produto: o que vem pela frente"
            gradient="bg-gradient-to-br from-[#3498DB] to-[#2980B9]"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Entradas previstas</p>
              <p className="text-xl font-bold text-[#2ECC71]">
                {formatCurrency(next30DaysSummary.income)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Saídas previstas</p>
              <p className="text-xl font-bold text-[#E74C3C]">
                {formatCurrency(next30DaysSummary.expense)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Resultado da janela</p>
              <p
                className={`text-xl font-bold ${
                  next30DaysSummary.balance >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                }`}
              >
                {formatCurrency(next30DaysSummary.balance)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            O dashboard agora já lê presente, janela futura e ponto de maior aperto. Isso muda o
            produto de informativo para decisório.
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<Repeat size={20} />}
            title="Compromissos monitorados"
            subtitle="Peso estrutural do seu fluxo"
            gradient="bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]"
          />

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Recorrentes detectados</p>
              <p className="text-xl font-bold text-slate-900">
                {recurringAndInstallmentStats.recurringCount}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(recurringAndInstallmentStats.recurringAmount)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Parcelados detectados</p>
              <p className="text-xl font-bold text-slate-900">
                {recurringAndInstallmentStats.installmentCount}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(recurringAndInstallmentStats.installmentAmount)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Recorrência na janela</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(next30DaysSummary.recurring)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Parcelas na janela</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(next30DaysSummary.installments)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <SectionHeader
          icon={<Activity size={20} />}
          title="Saldo futuro"
          subtitle="Linha do tempo do caixa projetado nos próximos 30 dias"
          gradient="bg-gradient-to-br from-[#1ABC9C] to-[#16A085]"
        />

        {projectionTimeline.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400">
            Ainda não há dados suficientes para projeção
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">Saldo inicial</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(currentBalanceBase)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">Saldo final projetado</p>
                <p
                  className={`text-xl font-bold ${
                    projectionSummary.finalBalance >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                  }`}
                >
                  {formatCurrency(projectionSummary.finalBalance)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">Menor saldo da janela</p>
                <p
                  className={`text-xl font-bold ${
                    projectionSummary.lowestBalance >= 0 ? 'text-slate-900' : 'text-[#E74C3C]'
                  }`}
                >
                  {formatCurrency(projectionSummary.lowestBalance)}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {projectionSummary.lowestDate
                    ? `em ${formatFullDate(projectionSummary.lowestDate)}`
                    : 'sem data crítica'}
                </p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={projectionTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'saldo') return [formatCurrency(Number(value)), 'Saldo'];
                    if (name === 'entradas') return [formatCurrency(Number(value)), 'Entradas'];
                    if (name === 'saidas') return [formatCurrency(Number(value)), 'Saídas'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#1ABC9C"
                  strokeWidth={3}
                  dot={false}
                  name="saldo"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {upcomingTransactions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<Receipt size={20} />}
            title="Próximos movimentos"
            subtitle="Os eventos que mais importam agora"
            gradient="bg-gradient-to-br from-[#16A085] to-[#117864]"
          />

          <div className="space-y-3">
            {upcomingTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      transaction.type === 'income'
                        ? 'bg-green-100 text-[#2ECC71]'
                        : 'bg-red-100 text-[#E74C3C]'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">{transaction.label}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-sm text-slate-500">
                        {transaction.categoryName || 'Sem categoria'} •{' '}
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </p>

                      {transaction.isRecurring && (
                        <span className="rounded-full bg-blue-50 text-blue-700 text-xs px-2 py-1 border border-blue-200">
                          Recorrente
                        </span>
                      )}

                      {transaction.isInstallment && (
                        <span className="rounded-full bg-purple-50 text-purple-700 text-xs px-2 py-1 border border-purple-200">
                          Parcelada
                        </span>
                      )}

                      {transaction.isSimulated && (
                        <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-1 border border-slate-800">
                          Simulada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold text-lg ${
                      transaction.type === 'income' ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatFullDate(transaction.transactionDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAccounts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<PiggyBank size={20} />}
            title="Distribuição do dinheiro"
            subtitle="Onde o saldo real está alocado hoje nas contas ativas"
            gradient="bg-gradient-to-br from-[#1ABC9C] to-[#16A085]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeAccounts.map((account) => (
              <div
                key={account._id}
                className="rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{account.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {getAccountTypeLabel(account.type)}
                    </p>
                  </div>

                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: account.color || '#1ABC9C' }}
                  />
                </div>

                <p className="text-xl font-bold text-[#16A085]">
                  {formatCurrency(Number(account.currentBalance || 0))}
                </p>

                <p className="text-xs text-slate-500 mt-2">Sem instituição informada</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Total em contas</p>
              <p className="text-2xl font-bold text-[#16A085]">
                {formatCurrency(accountsTotalBalance)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Maior posição</p>
              <p className="text-lg font-bold text-slate-800">
                {largestAccount ? largestAccount.name : '—'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {largestAccount
                  ? formatCurrency(Number(largestAccount.currentBalance || 0))
                  : 'Nenhuma conta ativa'}
              </p>
            </div>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<AlertTriangle size={20} />}
            title="Alertas financeiros"
            subtitle="Leitura automática de risco e pressão financeira"
            gradient="bg-gradient-to-br from-[#F39C12] to-[#D68910]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.type}-${index}`}
                className={`rounded-2xl border p-4 ${
                  alert.severity === 'high'
                    ? 'border-red-200 bg-red-50'
                    : alert.severity === 'medium'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <p
                  className={`text-sm font-bold mb-1 ${
                    alert.severity === 'high'
                      ? 'text-red-700'
                      : alert.severity === 'medium'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}
                >
                  {alert.title}
                </p>

                <p
                  className={`text-sm ${
                    alert.severity === 'high'
                      ? 'text-red-600'
                      : alert.severity === 'medium'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}
                >
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Receitas x despesas</h3>
              <p className="text-sm text-slate-500">Últimos 6 meses por data da transação</p>
            </div>
          </div>

          {timelineTransactions.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400">
              Ainda não há dados para o gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => (value != null ? formatCurrency(Number(value)) : '-')}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="receitas" fill="#2ECC71" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesas" fill="#E74C3C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Saúde do mês</h3>
          <p className="text-sm text-slate-500 mb-6">
            Quanto das entradas do mês já foi comprometido
          </p>

          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-medium text-slate-600">Comprometimento</span>
              <span className="text-2xl font-bold text-slate-900">
                {currentMonthExpenseRatio.toFixed(0)}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentMonthExpenseRatio < 70
                    ? 'bg-[#2ECC71]'
                    : currentMonthExpenseRatio < 100
                    ? 'bg-[#F39C12]'
                    : 'bg-[#E74C3C]'
                }`}
                style={{ width: `${Math.min(currentMonthExpenseRatio, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">Entradas</p>
                <p className="font-bold text-[#2ECC71]">{formatCurrency(monthSummary.income)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">Saídas</p>
                <p className="font-bold text-[#E74C3C]">{formatCurrency(monthSummary.expense)}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              {monthSummary.balance >= 0
                ? 'Seu mês está positivo até aqui. Agora o sistema também já enxerga a curva futura do caixa.'
                : 'Seu mês está negativo. A timeline acima ajuda a mostrar onde o caixa aperta mais.'}
            </div>
          </div>
        </div>
      </div>

      {projection && projection.cards.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<CreditCard size={20} />}
            title="Comprometimento dos cartões"
            subtitle="Leitura rápida de limite, uso futuro e disponibilidade"
            gradient="bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projection.cards.map((card) => {
              const usagePercent =
                card.limit > 0 ? Math.min((card.committed / card.limit) * 100, 100) : 0;

              return (
                <div key={card._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-800">{card.name}</h4>
                    <span className="text-xs text-slate-500">Cartão</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Limite</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(card.limit)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Comprometido</span>
                      <span className="font-semibold text-[#9B59B6]">
                        {formatCurrency(card.committed)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Disponível</span>
                      <span
                        className={`font-semibold ${
                          card.available >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                        }`}
                      >
                        {formatCurrency(card.available)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          usagePercent < 60
                            ? 'bg-[#2ECC71]'
                            : usagePercent < 85
                            ? 'bg-[#F39C12]'
                            : 'bg-[#E74C3C]'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {usagePercent.toFixed(0)}% do limite comprometido
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<PieChart size={20} />}
            title="Top categorias"
            subtitle="Maiores gastos acumulados"
            gradient="bg-gradient-to-br from-[#3498DB] to-[#2980B9]"
          />

          {topExpenseCategories.length === 0 ? (
            <div className="text-slate-400 text-sm">Nenhuma categoria encontrada ainda</div>
          ) : (
            <div className="space-y-4">
              {topExpenseCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{category.name}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(category.amount / maxCategoryAmount) * 100}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-500">{category.count} transações</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<CreditCard size={20} />}
            title="Por método de pagamento"
            subtitle="Distribuição das saídas"
            gradient="bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]"
          />

          {paymentMethodData.length === 0 ? (
            <div className="text-slate-400 text-sm">Sem despesas para analisar</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RechartsPieChart>
                <Pie
                  data={paymentMethodData}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {paymentMethodData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => (value != null ? formatCurrency(Number(value)) : '-')}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <SectionHeader
            icon={<Landmark size={20} />}
            title="Visão rápida"
            subtitle="Leitura operacional do momento"
            gradient="bg-gradient-to-br from-[#34495E] to-[#2C3E50]"
          />

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Total de entradas</p>
              <p className="font-bold text-[#2ECC71]">
                {simulation.enabled ? monthSummary.incomeCount : summary.incomeCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Total de saídas</p>
              <p className="font-bold text-[#E74C3C]">
                {simulation.enabled ? monthSummary.expenseCount : summary.expenseCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Saldo histórico</p>
              <p
                className={`font-bold ${
                  (simulation.enabled ? monthSummary.balance : summary.balance) >= 0
                    ? 'text-[#2ECC71]'
                    : 'text-[#E74C3C]'
                }`}
              >
                {formatCurrency(simulation.enabled ? monthSummary.balance : summary.balance)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
              Agora o dashboard prioriza risco, pressão, tendência e futuro — não só histórico.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Transações recentes</h3>
          <button
            onClick={() => router.push('/dashboard/transacoes')}
            className="text-sm text-[#3498DB] hover:text-[#2980B9] font-medium"
          >
            Ver todas
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="text-slate-400" size={32} />
              </div>
              <p className="text-slate-500 font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm text-slate-400 mt-2">
                Comece adicionando sua primeira transação
              </p>
            </div>
          ) : (
            recentTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      transaction.type === 'income'
                        ? 'bg-green-100 text-[#2ECC71]'
                        : 'bg-red-100 text-[#E74C3C]'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">
                      {transaction.description || transaction.category?.name || 'Transação'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-sm text-slate-500">
                        {transaction.category?.name || 'Sem categoria'} •{' '}
                        {getPaymentMethodLabel(transaction.paymentMethod)}
                      </p>

                      {transaction.isRecurring && (
                        <span className="rounded-full bg-blue-50 text-blue-700 text-xs px-2 py-1 border border-blue-200">
                          Recorrente
                        </span>
                      )}

                      {transaction.isInstallment && (
                        <span className="rounded-full bg-purple-50 text-purple-700 text-xs px-2 py-1 border border-purple-200">
                          Parcelada
                        </span>
                      )}

                      {(transaction as SimulatedTransaction).isSimulated && (
                        <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-1 border border-slate-800">
                          Simulada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold text-lg ${
                      transaction.type === 'income' ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{' '}
                    {formatCurrency(Number(transaction.amount || 0))}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatShortDate(transaction.transactionDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Leitura estratégica</h3>
            <p className="text-sm text-slate-500">Resumo executivo do estágio atual do produto</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-2">Presente</p>
            <p className="text-sm text-slate-700">
              O sistema acompanha resultado atual, contas, categorias, métodos de pagamento e
              pressão do mês.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-2">Futuro</p>
            <p className="text-sm text-slate-700">
              O dashboard agora antecipa janela futura, movimentos próximos, curva do saldo e ponto
              de maior aperto.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-2">Próximo salto</p>
            <p className="text-sm text-slate-700">
              Conectar essa inteligência a financiamentos, recorrência automática e recomendação de
              compra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}