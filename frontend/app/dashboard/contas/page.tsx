'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  Wallet,
  Landmark,
  PiggyBank,
  Banknote,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import {
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/services/accounts';
import { useFinancialStore } from '@/stores/financial-store';

type AccountType = 'checking' | 'wallet' | 'cash' | 'savings';

type Account = {
  _id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  bankCode?: string | null;
  color?: string;
  isActive: boolean;
};

type AccountFormData = {
  name: string;
  type: AccountType;
  initialBalance: string;
  bank: string;
  color: string;
  isActive: boolean;
};

const defaultForm: AccountFormData = {
  name: '',
  type: 'checking',
  initialBalance: '',
  bank: '',
  color: '#2563EB', // blue-600 default
  isActive: true,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  wallet: 'Carteira',
  cash: 'Dinheiro Físico',
  savings: 'Poupança',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function getAccountIcon(type: AccountType) {
  switch (type) {
    case 'checking': return Landmark;
    case 'wallet': return Wallet;
    case 'cash': return Banknote;
    case 'savings': return PiggyBank;
    default: return Wallet;
  }
}

function normalizeNumber(value: string) {
  if (!value) return 0;
  const clean = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(clean);
  return Number.isNaN(parsed) ? 0 : parsed;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// Componente de Métrica Refinado (Padrão Light Premium)
function MetricCard({ title, value, subtitle, tone, icon }: { title: string; value: string; subtitle?: string; tone: 'blue' | 'green' | 'red' | 'purple' | 'slate'; icon: ReactNode }) {
  const styles = {
    blue: { box: 'bg-white border-slate-100 hover:border-blue-100', icon: 'bg-blue-50 text-blue-600', value: 'text-blue-600' },
    green: { box: 'bg-white border-slate-100 hover:border-emerald-100', icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600' },
    red: { box: 'bg-white border-slate-100 hover:border-rose-100', icon: 'bg-rose-50 text-rose-600', value: 'text-rose-600' },
    purple: { box: 'bg-white border-slate-100 hover:border-purple-100', icon: 'bg-purple-50 text-purple-600', value: 'text-purple-600' },
    slate: { box: 'bg-slate-900 border-slate-800 shadow-xl shadow-slate-900/10', icon: 'bg-slate-800 text-slate-300', value: 'text-white' },
  }[tone];

  return (
    <motion.div variants={itemVariants} className={`rounded-[2.5rem] p-7 shadow-sm border flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md ${styles.box}`}>
      <div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${styles.icon}`}>
          {icon}
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-1 text-slate-400">{title}</p>
        <p className={`text-3xl font-black tracking-tighter ${styles.value}`}>{value}</p>
      </div>
      {subtitle && <p className={`text-xs font-bold mt-3 ${tone === 'slate' ? 'text-slate-400' : 'text-slate-400'}`}>{subtitle}</p>}
    </motion.div>
  );
}

export default function ContasPage() {
  const { accounts, loadAll, loading } = useFinancialStore();

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreateModal() {
    setEditingAccount(null);
    setForm(defaultForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingAccount(account);
    setForm({
      name: account.name || '',
      type: account.type,
      initialBalance: String(account.initialBalance ?? 0),
      bank: account.bankCode || '',
      color: account.color || '#3B82F6',
      isActive: account.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingAccount(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        name: form.name.trim(),
        type: form.type,
        initialBalance: normalizeNumber(form.initialBalance),
        bankCode: form.bank.trim() || null,
        color: form.color,
        isActive: form.isActive,
      };

      if (!payload.name) throw new Error('Informe o nome da conta.');

      if (editingAccount?._id) {
        await updateAccount(editingAccount._id, payload);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await createAccount(payload);
        toast.success('Conta criada com sucesso!');
      }

      await loadAll();
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar a conta.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Tem certeza que deseja excluir a conta "${name}"?`)) return;
    try {
      setDeletingId(id);
      await deleteAccount(id);
      await loadAll();
      toast.success('Conta excluída com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir a conta.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(account: Account) {
    try {
      await updateAccount(account._id, { isActive: !account.isActive });
      await loadAll();
      toast.success(account.isActive ? 'Conta inativada' : 'Conta reativada');
    } catch (err) {
      toast.error('Erro ao alterar status.');
    }
  }

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = account.name.toLowerCase().includes(search.toLowerCase()) || (account.bankCode || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' ? true : account.type === typeFilter;
      const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? account.isActive : !account.isActive;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, search, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((item) => item.isActive).length;
    const inactive = total - active;
    const totalBalance = accounts.reduce((acc, item) => acc + Number(item.currentBalance || 0), 0);
    return { total, active, inactive, totalBalance };
  }, [accounts]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-200" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto pb-32">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Financeiro</p>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter">Contas Bancárias</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar conta ou banco..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4.5 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-700"
            />
          </div>
          <button onClick={openCreateModal} className="px-8 py-4.5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all font-black flex items-center gap-3">
            <Plus size={20} strokeWidth={3} /> Nova Conta
          </button>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard title="Saldo Total" value={formatCurrency(summary.totalBalance)} subtitle="Soma de todas as contas" tone="slate" icon={<Wallet size={24} />} />
        <MetricCard title="Total de contas" value={String(summary.total)} subtitle="Contas cadastradas" tone="blue" icon={<Landmark size={24} />} />
        <MetricCard title="Contas ativas" value={String(summary.active)} subtitle="Disponíveis para uso" tone="green" icon={<CheckCircle2 size={24} />} />
        <MetricCard title="Contas inativas" value={String(summary.inactive)} subtitle="Fora de operação" tone="red" icon={<AlertTriangle size={24} />} />
      </div>

      {/* LISTAGEM DE CONTAS */}
      <motion.div variants={itemVariants} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner"><Wallet size={28} strokeWidth={2.5} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">Minhas Contas</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredAccounts.length} conta(s) encontrada(s)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-black text-xs uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer">
              <option value="all">Todos os Tipos</option>
              <option value="checking">Conta Corrente</option>
              <option value="wallet">Carteira</option>
              <option value="cash">Dinheiro</option>
              <option value="savings">Poupança</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-black text-xs uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer">
              <option value="all">Todos os Status</option>
              <option value="active">Apenas Ativas</option>
              <option value="inactive">Apenas Inativas</option>
            </select>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredAccounts.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><Landmark className="text-slate-300" size={48} /></div>
              <h4 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Nenhuma conta encontrada</h4>
              <p className="text-slate-500 font-bold">Ajuste os filtros ou cadastre uma nova conta.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredAccounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                return (
                  <motion.div 
                    key={account._id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all overflow-hidden flex flex-col h-full"
                  >
                    {/* Efeito visual de cor (blur no canto superior) */}
                    <div 
                      className="absolute top-0 right-0 w-40 h-40 blur-[60px] opacity-10 transition-opacity group-hover:opacity-30 pointer-events-none" 
                      style={{ backgroundColor: account.color || '#3B82F6' }} 
                    />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${account.color || '#3B82F6'}15`, color: account.color || '#3B82F6' }}>
                          <Icon size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xl leading-none mb-1.5">{account.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{accountTypeLabels[account.type]} {account.bankCode ? `• ${account.bankCode}` : ''}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(account)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(account._id, account.name)} disabled={deletingId === account._id} className="p-2 text-slate-300 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50 disabled:opacity-50">
                          {deletingId === account._id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-8 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Saldo Atual</p>
                      <p className="text-4xl font-black tracking-tighter text-slate-900">{formatCurrency(account.currentBalance || 0)}</p>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-4 relative z-10 pt-6 border-t border-slate-50">
                      <div className="bg-slate-50/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp size={14} className="text-emerald-500" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Entradas</p>
                        </div>
                        <p className="font-black text-emerald-600 text-sm">{formatCurrency(account.totalIncome || 0)}</p>
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingDown size={14} className="text-rose-500" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Saídas</p>
                        </div>
                        <p className="font-black text-rose-600 text-sm">{formatCurrency(account.totalExpense || 0)}</p>
                      </div>
                    </div>

                    <div className="absolute bottom-8 right-8 z-20">
                      <button 
                        onClick={() => handleToggleStatus(account)} 
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          account.isActive 
                            ? 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50' 
                            : 'bg-white border-rose-100 text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        {account.isActive ? 'Ativa' : 'Inativa'}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">{editingAccount ? 'Editar Conta' : 'Nova Conta'}</h2>
                  <p className="text-slate-500 font-bold text-sm">Configure o saldo inicial e a instituição.</p>
                </div>
                <button onClick={closeModal} className="bg-slate-50 p-3 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Nome da Conta</label>
                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Nubank Principal" className="w-full text-xl font-black p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Tipo de Conta</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })} className="w-full text-base font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 appearance-none text-slate-700 cursor-pointer h-[68px]">
                      <option value="checking">Conta Corrente</option>
                      <option value="wallet">Carteira Digital</option>
                      <option value="cash">Dinheiro Físico</option>
                      <option value="savings">Poupança</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Instituição / Banco</label>
                    <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex.: Itaú, Nu Pagamentos" className="w-full text-base font-bold p-5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 h-[68px]" />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Saldo Inicial (R$)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-blue-400">R$</span>
                      <input type="number" step="0.01" required value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} placeholder="0.00" className="w-full text-4xl font-black text-blue-600 pl-16 p-5 bg-blue-50/50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl flex-1 border border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cor de Identificação</label>
                      <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent ml-auto" />
                    </div>
                    
                    <label className="flex items-center justify-between gap-4 cursor-pointer p-4 bg-slate-50 rounded-2xl flex-1 border border-slate-100 hover:bg-white transition-all">
                      <span className="font-black text-slate-700 text-sm uppercase tracking-widest">Conta Ativa</span>
                      <div className={`h-8 w-14 rounded-full flex items-center px-1 transition-colors ${form.isActive ? 'bg-blue-600 shadow-inner shadow-blue-800/20' : 'bg-slate-200'}`}>
                        <div className={`h-6 w-6 bg-white rounded-full shadow-md transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                    </label>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-4 text-sm font-bold text-rose-600 flex items-center gap-3">
                    <AlertTriangle size={20} /> {formError}
                  </div>
                )}

                <div className="pt-6">
                  <button type="submit" disabled={saving} className="w-full py-5 rounded-[1.5rem] bg-blue-600 text-white font-black text-xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all">
                    {saving ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> {editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta'}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}