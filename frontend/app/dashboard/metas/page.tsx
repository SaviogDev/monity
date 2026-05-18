'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Target, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  PiggyBank, 
  X, 
  Landmark, 
  CheckCircle2,
  Loader2,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

import { fetchGoals, createGoal, updateGoalAmount, deleteGoal, type Goal } from '@/services/goals';
import { useFinancialStore } from '@/stores/financial-store';

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
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-[var(--monity-green)] opacity-[0.02] blur-[100px]" />
      <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] rounded-full bg-blue-500 opacity-[0.01] blur-[100px]" />
    </div>
  );
}

// --- UTILITIES ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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
      className="group relative overflow-hidden rounded-[2rem] bg-[var(--bg-card)] p-7 border border-[var(--border)] transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--monity-green)] opacity-[0.02] blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.05] transition-opacity" />
      
      <div className="flex items-start justify-between mb-6">
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] transition-all group-hover:scale-110 group-hover:border-[var(--border-accent)]"
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

export default function GoalsPage() {
  const { accounts, loadAll } = useFinancialStore();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  
  const [transactionAmount, setTransactionAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const activeAccounts = useMemo(() => accounts?.filter(acc => acc.isActive !== false) || [], [accounts]);

  const loadData = async () => {
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch (error) {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (accounts.length === 0) loadAll();
  }, [accounts.length, loadAll]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName || !newGoalTarget) return;

    try {
      setIsSubmitting(true);
      await createGoal({
        name: newGoalName,
        targetAmount: Number(newGoalTarget),
        color: ['#00e682', '#3b82f6', '#a855f7', '#f97316', '#ef4444'][Math.floor(Math.random() * 5)],
      });
      toast.success('Meta criada com sucesso!');
      setIsCreateModalOpen(false);
      setNewGoalName('');
      setNewGoalTarget('');
      await loadData();
    } catch (error) {
      toast.error('Erro ao criar meta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !transactionAmount || !selectedAccountId) return;

    const amount = transactionType === 'deposit' ? Number(transactionAmount) : -Number(transactionAmount);

    try {
      setIsSubmitting(true);
      await updateGoalAmount(selectedGoal._id, amount, selectedAccountId);
      toast.success(transactionType === 'deposit' ? 'Depósito realizado!' : 'Resgate realizado!');
      
      setIsTransactionModalOpen(false);
      setTransactionAmount('');
      setSelectedAccountId('');
      setSelectedGoal(null);
      
      await loadData();
      await loadAll();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Erro na transação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      setIsSubmitting(true);
      await deleteGoal(deletingId);
      toast.success('Meta excluída com sucesso!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir meta');
    } finally {
      setDeletingId(null);
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

  const totalSaved = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);
  const globalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

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
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-amber-500/10 text-amber-500 shadow-inner">
              <Target size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Planejamento & Futuro</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Metas</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Transforme seus objetivos em realidade com economia estruturada.</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="flex h-[3.5rem] items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={3} />
            Nova Meta
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Patrimônio Acumulado"
            value={formatCurrency(totalSaved)}
            subtitle="Total guardado em todas as metas"
            icon={PiggyBank}
            color="green"
          />
          <MetricCard
            title="Alvo Global"
            value={formatCurrency(totalTarget)}
            subtitle="Soma de todos os seus objetivos"
            icon={Target}
            color="blue"
          />
          <MetricCard
            title="Conclusão Média"
            value={`${globalProgress.toFixed(1)}%`}
            subtitle="Progresso rumo aos seus sonhos"
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* LISTAGEM DE METAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-2 w-2 rounded-full bg-[var(--monity-green)] shadow-[0_0_10px_rgba(0,230,130,0.5)]" />
            <h2 className="font-syne text-2xl font-bold text-white uppercase tracking-tight">Suas Caixinhas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {goals.length === 0 ? (
              <div className="col-span-full flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 text-slate-700">
                  <Target size={48} strokeWidth={1.5} />
                </div>
                <h4 className="text-2xl font-black tracking-tight text-white">Comece a poupar</h4>
                <p className="mt-2 text-slate-500 font-medium max-w-xs">Defina um objetivo, como uma viagem ou reserva, e comece a guardar dinheiro.</p>
                <button onClick={() => setIsCreateModalOpen(true)} className="mt-8 flex items-center gap-2 rounded-full bg-white/5 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all">
                  <Plus size={18} /> Criar primeira meta
                </button>
              </div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {goals.map(goal => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  const isCompleted = goal.status === 'completed' || progress >= 100;
                  const activeColor = goal.color || 'var(--monity-green)';

                  return (
                    <motion.div 
                      key={goal._id} 
                      layout
                      variants={itemV} 
                      className="group relative flex flex-col h-full overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] p-8 transition-all hover:border-[var(--border-accent)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                      {/* EFEITO VISUAL */}
                      <div className="absolute top-0 right-0 w-full h-full opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity overflow-hidden">
                        <div 
                          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[80px]"
                          style={{ backgroundColor: activeColor }}
                        />
                      </div>

                      <div className="relative z-10 flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div 
                            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 shadow-2xl"
                            style={{ 
                              background: `linear-gradient(135deg, ${activeColor}20 0%, ${activeColor}10 100%)`,
                              color: activeColor 
                            }}
                          >
                            {isCompleted ? <CheckCircle2 size={28} strokeWidth={2.5} /> : <Target size={28} strokeWidth={2.5} />}
                          </div>
                          <div>
                            <h4 className="text-xl font-black tracking-tight text-white">{goal.name}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                              {isCompleted ? 'OBJETIVO ALCANÇADO' : 'EM PROGRESSO'}
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setDeletingId(goal._id)} 
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="relative z-10 mb-8">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Acumulado</p>
                            <h3 className="text-3xl font-black tracking-tight text-white">{formatCurrency(goal.currentAmount)}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Alvo</p>
                            <p className="text-lg font-black text-slate-300">{formatCurrency(goal.targetAmount)}</p>
                          </div>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/[0.03]">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${progress}%` }} 
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className="h-full relative shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
                            style={{ backgroundColor: activeColor }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                          </motion.div>
                        </div>
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[10px] font-black" style={{ color: activeColor }}>{progress.toFixed(1)}% completo</span>
                          {isCompleted && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-[var(--monity-green)]">
                              <Sparkles size={10} /> PARABÉNS!
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.05]">
                        <button 
                          onClick={() => {
                            setSelectedGoal(goal);
                            setTransactionType('deposit');
                            setIsTransactionModalOpen(true);
                          }}
                          disabled={isCompleted}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-[var(--monity-green)] hover:text-black disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white"
                        >
                          <ArrowUpRight size={16} /> Guardar
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedGoal(goal);
                            setTransactionType('withdraw');
                            setIsTransactionModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-rose-500 hover:text-white"
                        >
                          <ArrowDownRight size={16} /> Resgatar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Modal: Criar Meta */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-md overflow-hidden rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[var(--monity-green)] to-transparent opacity-50" />
                
                <div className="p-10">
                  <div className="mb-10 flex items-center justify-between">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Novo Objetivo</p>
                      <h2 className="font-syne text-3xl font-extrabold text-white">Criar Meta</h2>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateGoal} className="space-y-8">
                    <div>
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">O que você quer conquistar?</label>
                      <input 
                        type="text" 
                        required 
                        value={newGoalName} 
                        onChange={e => setNewGoalName(e.target.value)} 
                        placeholder="Ex: Viagem de Férias" 
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 text-lg font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50 focus:ring-4 focus:ring-[var(--monity-green)]/10" 
                      />
                    </div>
                    
                    <div>
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor do Objetivo</label>
                      <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-[var(--monity-green)]">R$</span>
                        <input 
                          type="number" 
                          required 
                          min="1" 
                          step="0.01" 
                          value={newGoalTarget} 
                          onChange={e => setNewGoalTarget(e.target.value)} 
                          placeholder="0,00" 
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 pl-14 text-3xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50" 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Criar Meta</>}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Movimentação */}
        <AnimatePresence>
          {isTransactionModalOpen && selectedGoal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTransactionModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-md overflow-hidden rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
              >
                <div className={`absolute top-0 left-0 w-full h-2 ${transactionType === 'deposit' ? 'bg-[var(--monity-green)]' : 'bg-rose-500'} opacity-50`} />
                
                <div className="p-10">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.3em] ${transactionType === 'deposit' ? 'text-[var(--monity-green)]' : 'text-rose-500'}`}>Movimentação</p>
                      <h2 className="font-syne text-3xl font-extrabold text-white">
                        {transactionType === 'deposit' ? 'Guardar' : 'Resgatar'}
                      </h2>
                    </div>
                    <button onClick={() => setIsTransactionModalOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="mb-8 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Destino / Origem</p>
                    <p className="text-xl font-black text-white">{selectedGoal.name}</p>
                  </div>

                  <form onSubmit={handleTransaction} className="space-y-8">
                    <div>
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        {transactionType === 'deposit' ? 'Retirar de qual conta?' : 'Enviar para qual conta?'}
                      </label>
                      <select 
                        required 
                        value={selectedAccountId} 
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/50 appearance-none"
                      >
                        <option value="" disabled>Selecione uma conta</option>
                        {activeAccounts.map(acc => (
                          <option key={acc._id} value={acc._id}>{acc.name} ({formatCurrency(acc.currentBalance || 0)})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor</label>
                      <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-[var(--monity-green)]">R$</span>
                        <input 
                          type="number" 
                          required 
                          min="0.01" 
                          step="0.01" 
                          value={transactionAmount} 
                          onChange={e => setTransactionAmount(e.target.value)} 
                          placeholder="0,00" 
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 pl-14 text-3xl font-black text-white outline-none transition-all focus:border-[var(--monity-green)]/50" 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className={`relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${transactionType === 'deposit' ? 'bg-[var(--monity-green)]' : 'bg-rose-500 text-white'}`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Confirmar</>}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Excluir */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingId(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md overflow-hidden rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border)] p-10 text-center shadow-2xl"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Trash2 size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-syne mb-2 text-2xl font-extrabold text-white">Excluir Meta?</h3>
                <p className="mb-10 text-sm font-medium text-slate-500">
                  Tem certeza que deseja excluir esta meta? O dinheiro acumulado continuará no saldo das suas contas, mas a organização da caixinha será perdida.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-2xl bg-rose-500 py-5 font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="w-full rounded-2xl bg-white/5 py-5 font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}