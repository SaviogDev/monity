"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  CreditCard,
  Target,
  Activity,
  Check
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchTitulos,
  createTitulo,
  updateTitulo,
  deleteTitulo,
  updateTituloStatus,
  type Titulo,
} from "@/services/titulos";
import { fetchCategories, type Category } from "@/services/categories";
import { fetchAccounts } from "@/services/accounts";

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

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(d));
}

// --- MAIN PAGE ---
export default function TitulosPage() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "receivable" | "payable">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTitulos();
      setTitulos(data);
    } catch {
      toast.error("Erro ao carregar títulos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return titulos.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      
      let matchesStatus = true;
      if (statusFilter === "paid") matchesStatus = t.status === 'paid';
      if (statusFilter === "pending") matchesStatus = t.status === 'open' || t.status === 'overdue';
      if (statusFilter === "overdue") {
        matchesStatus = t.status === 'overdue' || (t.status === 'open' && new Date(t.dueDate) < new Date());
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [titulos, searchTerm, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalReceivable = titulos.filter(t => t.type === 'receivable' && t.status !== 'paid').reduce((s, t) => s + t.amount, 0);
    const totalPayable = titulos.filter(t => t.type === 'payable' && t.status !== 'paid').reduce((s, t) => s + t.amount, 0);
    const totalPaid = titulos.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
    const overdueCount = titulos.filter(t => t.status === 'overdue' || (t.status === 'open' && new Date(t.dueDate) < new Date())).length;

    return { totalReceivable, totalPayable, totalPaid, overdueCount };
  }, [titulos]);

  async function handleTogglePaid(t: Titulo) {
    if (t.status === 'paid') return toast.info("Este título já foi liquidado.");
    try {
      await updateTituloStatus(t._id, 'paid');
      toast.success("Título liquidado com sucesso!");
      void load();
    } catch {
      toast.error("Erro ao liquidar título.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este título?")) return;
    try {
      await deleteTitulo(id);
      toast.success("Título removido.");
      void load();
    } catch {
      toast.error("Erro ao remover.");
    }
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
        {/* Header Section */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <FileText size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Controle de Documentos</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Títulos</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Gestão centralizada de contas a pagar e receber.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar títulos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.05] bg-white/[0.02] py-4 pl-12 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30 focus:bg-white/[0.04] sm:w-64"
              />
            </div>

            <button
              onClick={() => toast.info("Funcionalidade de Novo Título em breve!")}
              className="flex items-center gap-3 rounded-2xl bg-[var(--monity-green)] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              Novo Título
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="A Receber"
            value={fmt(stats.totalReceivable)}
            subtitle="Previsão de entrada"
            icon={ArrowUpRight}
            color="green"
          />
          <MetricCard
            title="A Pagar"
            value={fmt(stats.totalPayable)}
            subtitle="Próximos vencimentos"
            icon={ArrowDownRight}
            color="red"
          />
          <MetricCard
            title="Total Liquidado"
            value={fmt(stats.totalPaid)}
            subtitle="Acumulado do período"
            icon={CheckCircle2}
            color="blue"
          />
          <MetricCard
            title="Vencidos"
            value={String(stats.overdueCount)}
            subtitle="Pendências urgentes"
            icon={AlertTriangle}
            color={stats.overdueCount > 0 ? "orange" : "green"}
          />
        </div>

        {/* Filters and List */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 px-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1">
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'all' ? 'bg-[var(--monity-green)] text-[var(--bg-base)] shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter("receivable")}
                className={`rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'receivable' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Entradas
              </button>
              <button
                onClick={() => setTypeFilter("payable")}
                className={`rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${typeFilter === 'payable' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Saídas
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-transparent px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 outline-none hover:text-white transition-colors"
              >
                <option value="all" className="bg-[var(--bg-card)]">Todos os Status</option>
                <option value="pending" className="bg-[var(--bg-card)]">Pendentes</option>
                <option value="paid" className="bg-[var(--bg-card)]">Liquidados</option>
                <option value="overdue" className="bg-[var(--bg-card)]">Vencidos</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl backdrop-blur-3xl">
            {loading ? (
              <div className="flex h-[400px] flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--monity-green)]" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Localizando registros...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/[0.02] text-slate-700">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-white">Nenhum título encontrado</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">Ajuste os filtros ou crie um novo registro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.03]">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vencimento</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Descrição</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Categoria</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filtered.map((t) => {
                      const isOverdue = t.status === 'overdue' || (t.status === 'open' && new Date(t.dueDate) < new Date());
                      const isPaid = t.status === 'paid';
                      
                      return (
                        <motion.tr
                          key={t._id}
                          variants={itemV}
                          className="group hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-white">{fmtDate(t.dueDate)}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Previsto</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.05] ${t.type === 'receivable' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                {t.type === 'receivable' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                              </div>
                              <span className="text-sm font-bold text-white">{t.description}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="inline-flex items-center rounded-lg bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-slate-400 border border-white/[0.05]">
                              {typeof t.category === 'object' ? t.category?.name : '—'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`text-base font-black tracking-tight ${t.type === 'receivable' ? 'text-blue-500' : 'text-white'}`}>
                              {fmt(t.amount)}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--monity-green)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--monity-green)] border border-[var(--monity-green)]/20 shadow-[0_0_15px_rgba(0,230,130,0.1)]">
                                <CheckCircle2 size={12} /> Liquidado
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                <AlertTriangle size={12} /> Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/20">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isPaid && (
                                <button
                                  onClick={() => handleTogglePaid(t)}
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--monity-green)]/10 text-[var(--monity-green)] transition-all hover:bg-[var(--monity-green)] hover:text-[var(--bg-base)] shadow-sm"
                                  title="Marcar como Pago"
                                >
                                  <Check size={18} strokeWidth={3} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(t._id)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-500"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
