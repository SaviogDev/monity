"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  type Budget,
} from "@/services/budgets";
import { fetchCategories, type Category } from "@/services/categories";

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
      <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] rounded-full bg-purple-500 opacity-[0.01] blur-[100px]" />
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

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(v) ? v : 0);
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(2000, month - 1, 1),
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────
function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isOver = pct >= 100;
  const isWarning = pct >= 80 && pct < 100;
  
  const colorClass = isOver 
    ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" 
    : isWarning 
      ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
      : "bg-[var(--monity-green)] shadow-[0_0_12px_rgba(0,230,130,0.4)]";

  return (
    <div className="mt-6 space-y-3">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-500">Consumo do Limite</span>
        <span className={isOver ? "text-red-500" : isWarning ? "text-amber-500" : "text-[var(--monity-green)]"}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.03] p-[1px] border border-white/[0.05]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "circOut" }}
          className={`h-full rounded-full transition-colors duration-500 ${colorClass}`}
        />
      </div>
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  month: number;
  year: number;
  editing: Budget | null;
}

function BudgetModal({ onClose, onSaved, categories, month, year, editing }: ModalProps) {
  const [category, setCategory] = useState(
    typeof editing?.category === "object" ? editing.category._id : "",
  );
  const [limit, setLimit] = useState(editing ? String(editing.limit) : "");
  const [saving, setSaving] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense" || !c.type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numLimit = Number(limit);
    if (!category) return toast.error("Selecione uma categoria.");
    if (!numLimit || numLimit <= 0) return toast.error("Informe um limite válido.");
    
    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing._id, numLimit);
        toast.success("Orçamento atualizado.");
      } else {
        await createBudget({ category, month, year, limit: numLimit });
        toast.success("Orçamento criado.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
                <PiggyBank size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Planejamento</p>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {editing ? "Editar Orçamento" : "Novo Orçamento"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] text-white/40 transition-all hover:bg-white/[0.08] hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                Categoria para Monitorar
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!!editing}
                  className="w-full appearance-none rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-5 py-4 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30 disabled:opacity-40"
                >
                  <option value="" className="bg-[var(--bg-card)]">Selecione uma categoria...</option>
                  {expenseCategories.map((c) => (
                    <option key={c._id} value={c._id} className="bg-[var(--bg-card)]">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                Limite Mensal (R$) — <span className="text-[var(--monity-green)]">{getMonthName(month)}/{year}</span>
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-black text-xl group-focus-within:text-[var(--monity-green)] transition-colors">R$</div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] pl-14 pr-6 py-5 text-3xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30 placeholder:text-white/5"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/[0.06] py-5 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white/[0.03] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-[var(--monity-green)] py-5 text-xs font-black uppercase tracking-widest text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : editing ? "Salvar Alterações" : "Ativar Orçamento"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OrcamentoPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([
        fetchBudgets(month, year),
        fetchCategories({}),
      ]);
      setBudgets(b);
      setCategories(c);
    } catch {
      toast.error("Erro ao carregar orçamentos.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este orçamento?")) return;
    try {
      await deleteBudget(id);
      toast.success("Orçamento excluído.");
      void load();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);
  const totalLimit = useMemo(() => budgets.reduce((s, b) => s + b.limit, 0), [budgets]);
  const overBudgetCount = useMemo(() => budgets.filter((b) => b.spent >= b.limit).length, [budgets]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  return (
    <>
      <BackgroundDecorations />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-8 px-4 pb-32 pt-6 sm:px-6 lg:px-10"
      >
        {/* Header da Página */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <PiggyBank size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Inteligência de Gastos</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Orçamento</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Defina limites mensais e acompanhe seu consumo em tempo real.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-1">
              <div className="flex items-center gap-2 px-4 py-2">
                <Calendar size={16} className="text-[var(--monity-green)]" />
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-transparent text-xs font-black uppercase tracking-widest text-white outline-none"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[var(--bg-card)]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y} className="bg-[var(--bg-card)]">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="flex items-center gap-3 rounded-2xl bg-[var(--monity-green)] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              Novo Limite
            </button>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Limite Total"
            value={fmt(totalLimit)}
            subtitle="Orçamento global do mês"
            icon={Target}
            color="blue"
          />
          <MetricCard
            title="Consumo Atual"
            value={fmt(totalSpent)}
            subtitle={`${((totalSpent / (totalLimit || 1)) * 100).toFixed(0)}% do planejado`}
            icon={ArrowUpRight}
            color={totalSpent > totalLimit ? "red" : "green"}
          />
          <MetricCard
            title="Categorias em Alerta"
            value={String(overBudgetCount)}
            subtitle="Limites excedidos"
            icon={AlertCircle}
            color={overBudgetCount > 0 ? "orange" : "green"}
          />
          <MetricCard
            title="Saúde Financeira"
            value={totalSpent > totalLimit ? "Crítica" : "Boa"}
            subtitle="Baseado no consumo atual"
            icon={Sparkles}
            color={totalSpent > totalLimit ? "red" : "green"}
          />
        </div>

        {/* Listagem de Orçamentos */}
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center rounded-[3rem] border border-white/[0.05] bg-[var(--bg-card)]/30 backdrop-blur-md">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando orçamentos</p>
          </div>
        ) : budgets.length === 0 ? (
          <motion.div
            variants={itemV}
            className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/[0.08] bg-[var(--bg-card)]/30 py-32 text-center"
          >
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/[0.03] text-slate-700 shadow-inner">
              <PiggyBank size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">Nenhum orçamento definido</h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">Crie limites de gastos para suas categorias e tenha controle total sobre seu dinheiro.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-10 rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/[0.05] active:scale-95"
            >
              Configurar Limites
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-2">
            {budgets.map((b) => {
              const cat = b.category;
              const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
              const isOver = pct >= 100;
              
              return (
                <motion.div
                  key={b._id}
                  variants={itemV}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl transition-all hover:border-[var(--border-accent)]"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--monity-green)] opacity-[0.01] blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.03] transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl font-black tracking-tight text-white uppercase">{cat.name}</h3>
                          {isOver && (
                            <span className="inline-flex items-center rounded-lg bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                              Limite Excedido
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                          Limite Planejado: <span className="text-white">{fmt(b.limit)}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 transition-all group-hover:opacity-100">
                        <button
                          onClick={() => { setEditing(b); setModalOpen(true); }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition-all hover:bg-[var(--monity-green)]/10 hover:text-[var(--monity-green)]"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Gasto Registrado</p>
                        <p className={`text-3xl font-black tracking-tighter ${isOver ? 'text-red-500' : 'text-white'}`}>
                          {fmt(b.spent)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Saldo Disponível</p>
                        <p className={`text-3xl font-black tracking-tighter ${isOver ? 'text-slate-800' : 'text-[var(--monity-green)]'}`}>
                          {fmt(Math.max(b.limit - b.spent, 0))}
                        </p>
                      </div>
                    </div>

                    <BudgetBar spent={b.spent} limit={b.limit} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <BudgetModal
            onClose={() => setModalOpen(false)}
            onSaved={load}
            categories={categories}
            month={month}
            year={year}
            editing={editing}
          />
        )}
      </AnimatePresence>
    </>
  );
}
