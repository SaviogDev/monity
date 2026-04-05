'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  TrendingUp
} from 'lucide-react';

import { fetchGoals, createGoal, updateGoalAmount, deleteGoal, type Goal } from '@/services/goals';
import { useFinancialStore } from '@/stores/financial-store';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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
        color: ['#3498DB', '#9B59B6', '#1ABC9C', '#F39C12', '#E74C3C'][Math.floor(Math.random() * 5)],
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro na transação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta? O dinheiro não voltará para sua conta automaticamente.')) {
      try {
        setDeletingId(id);
        await deleteGoal(id);
        toast.success('Meta excluída!');
        await loadData();
      } catch (error) {
        toast.error('Erro ao excluir meta');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const openTransactionModal = (goal: Goal, type: 'deposit' | 'withdraw') => {
    setSelectedGoal(goal);
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#1ABC9C] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#1ABC9C]/20" />
      </div>
    );
  }

  const totalSaved = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-32">
      
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">Metas e Caixinhas</h1>
          <p className="text-slate-500 font-medium text-lg">Transforme sua margem livre em patrimônio</p>
        </div>

        <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto p-4 bg-[#1ABC9C] text-white rounded-2xl shadow-lg shadow-[#1ABC9C]/20 hover:bg-[#16A085] transition-all font-black flex items-center justify-center gap-2">
          <Plus size={20} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-1">Patrimônio Guardado</p>
            <p className="text-3xl font-black tracking-tighter text-emerald-600">{formatCurrency(totalSaved)}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-1">Alvo Total</p>
            <p className="text-3xl font-black tracking-tighter text-white">{formatCurrency(totalTarget)}</p>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1ABC9C] to-[#16A085] shadow-lg flex items-center justify-center text-white"><TrendingUp size={24} /></div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tighter">Minhas Metas</h3>
            <p className="text-sm font-medium text-slate-500">Acompanhe sua evolução</p>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {goals.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6"><Target className="text-slate-300" size={40} /></div>
              <h4 className="text-2xl font-black text-slate-800 mb-2">Nenhuma meta criada</h4>
              <p className="text-slate-500 font-medium">Comece sua reserva de emergência ou planeje sua próxima viagem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {goals.map(goal => {
                const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                const isCompleted = goal.status === 'completed';

                return (
                  <motion.div key={goal._id} variants={itemVariants} className="group relative bg-white rounded-3xl border-2 border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: isCompleted ? '#2ECC71' : goal.color }} />
                    
                    <div className="p-6 sm:p-8 flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: isCompleted ? '#2ECC71' : goal.color }}>
                            {isCompleted ? <CheckCircle2 size={24} /> : <Target size={24} />}
                          </div>
                          <h3 className="font-black text-lg text-slate-800 leading-tight">{goal.name}</h3>
                        </div>
                        <button onClick={() => handleDelete(goal._id)} disabled={deletingId === goal._id} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-50">
                          {deletingId === goal._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>

                      <div className="mb-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Acumulado</p>
                        <p className="text-3xl font-black tracking-tighter text-slate-800">{formatCurrency(goal.currentAmount)}</p>
                        <p className="text-sm font-bold text-slate-400 mt-1">de {formatCurrency(goal.targetAmount)}</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                          <span className="text-slate-400">Progresso</span>
                          <span style={{ color: isCompleted ? '#2ECC71' : goal.color }}>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${progress}%` }} 
                            className="h-full rounded-full" 
                            style={{ backgroundColor: isCompleted ? '#2ECC71' : goal.color }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/50">
                      <button 
                        onClick={() => openTransactionModal(goal, 'deposit')}
                        disabled={isCompleted}
                        className="py-5 flex items-center justify-center gap-2 font-black text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-30 border-r border-slate-100 text-sm"
                      >
                        <ArrowUpRight size={18} /> Guardar
                      </button>
                      <button 
                        onClick={() => openTransactionModal(goal, 'withdraw')}
                        className="py-5 flex items-center justify-center gap-2 font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors text-sm"
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

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">Nova Meta</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><X size={20} strokeWidth={3} /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qual o seu objetivo?</label>
                  <input type="text" required value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="Ex: Reserva de Emergência, Carro..." className="w-full text-lg sm:text-xl font-bold p-4 sm:p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-[#1ABC9C]/10" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qual o valor alvo?</label>
                  <div className="relative">
                    <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">R$</span>
                    <input type="number" required min="1" step="0.01" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="0,00" className="w-full text-2xl sm:text-3xl font-black pl-12 sm:pl-16 p-4 sm:p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-[#1ABC9C]/10" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#1ABC9C] to-[#16A085] text-white font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Caixinha'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransactionModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTransactionModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">
                  {transactionType === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
                </h2>
                <button onClick={() => setIsTransactionModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><X size={20} strokeWidth={3} /></button>
              </div>
              
              <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Movimentando a meta</p>
                <p className="text-xl font-black text-slate-800">{selectedGoal.name}</p>
              </div>

              <form onSubmit={handleTransaction} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Landmark size={14} /> {transactionType === 'deposit' ? 'Retirar de qual conta?' : 'Depositar em qual conta?'}
                  </label>
                  <select required value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full text-sm sm:text-base font-bold p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-[#1ABC9C]/10 appearance-none">
                    <option value="" disabled>Selecione uma conta</option>
                    {activeAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>{acc.name} ({formatCurrency(acc.currentBalance || 0)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor da Movimentação</label>
                  <div className="relative">
                    <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">R$</span>
                    <input type="number" required min="0.01" step="0.01" value={transactionAmount} onChange={e => setTransactionAmount(e.target.value)} placeholder="0,00" className="w-full text-2xl sm:text-3xl font-black pl-12 sm:pl-16 p-4 sm:p-5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-[#1ABC9C]/10" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={`w-full py-4 sm:py-5 rounded-2xl text-white font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${transactionType === 'deposit' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/30'}`}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : transactionType === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Resgate'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}