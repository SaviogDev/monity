'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Repeat, 
  Trash2, 
  Pause, 
  Play, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Loader2, 
  X,
  AlertTriangle,
  RefreshCw,
  Zap,
  TrendingDown,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  fetchRecurringRules, 
  updateRecurringRule, 
  deleteRecurringRule, 
  syncRecurringRules, 
  type RecurringRule 
} from '@/services/recurringRules';

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

// --- UTILITIES ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function getFrequencyLabel(freq: string) {
  const map: Record<string, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    yearly: 'Anual',
  };
  return map[freq] || freq;
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
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--monity-green)] opacity-[0.02] blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.05] transition-opacity" />
      
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

export default function RecurringRulesPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchRecurringRules();
      setRules(data);
    } catch (error) {
      toast.error('Erro ao carregar regras de recorrência');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (rule: RecurringRule) => {
    try {
      setActionLoading(rule._id);
      await updateRecurringRule(rule._id, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Recorrência pausada' : 'Recorrência reativada');
      await loadData();
    } catch (error) {
      toast.error('Erro ao atualizar regra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setActionLoading(deletingId);
      await deleteRecurringRule(deletingId);
      toast.success('Regra excluída com sucesso');
      setDeletingId(null);
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir regra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await syncRecurringRules();
      if (result.created > 0) {
        toast.success(`${result.created} regra(s) importada(s) com sucesso!`);
      } else {
        toast.info('Nenhuma regra nova encontrada.');
      }
      await loadData();
    } catch (error) {
      toast.error('Erro ao sincronizar regras');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--monity-green)]" />
      </div>
    );
  }

  const totalMonthlyRecurring = rules.reduce((acc, r) => acc + (r.isActive && r.type === 'expense' ? r.amount : 0), 0);
  const activeCount = rules.filter(r => r.isActive).length;

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
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-blue-500/10 text-blue-500 shadow-inner">
              <Repeat size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Automação Financeira</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Recorrências</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Gerencie lançamentos fixos e automáticos em um só lugar.</p>
            </div>
          </div>

          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="flex h-[3.5rem] items-center justify-center gap-3 rounded-[1.5rem] bg-blue-500 px-8 font-black uppercase tracking-wider text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} strokeWidth={3} />}
            Importar Regras
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Mensal"
            value={formatCurrency(totalMonthlyRecurring)}
            subtitle="Soma de todas as despesas fixas ativas"
            icon={TrendingDown}
            color="red"
          />
          <MetricCard
            title="Regras Ativas"
            value={String(activeCount)}
            subtitle="Automações rodando no sistema"
            icon={Activity}
            color="blue"
          />
          <MetricCard
            title="Economia de Tempo"
            value="Alta"
            subtitle="Processamento automático garantido"
            icon={Zap}
            color="green"
          />
        </div>

        {/* LISTAGEM DE REGRAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <h2 className="font-syne text-2xl font-bold text-white uppercase tracking-tight">Regras de Lançamento</h2>
          </div>

          {rules.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center p-10">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 text-slate-700">
                <Repeat size={48} strokeWidth={1.5} />
              </div>
              <h4 className="text-2xl font-black tracking-tight text-white">Nenhuma regra encontrada</h4>
              <p className="mt-2 text-slate-500 font-medium max-w-sm">Crie lançamentos &quot;Fixos&quot; no Dashboard ou sincronize transações antigas para gerar regras.</p>
              <button onClick={handleSync} className="mt-8 flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-8 py-3 text-sm font-bold text-blue-400 hover:bg-blue-500/20 transition-all">
                <RefreshCw size={18} /> Sincronizar Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode='popLayout'>
                {rules.map(rule => {
                  const isExpense = rule.type === 'expense';
                  const nextDate = rule.nextExecutionDate ? new Date(rule.nextExecutionDate) : null;
                  
                  return (
                    <motion.div 
                      key={rule._id} 
                      layout
                      variants={itemV} 
                      className={`group relative flex flex-col h-full overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] p-8 transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)] ${!rule.isActive ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isExpense ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]'}`}>
                            {isExpense ? <ArrowDownRight size={22} /> : <ArrowUpRight size={22} />}
                          </div>
                          <div>
                            <h4 className="text-lg font-black tracking-tight text-white line-clamp-1">{rule.description}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${rule.isActive ? 'text-[var(--monity-green)]' : 'text-slate-500'}`}>
                                {rule.isActive ? 'ATIVO' : 'PAUSADO'}
                              </span>
                              <span className="text-[10px] font-black text-slate-700">•</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{rule.category.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                           <button 
                            onClick={() => handleToggleActive(rule)} 
                            disabled={actionLoading === rule._id}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all disabled:opacity-30"
                          >
                            {actionLoading === rule._id ? <Loader2 size={16} className="animate-spin" /> : rule.isActive ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Valor da Recorrência</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(rule.amount)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/[0.02] p-4 border border-white/[0.03] mb-6">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            <Clock size={12} /> Frequência
                          </div>
                          <p className="text-sm font-black text-white">{getFrequencyLabel(rule.frequency)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            <Calendar size={12} /> Próxima
                          </div>
                          <p className="text-sm font-black text-white">
                            {nextDate ? format(nextDate, 'dd/MM/yyyy') : '--/--/----'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full border border-white/10" style={{ backgroundColor: rule.category.color }} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{rule.category.name}</span>
                        </div>
                        <button 
                          onClick={() => setDeletingId(rule._id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-500/5 text-slate-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

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
                  <AlertTriangle size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-syne mb-2 text-2xl font-extrabold text-white">Excluir Regra?</h3>
                <p className="mb-10 text-sm font-medium text-slate-500 leading-relaxed">
                  Esta regra deixará de gerar transações automáticas. As transações que já foram criadas não serão afetadas.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === deletingId}
                    className="flex w-full items-center justify-center rounded-2xl bg-rose-50 py-5 font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-500 hover:text-white disabled:opacity-50"
                  >
                    {actionLoading === deletingId ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="w-full rounded-2xl bg-white/5 py-5 font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Manter Regra
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
