"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Calendar,
  TrendingDown,
  Activity,
  Target,
  ChevronRight,
  Info,
  DollarSign,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchFinancings,
  createFinancing,
  updateFinancing,
  deleteFinancing,
  type Financing,
} from "@/services/financings";
import { fetchAccounts, type Account } from "@/services/accounts";
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

function getReferenceId(value: string | { _id: string } | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id;
}

function getReferenceName(value: string | { name?: string } | null | undefined, fallback = "N/A") {
  if (!value || typeof value === "string") return fallback;
  return value.name || fallback;
}

// --- MODAL ---
interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
  accounts: Account[];
  categories: Category[];
  editing: Financing | null;
}

function FinancingModal({ onClose, onSaved, accounts, categories, editing }: ModalProps) {
  const [description, setDescription] = useState(editing?.description || "");
  const [totalAmount, setTotalAmount] = useState(editing ? String(editing.totalAmount) : "");
  const [downPayment, setDownPayment] = useState(editing ? String(editing.downPayment) : "0");
  const [installmentValue, setInstallmentValue] = useState(editing ? String(editing.installmentValue) : "");
  const [totalInstallments, setTotalInstallments] = useState(editing ? String(editing.totalInstallments) : "");
  const [currentInstallment, setCurrentInstallment] = useState(editing ? String(editing.currentInstallment || 1) : "1");
  const [startDate, setStartDate] = useState(editing ? editing.startDate.split("T")[0] : "");
  const [category, setCategory] = useState(getReferenceId(editing?.category));
  const [account, setAccount] = useState(getReferenceId(editing?.account));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !totalAmount || !installmentValue || !totalInstallments || !startDate || !category || !account) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }

    setSaving(true);
    try {
      const payload = {
        description,
        totalAmount: Number(totalAmount),
        downPayment: Number(downPayment || 0),
        installmentValue: Number(installmentValue),
        totalInstallments: Number(totalInstallments),
        currentInstallment: Number(currentInstallment || 1),
        startDate,
        category,
        account,
      };

      if (editing) {
        await updateFinancing(editing._id, payload);
        toast.success("Financiamento atualizado.");
      } else {
        await createFinancing(payload);
        toast.success("Financiamento cadastrado.");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
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
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
                <Landmark size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Crédito & Bancos</p>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {editing ? "Editar Financiamento" : "Novo Financiamento"}
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

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nome / Instituição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Financiamento Imobiliário"
                className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Valor Total</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-black text-sm transition-colors group-focus-within:text-[var(--monity-green)]">R$</div>
                <input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] pl-12 pr-6 py-4 text-base font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Parcelas</label>
              <input
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                placeholder="Ex: 48"
                className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-base font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Valor da Parcela</label>
              <input
                type="number"
                step="0.01"
                value={installmentValue}
                onChange={(e) => setInstallmentValue(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-base font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Entrada</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-black text-sm transition-colors group-focus-within:text-[var(--monity-green)]">R$</div>
                <input
                  type="number"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] pl-12 pr-6 py-4 text-base font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Data de Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30 [color-scheme:dark]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Parcela Atual</label>
              <input
                type="number"
                min={1}
                value={currentInstallment}
                onChange={(e) => setCurrentInstallment(e.target.value)}
                placeholder="1"
                className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-base font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Categoria</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                >
                  <option value="" className="bg-[var(--bg-card)]">Selecione a categoria...</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id} className="bg-[var(--bg-card)]">
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="col-span-full space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Conta de Débito</label>
              <div className="relative">
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full appearance-none rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-6 py-4 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                >
                  <option value="" className="bg-[var(--bg-card)]">Selecione a conta...</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id} className="bg-[var(--bg-card)]">
                      {acc.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="col-span-full flex gap-4 pt-6">
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
                {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : editing ? "Salvar Alterações" : "Ativar Contrato"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function FinanciamentosPage() {
  const [financings, setFinancings] = useState<Financing[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Financing | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, a, c] = await Promise.all([
        fetchFinancings(),
        fetchAccounts(),
        fetchCategories({ type: "expense" }),
      ]);
      setFinancings(f);
      setAccounts(a);
      setCategories(c);
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Remover este contrato de financiamento?")) return;
    try {
      await deleteFinancing(id);
      toast.success("Financiamento removido.");
      void load();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  const totalFinanced = useMemo(() => financings.reduce((s, f) => s + f.totalAmount, 0), [financings]);
  const activeContracts = useMemo(() => financings.filter((f) => f.status === "active").length, [financings]);
  const monthlyCommitment = useMemo(
    () => financings
      .filter((f) => f.status === "active")
      .reduce((s, f) => s + f.installmentValue, 0),
    [financings]
  );

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
              <Landmark size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Passivo & Longo Prazo</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Financiamentos</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Acompanhe seus contratos de crédito e amortizações.</p>
            </div>
          </div>

          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-3 rounded-2xl bg-[var(--monity-green)] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Novo Contrato
          </button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            title="Volume Financiado"
            value={fmt(totalFinanced)}
            subtitle="Total bruto contratado"
            icon={Target}
            color="blue"
          />
          <MetricCard
            title="Contratos Ativos"
            value={String(activeContracts)}
            subtitle="Acordos em vigência"
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Compromisso Mensal"
            value={fmt(monthlyCommitment)}
            subtitle="Parcelas ativas estimadas"
            icon={TrendingDown}
            color="orange"
          />
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex h-[400px] flex-col items-center justify-center rounded-[3rem] border border-white/[0.05] bg-[var(--bg-card)]/30 backdrop-blur-md">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando contratos</p>
          </div>
        ) : financings.length === 0 ? (
          <motion.div
            variants={itemV}
            className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-white/[0.08] bg-[var(--bg-card)]/30 py-32 text-center"
          >
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/[0.03] text-slate-700 shadow-inner">
              <Landmark size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">Nenhum financiamento</h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">Cadastre seus contratos para monitorar saldos devedores e juros acumulados.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-10 rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/[0.05] active:scale-95"
            >
              Começar Agora
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {financings.map((f) => {
              const acc = f.account;
              return (
                <motion.div
                  key={f._id}
                  variants={itemV}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl transition-all hover:border-[var(--border-accent)]"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--monity-green)] opacity-[0.01] blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.03] transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl font-black tracking-tight text-white uppercase">{f.description}</h3>
                          <span className="inline-flex items-center rounded-lg bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-500 border border-blue-500/20">
                            {f.totalInstallments}x Parcelas
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                          <DollarSign size={12} className="text-[var(--monity-green)]" />
                          Conta: <span className="text-white">{getReferenceName(acc)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 transition-all group-hover:opacity-100">
                        <button
                          onClick={() => { setEditing(f); setModalOpen(true); }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition-all hover:bg-[var(--monity-green)]/10 hover:text-[var(--monity-green)]"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(f._id)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.03]">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Valor Bruto</p>
                        <p className="text-3xl font-black tracking-tighter text-white">{fmt(f.totalAmount)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Parcela</p>
                        <p className="text-3xl font-black tracking-tighter text-[var(--monity-green)]">{fmt(f.installmentValue)}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400">
                          <Calendar size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Início: <span className="text-white">{new Date(f.startDate).toLocaleDateString('pt-BR')}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--monity-green)]">
                        <Info size={14} />
                        Contrato Vigente
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <FinancingModal
            onClose={() => setModalOpen(false)}
            onSaved={load}
            accounts={accounts}
            categories={categories}
            editing={editing}
          />
        )}
      </AnimatePresence>
    </>
  );
}
