"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Loader2,
  Target,
  Activity,
  PieChart as PieIcon,
  LayoutGrid,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from "recharts";
import { fetchTransactions, type Transaction } from "@/services/transactions";

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
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-500 opacity-[0.02] blur-[100px]" />
    </div>
  );
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
  icon: LucideIcon;
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

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

// --- MAIN PAGE ---
export default function RelatoriosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({});
      setTransactions(data);
    } catch {
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    return { income, expense, balance, savingsRate };
  }, [transactions]);

  const chartData = useMemo(() => {
    // Agrupar por categoria para o gráfico de pizza
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const name = typeof t.category === 'object' ? t.category.name : 'Outros';
      categories[name] = (categories[name] || 0) + t.amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const trendData = useMemo(() => {
    // Simplificado: Agrupar por dia (últimos 7 dias com dados)
    const days: Record<string, { income: number; expense: number }> = {};
    transactions.slice(0, 50).forEach(t => {
      const date = t.transactionDate || t.purchaseDate || t.createdAt;
      const d = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[d]) days[d] = { income: 0, expense: 0 };
      if (t.type === 'income') days[d].income += t.amount;
      else days[d].expense += t.amount;
    });

    return Object.entries(days)
      .map(([name, data]) => ({ name, ...data }))
      .reverse();
  }, [transactions]);

  const COLORS = ['var(--monity-green)', '#3b82f6', '#a855f7', '#f97316', '#ef4444', '#ec4899'];

  return (
    <>
      <BackgroundDecorations />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-8 px-4 pb-32 pt-6 sm:px-6 lg:px-10"
      >
        {/* Header Section */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <BarChart3 size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Analytics & Insights</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Relatórios</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Visualize tendências e a distribuição da sua saúde financeira.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1">
              {['7', '30', '90'].map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`rounded-lg px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${period === d ? 'bg-[var(--monity-green)] text-[var(--bg-base)] shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {d} Dias
                </button>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/[0.05] active:scale-95"
            >
              <Download size={18} />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Receita Total"
            value={fmt(stats.income)}
            subtitle="Acumulado no período"
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Despesa Total"
            value={fmt(stats.expense)}
            subtitle="Consumo de capital"
            icon={TrendingDown}
            color="red"
          />
          <MetricCard
            title="Saldo Líquido"
            value={fmt(stats.balance)}
            subtitle="Performance real"
            icon={Activity}
            color="blue"
          />
          <MetricCard
            title="Taxa de Poupança"
            value={`${stats.savingsRate.toFixed(1)}%`}
            subtitle="Eficiência de retenção"
            icon={Target}
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* Trend Chart */}
          <motion.div
            variants={itemV}
            className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl"
          >
            <div className="mb-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--monity-green)]">Fluxo Temporal</p>
                <h3 className="text-xl font-black text-white">Evolução Diária</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-500">
                <LayoutGrid size={20} />
              </div>
            </div>

            <div className="h-[350px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[var(--monity-green)]" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--monity-green)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--monity-green)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: 'white' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="var(--monity-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Categories Chart */}
          <motion.div
            variants={itemV}
            className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl"
          >
            <div className="mb-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--monity-green)]">Mix de Gastos</p>
                <h3 className="text-xl font-black text-white">Top Categorias</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-500">
                <PieIcon size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
              <div className="h-[300px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[var(--monity-green)]" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '1.5rem', border: '1px solid var(--border)', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="space-y-4">
                {chartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-white">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
