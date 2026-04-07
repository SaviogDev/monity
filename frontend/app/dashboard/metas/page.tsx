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
  AlertTriangle
} from 'lucide-react';

import { fetchGoals, createGoal, updateGoalAmount, deleteGoal, type Goal } from '@/services/goals';
import { useFinancialStore } from '@/stores/financial-store';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const INPUT_CLASS =
  'w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10';

const SELECT_CLASS =
  'w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10';

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#2ECC71]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#F1C40F]/10 blur-[100px]" />
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function MetricCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone: 'green' | 'dark';
  icon: ReactNode;
}) {
  const styles = {
    green: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-white shadow-xl shadow-[#2ECC71]/30 border-none',
    dark: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50] text-white shadow-xl shadow-[#34495E]/30 border-none',
  }[tone];

  const iconStyles = {
    green: 'bg-white/20 text-white backdrop-blur-md',
    dark: 'bg-white/10 text-white backdrop-blur-md',
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-1 sm:rounded-[2rem] ${styles}`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      
      <div className="relative z-10">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] ${iconStyles}`}>
          {icon}
        </div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
          {title}
        </p>
        <p className="truncate text-3xl font-black tracking-tighter text-white sm:text-4xl">
          {value}
        </p>
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
        color: ['#3498DB', '#9B59B6', '#1ABC9C', '#F1C40F', '#E74C3C'][Math.floor(Math.random() * 5)],
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

  const openTransactionModal = (goal: Goal, type: 'deposit' | 'withdraw') => {
    setSelectedGoal(goal);
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#2ECC71] border-t-transparent shadow-lg shadow-[#2ECC71]/20" />
      </div>
    );
  }

  const totalSaved = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);

  return (
    <>
      <BackgroundBlobs />
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-[1600px] space-y-6 px-4 pb-32 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-10">
        
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">
              Seu Futuro
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">Metas e Caixinhas</h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">Transforme sua margem livre em patrimônio estruturado.</p>
          </div>

          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="group flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] px-8 py-4 font-black text-white shadow-xl shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] sm:w-auto"
          >
            <Plus size={20} className="transition-transform group-hover:rotate-90" /> Nova Meta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <MetricCard
            title="Patrimônio Guardado"
            value={formatCurrency(totalSaved)}
            tone="green"
            icon={<PiggyBank size={24} />}
          />
          <MetricCard
            title="Alvo Total"
            value={formatCurrency(totalTarget)}
            tone="dark"
            icon={<Target size={24} />}
          />
        </div>

        <motion.div variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
          <div className="border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1ABC9C] to-[#16A085] text-white shadow-inner">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-[#34495E]">Minhas Metas</h3>
              <p className="mt-1 text-sm font-bold text-slate-400">Acompanhe sua evolução individualmente.</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {goals.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                  <Target size={40} />
                </div>
                <h4 className="text-2xl font-black tracking-tight text-[#34495E] mb-2">Nenhuma meta criada</h4>
                <p className="text-sm font-bold text-slate-500 max-w-md">Comece sua reserva de emergência, planeje sua próxima viagem ou junte para um sonho.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals.map(goal => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  const isCompleted = goal.status === 'completed' || progress >= 100;
                  const activeColor = isCompleted ? '#2ECC71' : goal.color;

                  return (
                    <motion.div 
                      key={goal._id} 
                      variants={itemVariants} 
                      className="group relative flex flex-col h-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                    >
                      <div className="absolute top-0 left-0 w-full h-1.5 opacity-80" style={{ backgroundColor: activeColor }} />
                      
                      <div className="flex-1 p-6 sm:p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-white shadow-md" style={{ backgroundColor: activeColor }}>
                              {isCompleted ? <CheckCircle2 size={24} /> : <Target size={24} />}
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-[#34495E]">{goal.name}</h3>
                          </div>
                          <button 
                            onClick={() => setDeletingId(goal._id)} 
                            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-[#FF3366]"
                            aria-label="Excluir meta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="mb-8">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Acumulado</p>
                          <p className="text-3xl font-black tracking-tighter text-[#34495E]">{formatCurrency(goal.currentAmount)}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">de {formatCurrency(goal.targetAmount)}</p>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Progresso</span>
                            <span style={{ color: activeColor }}>{progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${progress}%` }} 
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full rounded-full" 
                              style={{ backgroundColor: activeColor }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-white/40">
                        <button 
                          onClick={() => openTransactionModal(goal, 'deposit')}
                          disabled={isCompleted}
                          className="flex items-center justify-center gap-2 py-5 text-sm font-black text-slate-500 transition-colors hover:bg-emerald-50 hover:text-[#2ECC71] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                        >
                          <ArrowUpRight size={18} /> Guardar
                        </button>
                        <button 
                          onClick={() => openTransactionModal(goal, 'withdraw')}
                          className="flex items-center justify-center gap-2 py-5 text-sm font-black text-slate-500 transition-colors hover:bg-rose-50 hover:text-[#FF3366]"
                        >
                          <ArrowDownRight size={18} /> Resgatar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Modal: Criar Meta */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">Planejamento</p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">Nova Meta</h2>
                  </div>
                  <button onClick={() => setIsCreateModalOpen(false)} className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"><X size={20} strokeWidth={2.5} /></button>
                </div>

                <form onSubmit={handleCreateGoal} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Qual o seu objetivo?</label>
                    <input type="text" required value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="Ex: Reserva de Emergência, Carro..." className={INPUT_CLASS} />
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Qual o valor alvo?</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">R$</span>
                      <input type="number" required min="1" step="0.01" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="0,00" className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 pl-14 text-3xl font-black tracking-tighter text-[#34495E] outline-none transition-all placeholder:text-slate-300 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {isSubmitting ? <Loader2 className="animate-spin relative z-10" size={20} /> : <><CheckCircle2 size={20} className="relative z-10" /><span className="relative z-10">Criar Caixinha</span></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Transação (Guardar/Resgatar) */}
        <AnimatePresence>
          {isTransactionModalOpen && selectedGoal && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTransactionModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className={`mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] ${transactionType === 'deposit' ? 'text-[#2ECC71]' : 'text-[#FF3366]'}`}>Movimentação</p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">
                      {transactionType === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
                    </h2>
                  </div>
                  <button onClick={() => setIsTransactionModalOpen(false)} className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"><X size={20} strokeWidth={2.5} /></button>
                </div>
                
                <div className="mb-6 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4 text-center">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Meta selecionada</p>
                  <p className="text-xl font-black tracking-tight text-[#34495E]">{selectedGoal.name}</p>
                </div>

                <form onSubmit={handleTransaction} className="space-y-5">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      <Landmark size={14} /> {transactionType === 'deposit' ? 'Retirar de qual conta?' : 'Depositar em qual conta?'}
                    </label>
                    <select required value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className={SELECT_CLASS}>
                      <option value="" disabled>Selecione uma conta</option>
                      {activeAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>{acc.name} ({formatCurrency(acc.currentBalance || 0)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Valor da Movimentação</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">R$</span>
                      <input type="number" required min="0.01" step="0.01" value={transactionAmount} onChange={e => setTransactionAmount(e.target.value)} placeholder="0,00" className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 pl-14 text-3xl font-black tracking-tighter text-[#34495E] outline-none transition-all placeholder:text-slate-300 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className={`group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${transactionType === 'deposit' ? 'bg-gradient-to-tr from-[#2ECC71] to-[#27AE60] shadow-[#2ECC71]/30 hover:shadow-[#2ECC71]/40' : 'bg-gradient-to-tr from-[#FF3366] to-[#E74C3C] shadow-[#FF3366]/30 hover:shadow-[#FF3366]/40'}`}>
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {isSubmitting ? <Loader2 className="animate-spin relative z-10" size={20} /> : <><CheckCircle2 size={20} className="relative z-10" /><span className="relative z-10">{transactionType === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Resgate'}</span></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Excluir Meta */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#FF3366]">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="mb-2 text-xl font-black tracking-tighter text-[#34495E]">
                  Excluir meta?
                </h3>
                <p className="mb-8 text-sm font-bold leading-relaxed text-slate-400">
                  Tem certeza que deseja excluir esta meta? O dinheiro não voltará para sua conta automaticamente, você deverá ajustar seu saldo se necessário.
                </p>

                <div className="space-y-3">
                  <button type="button" onClick={handleDelete} disabled={isSubmitting} className="flex w-full items-center justify-center rounded-[1.25rem] bg-[#FF3366] py-4 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all hover:bg-[#e62e5c] disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir'}
                  </button>
                  <button type="button" onClick={() => setDeletingId(null)} className="w-full rounded-[1.25rem] bg-slate-100 py-4 font-bold text-slate-500 transition-all hover:bg-slate-200">
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