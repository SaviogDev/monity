'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Calculator, 
  Calendar, 
  CheckCircle2, 
  CreditCard as CreditCardIcon, 
  FileText, 
  Layers3, 
  Loader2, 
  Plus, 
  Receipt, 
  Wallet, 
  XCircle,
  X,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

import { clearToken } from '@/services/auth';
import { fetchCategories, type Category } from '@/services/categories';
import { fetchCreditCards, type CreditCard } from '@/services/creditCards';
import { 
  createInstallmentPlan, 
  fetchInstallmentPlanById, 
  fetchInstallmentPlans, 
  type InstallmentPlan, 
  type InstallmentPlanTransaction 
} from '@/services/installmentPlans';

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
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-500 opacity-[0.02] blur-[100px]" />
    </div>
  );
}

// --- UTILITIES ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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

type FormState = {
  description: string;
  totalAmount: string;
  installmentCount: string;
  category: string;
  creditCard: string;
  transactionDate: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  description: '',
  totalAmount: '',
  installmentCount: '2',
  category: '',
  creditCard: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function InstallmentPlansPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, cardsData, plansData] = await Promise.all([
        fetchCategories({ type: 'expense', limit: 100 }),
        fetchCreditCards({ isActive: true }),
        fetchInstallmentPlans(),
      ]);

      setCategories(categoriesData.filter((item) => item.type === 'expense'));
      setCreditCards(cardsData.filter((item) => item.isActive));
      setPlans(plansData);

      if (plansData.length > 0) {
        const firstPlan = await fetchInstallmentPlanById(plansData[0]._id);
        setSelectedPlan(firstPlan);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados dos parcelamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSelectPlan = async (planId: string) => {
    try {
      setDetailsLoading(true);
      const plan = await fetchInstallmentPlanById(planId);
      setSelectedPlan(plan);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.description || !form.totalAmount || !form.category || !form.creditCard) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      const createdPlan = await createInstallmentPlan({
        description: form.description.trim(),
        totalAmount: Number(form.totalAmount),
        installmentAmount: Number(form.totalAmount) / Number(form.installmentCount),
        installmentCount: Number(form.installmentCount),
        category: form.category,
        creditCard: form.creditCard,
        purchaseDate: form.transactionDate,
        notes: form.notes.trim(),
      });

      toast.success('Parcelamento criado com sucesso!');
      setForm(INITIAL_FORM);

      const plansData = await fetchInstallmentPlans();
      setPlans(plansData);

      const detailedPlan = await fetchInstallmentPlanById(createdPlan._id);
      setSelectedPlan(detailedPlan);
    } catch (error) {
      toast.error('Erro ao criar parcelamento');
    } finally {
      setSubmitting(false);
    }
  };

  const planStats = useMemo(() => {
    const totalPlans = plans.length;
    const totalAmount = plans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    const totalInstallments = plans.reduce((sum, plan) => sum + (plan.installmentCount || 0), 0);
    const plannedTransactions = selectedPlan?.transactions?.filter((item) => item.status === 'planned').length || 0;

    return { totalPlans, totalAmount, totalInstallments, plannedTransactions };
  }, [plans, selectedPlan]);

  const installmentPreview = useMemo(() => {
    const total = Number(form.totalAmount);
    const count = Number(form.installmentCount);
    if (!total || !count || count <= 0) return [];

    const totalInCents = Math.round(total * 100);
    const baseInCents = Math.floor(totalInCents / count);
    const remainder = totalInCents % count;

    return Array.from({ length: count }, (_, index) => {
      const cents = baseInCents + (index < remainder ? 1 : 0);
      return cents / 100;
    });
  }, [form.totalAmount, form.installmentCount]);

  const selectedPlanConfirmedCount = useMemo(() => {
    return selectedPlan?.transactions?.filter((item) => item.status === 'confirmed').length || 0;
  }, [selectedPlan]);

  const selectedPlanProgress = useMemo(() => {
    if (!selectedPlan?.installmentCount) return 0;
    return (selectedPlanConfirmedCount / selectedPlan.installmentCount) * 100;
  }, [selectedPlan, selectedPlanConfirmedCount]);

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
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-purple-500/10 text-purple-500 shadow-inner">
              <Layers3 size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Gestão de Crédito</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Parcelamentos</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Organize compras de longo prazo com projeção automática.</p>
            </div>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Planos Ativos"
            value={String(planStats.totalPlans)}
            subtitle="Contratos em andamento"
            icon={Layers3}
            color="blue"
          />
          <MetricCard
            title="Total Parcelado"
            value={formatCurrency(planStats.totalAmount)}
            subtitle="Volume total comprometido"
            icon={Wallet}
            color="purple"
          />
          <MetricCard
            title="Parcelas Totais"
            value={String(planStats.totalInstallments)}
            subtitle="Lançamentos gerados"
            icon={Calculator}
            color="green"
          />
          <MetricCard
            title="A Vencer"
            value={String(planStats.plannedTransactions)}
            subtitle="No plano selecionado"
            icon={Calendar}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* COLUNA ESQUERDA: FORMULÁRIO */}
          <motion.div variants={itemV} className="xl:col-span-2 space-y-6">
            <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-12 w-12 rounded-2xl bg-[var(--monity-green)]/10 text-[var(--monity-green)] flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Nova Compra</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registre um parcelamento</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descrição</label>
                  <input 
                    type="text" 
                    required 
                    value={form.description} 
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                    placeholder="Ex: iPhone 15 Pro Max" 
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-lg font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--monity-green)]">R$</span>
                      <input 
                        type="number" 
                        required 
                        step="0.01" 
                        value={form.totalAmount} 
                        onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} 
                        placeholder="0,00" 
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 pl-12 text-xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parcelas</label>
                    <input 
                      type="number" 
                      required 
                      min="2" 
                      value={form.installmentCount} 
                      onChange={e => setForm(p => ({ ...p, installmentCount: e.target.value }))} 
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50 text-center" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria</label>
                    <select 
                      required 
                      value={form.category} 
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full h-[4.2rem] rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-5 font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cartão de Crédito</label>
                    <select 
                      required 
                      value={form.creditCard} 
                      onChange={e => setForm(p => ({ ...p, creditCard: e.target.value }))}
                      className="w-full h-[4.2rem] rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-5 font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione</option>
                      {creditCards.map(card => <option key={card._id} value={card._id}>{card.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Data da Compra</label>
                  <input 
                    type="date" 
                    required 
                    value={form.transactionDate} 
                    onChange={e => setForm(p => ({ ...p, transactionDate: e.target.value }))}
                    className="w-full h-[4.2rem] rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-5 font-bold text-white outline-none appearance-none" 
                  />
                </div>

                {installmentPreview.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Receipt size={14} /> Prévia do Plano
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto pr-2 custom-scrollbar">
                      {installmentPreview.map((val, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-base)] border border-white/[0.03]">
                          <span className="text-[9px] font-bold text-slate-600">{i+1}ª</span>
                          <span className="text-xs font-black text-slate-300">{formatCurrency(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Gerar Parcelamento'}
                </button>
              </form>
            </div>
          </motion.div>

          {/* COLUNA DIREITA: LISTAGEM E DETALHES */}
          <div className="xl:col-span-3 space-y-8">
            {/* LISTAGEM */}
            <motion.div variants={itemV} className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="p-8 border-b border-white/[0.05]">
                <h3 className="text-xl font-black text-white tracking-tight">Planos Registrados</h3>
              </div>

              <div className="max-h-[350px] overflow-auto custom-scrollbar">
                {plans.length === 0 ? (
                  <div className="p-12 text-center text-slate-600 font-bold">Nenhum parcelamento encontrado</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {plans.map(plan => {
                      const isSelected = selectedPlan?._id === plan._id;
                      return (
                        <button 
                          key={plan._id} 
                          onClick={() => handleSelectPlan(plan._id)}
                          className={`w-full group flex items-center justify-between p-6 transition-all hover:bg-white/[0.02] ${isSelected ? 'bg-white/[0.03]' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--monity-green)] text-black' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
                              <Receipt size={20} />
                            </div>
                            <div className="text-left">
                              <p className="font-black text-white line-clamp-1">{plan.description}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {plan.installmentCount}x • {plan.creditCard?.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-white">{formatCurrency(plan.totalAmount)}</p>
                            <p className="text-[10px] font-bold text-slate-600">{formatDate(plan.purchaseDate)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* DETALHES */}
            <AnimatePresence mode='wait'>
              {selectedPlan ? (
                <motion.div 
                  key={selectedPlan._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <FileText size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">{selectedPlan.description}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Detalhamento das Parcelas</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-lg font-black text-white">{formatCurrency(selectedPlan.totalAmount)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Categoria</p>
                      <p className="text-lg font-black text-white">{selectedPlan.category?.name}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-lg font-black text-[var(--monity-green)]">{selectedPlanConfirmedCount}/{selectedPlan.installmentCount} pagas</p>
                    </div>
                  </div>

                  {/* PROGRESSO */}
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progresso da Compra</span>
                      <span className="text-[10px] font-black text-[var(--monity-green)]">{selectedPlanProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 border border-white/[0.03] overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${selectedPlanProgress}%` }} 
                        transition={{ duration: 1, ease: "circOut" }}
                        className="h-full bg-[var(--monity-green)] shadow-[0_0_10px_rgba(0,230,130,0.3)]" 
                      />
                    </div>
                  </div>

                  {/* TABELA DE PARCELAS */}
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-4 bg-white/[0.03] p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                      <span>Parcela</span>
                      <span>Vencimento</span>
                      <span>Valor</span>
                      <span className="text-right">Status</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[300px] overflow-auto custom-scrollbar">
                      {selectedPlan.transactions?.map((t, i) => (
                        <div key={t._id} className="grid grid-cols-4 p-4 items-center transition-all hover:bg-white/[0.01]">
                          <span className="text-xs font-black text-white">{i+1}ª Parcela</span>
                          <span className="text-xs font-bold text-slate-500">{formatDate(t.transactionDate)}</span>
                          <span className="text-xs font-black text-white">{formatCurrency(t.amount)}</span>
                          <div className="flex justify-end">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${t.status === 'confirmed' ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]' : 'bg-orange-500/10 text-orange-500'}`}>
                              {t.status === 'confirmed' ? 'Paga' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-3 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <Info size={18} className="text-blue-400 shrink-0" />
                    <p className="text-[11px] font-bold text-blue-400 leading-relaxed">
                      O Monity provisiona automaticamente estas parcelas em seu fluxo de caixa, garantindo previsibilidade total do seu orçamento futuro.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.01] p-20 text-center">
                   <FileText size={48} className="text-slate-800 mb-4" />
                   <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Selecione um plano para detalhar</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </>
  );
}