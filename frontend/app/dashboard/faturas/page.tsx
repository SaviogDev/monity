"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  CreditCard,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Activity,
  Target,
  Eye,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { fetchInvoices, type Invoice } from "@/services/invoices";

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

function getMonthName(m: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2000, m - 1, 1));
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return {
    month: Number.isFinite(month) ? month : 1,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

function getInvoiceCycleDate(invoice: Invoice, day: number) {
  const { month, year } = parseMonthKey(invoice.monthKey);
  const lastDay = new Date(year, month, 0).getDate();

  return new Date(year, month - 1, Math.min(day, lastDay));
}

// --- MAIN PAGE ---
export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch {
      toast.error("Erro ao carregar faturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      return inv.cardName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [invoices, searchTerm]);

  const stats = useMemo(() => {
    const totalOpen = invoices.filter(i => i.status === 'open').reduce((s, i) => s + i.total, 0);
    const totalClosed = invoices.filter(i => i.status === 'closed').reduce((s, i) => s + i.total, 0);
    const totalPartial = invoices.filter(i => i.status === 'partial').reduce((s, i) => s + i.total, 0);
    const count = invoices.length;

    return { totalOpen, totalClosed, totalPartial, count };
  }, [invoices]);

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
              <CreditCard size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Gestão de Cartões</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Faturas</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe o fechamento e pagamento de suas faturas de crédito.</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar por cartão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/[0.05] bg-white/[0.02] py-4 pl-12 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30 focus:bg-white/[0.04] sm:w-64"
            />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total em Aberto"
            value={fmt(stats.totalOpen)}
            subtitle="Faturas no período atual"
            icon={Activity}
            color="orange"
          />
          <MetricCard
            title="Fechadas"
            value={fmt(stats.totalClosed)}
            subtitle="Aguardando pagamento"
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Baixa Parcial"
            value={fmt(stats.totalPartial)}
            subtitle="Faturas parcialmente confirmadas"
            icon={CheckCircle2}
            color="green"
          />
          <MetricCard
            title="Volume Global"
            value={fmt(stats.totalOpen + stats.totalClosed + stats.totalPartial)}
            subtitle="Histórico consolidado"
            icon={Target}
            color="purple"
          />
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center rounded-[3rem] border border-white/[0.05] bg-[var(--bg-card)]/30 backdrop-blur-md">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando faturas</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            variants={itemV}
            className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/[0.08] bg-[var(--bg-card)]/30 py-32 text-center"
          >
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/[0.03] text-slate-700 shadow-inner">
              <CreditCard size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">Nenhuma fatura localizada</h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">As faturas são geradas automaticamente conforme você usa seus cartões de crédito.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {filtered.map((inv) => {
              const statusMap = {
                open: { label: 'Aberta', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                closed: { label: 'Fechada', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                partial: { label: 'Parcial', color: 'text-[var(--monity-green)]', bg: 'bg-[var(--monity-green)]/10', border: 'border-[var(--monity-green)]/20' },
              };
              const s = statusMap[inv.status] || statusMap.open;
              const { month, year } = parseMonthKey(inv.monthKey);
              const dueDate = getInvoiceCycleDate(inv, inv.dueDay);
              const closingDate = getInvoiceCycleDate(inv, inv.closingDay);

              return (
                <motion.div
                  key={`${inv.cardId}-${inv.monthKey}`}
                  variants={itemV}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl transition-all hover:border-[var(--border-accent)]"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--monity-green)] opacity-[0.01] blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.03] transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                            {inv.cardName || 'Cartão'}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 rounded-lg ${s.bg} px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${s.color} border ${s.border}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                          Referência: <span className="text-white">{getMonthName(month)} / {year}</span>
                        </p>
                      </div>
                      
                      <button
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white"
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.03]">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Valor da Fatura</p>
                        <p className="text-3xl font-black tracking-tighter text-white">{fmt(inv.total)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Vencimento</p>
                        <p className={`text-3xl font-black tracking-tighter ${inv.status === 'open' ? 'text-orange-500' : 'text-white'}`}>
                          {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400">
                          <Calendar size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Fechamento: <span className="text-white">{closingDate.toLocaleDateString('pt-BR')}</span>
                        </span>
                      </div>
                      {inv.status === 'closed' && (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--monity-green)]">
                          <CheckCircle2 size={14} />
                          Fechada
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}
