'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
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
  TrendingDown,
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
  color: '#3498DB',
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
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 26 } }
};

const INPUT_CLASS =
  'w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10';

const SELECT_CLASS =
  'w-full appearance-none rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10';

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#2ECC71]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#9B59B6]/10 blur-[100px]" />
    </div>
  );
}

function MetricCard({ title, value, tone, icon }: { title: string; value: string; tone: 'blue' | 'green' | 'red' | 'dark'; icon: ReactNode }) {
  const styles = {
    blue: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#3498DB]/10',
    green: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#2ECC71]/10',
    red: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#FF3366]/10',
    dark: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50] text-white shadow-xl shadow-[#34495E]/30 border-none',
  }[tone];

  const iconStyles = {
    blue: 'bg-[#3498DB]/10 text-[#3498DB]',
    green: 'bg-[#2ECC71]/10 text-[#2ECC71]',
    red: 'bg-rose-50 text-[#FF3366]',
    dark: 'bg-white/10 text-white backdrop-blur-md',
  }[tone];

  const textStyles = tone === 'dark' ? 'text-white' : 'text-[#34495E]';
  const labelStyles = tone === 'dark' ? 'text-white/70' : 'text-slate-400';

  return (
    <motion.div variants={itemVariants} className={`flex flex-col justify-between rounded-[1.75rem] p-6 transition-all hover:-translate-y-1 sm:rounded-[2rem] relative overflow-hidden ${styles}`}>
      {tone === 'dark' && <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />}
      <div className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner ${iconStyles}`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.24em] ${labelStyles}`}>
          {title}
        </p>
        <p className={`truncate text-2xl font-black tracking-tighter sm:text-3xl ${textStyles}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

export default function ContasPage() {
  const { accounts, loadAll, loading } = useFinancialStore();

  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

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
      color: account.color || '#3498DB',
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar a conta.';
      setFormError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm?.id) return;
    try {
      setIsDeleting(true);
      await deleteAccount(deleteConfirm.id);
      await loadAll();
      toast.success('Conta excluída com sucesso!');
      setDeleteConfirm(null);
    } catch (err: unknown) {
      toast.error('Erro ao excluir a conta.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleStatus(account: Account) {
    try {
      await updateAccount(account._id, { isActive: !account.isActive });
      await loadAll();
      toast.success(account.isActive ? 'Conta inativada' : 'Conta reativada');
    } catch (err) {
      toast.error('Erro ao alterar status da conta.');
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#3498DB] border-t-transparent shadow-lg shadow-[#3498DB]/20" />
      </div>
    );
  }

  return (
    <>
      <BackgroundBlobs />
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-[1600px] space-y-6 px-4 pb-32 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-10">
        
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">
              Controle de saldos
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">Contas Bancárias</h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">Gerencie onde o seu dinheiro está guardado e alocado.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Buscar conta..." 
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-white/50 py-3.5 pl-12 pr-4 font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#3498DB]/40 focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10"
              />
            </div>
            <button onClick={openCreateModal} className="inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] px-6 py-3.5 font-black text-white shadow-lg shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] sm:w-auto">
              <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" /> Nova Conta
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard title="Saldo Total" value={formatCurrency(summary.totalBalance)} tone="dark" icon={<Wallet size={24} />} />
          <MetricCard title="Total de contas" value={String(summary.total)} tone="blue" icon={<Landmark size={24} />} />
          <MetricCard title="Contas ativas" value={String(summary.active)} tone="green" icon={<CheckCircle2 size={24} />} />
          <MetricCard title="Contas inativas" value={String(summary.inactive)} tone="red" icon={<AlertTriangle size={24} />} />
        </div>

        {/* LISTAGEM DE CONTAS */}
        <motion.div variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
          <div className="flex flex-col gap-4 border-b border-slate-100/50 bg-white/40 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB] shadow-inner">
                <Landmark size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#34495E]">Minhas carteiras</h3>
                <p className="mt-1 text-sm font-bold text-slate-400">{filteredAccounts.length} conta(s) listada(s)</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={typeFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value as 'all' | AccountType)} className="cursor-pointer appearance-none rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm outline-none transition-all hover:bg-white focus:border-[#3498DB]/40 focus:ring-4 focus:ring-[#3498DB]/10">
                <option value="all">Todos os Tipos</option>
                <option value="checking">Conta Corrente</option>
                <option value="wallet">Carteira</option>
                <option value="cash">Dinheiro</option>
                <option value="savings">Poupança</option>
              </select>
              <select value={statusFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className="cursor-pointer appearance-none rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm outline-none transition-all hover:bg-white focus:border-[#3498DB]/40 focus:ring-4 focus:ring-[#3498DB]/10">
                <option value="all">Todos os Status</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {filteredAccounts.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Landmark className="mb-4 text-slate-300" size={52} />
                <h4 className="text-xl font-black tracking-tight text-[#34495E]">Nenhuma conta encontrada.</h4>
                <p className="mt-2 text-sm font-bold text-slate-400">Ajuste os filtros ou cadastre uma nova conta.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredAccounts.map((account) => {
                    const Icon = getAccountIcon(account.type);
                    const accColor = account.color || '#3498DB';

                    return (
                      <motion.div 
                        key={account._id} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl sm:p-7"
                      >
                        {/* Efeito luminoso do cartão */}
                        <div 
                          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40" 
                          style={{ backgroundColor: accColor }} 
                        />
                        
                        <div className="relative z-10 mb-6 flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] shadow-sm" style={{ backgroundColor: `${accColor}15`, color: accColor }}>
                              <Icon size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                              <h4 className="text-lg font-black tracking-tight text-[#34495E]">{account.name}</h4>
                              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{accountTypeLabels[account.type]} {account.bankCode ? `• ${account.bankCode}` : ''}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                            <button onClick={() => openEditModal(account)} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-[#3498DB]/10 hover:text-[#3498DB]">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ id: account._id, name: account.name })} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-[#FF3366]">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="relative z-10 mb-6">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Saldo Atual</p>
                          <p className="text-3xl font-black tracking-tighter text-[#34495E]">{formatCurrency(account.currentBalance || 0)}</p>
                        </div>

                        <div className="relative z-10 mt-auto grid grid-cols-2 gap-3 border-t border-slate-100/50 pt-5">
                          <div className="rounded-xl bg-slate-50/50 p-3">
                            <div className="mb-1 flex items-center gap-1.5">
                              <TrendingUp size={12} className="text-[#2ECC71]" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entradas</p>
                            </div>
                            <p className="text-sm font-black text-[#2ECC71]">{formatCurrency(account.totalIncome || 0)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50/50 p-3">
                            <div className="mb-1 flex items-center gap-1.5">
                              <TrendingDown size={12} className="text-[#FF3366]" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saídas</p>
                            </div>
                            <p className="text-sm font-black text-[#FF3366]">{formatCurrency(account.totalExpense || 0)}</p>
                          </div>
                        </div>

                        <div className="absolute bottom-6 right-6 z-20 sm:bottom-7 sm:right-7">
                          <button 
                            onClick={() => handleToggleStatus(account)} 
                            className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                              account.isActive 
                                ? 'border-[#2ECC71]/20 bg-[#2ECC71]/10 text-[#2ECC71] hover:bg-[#2ECC71]/20' 
                                : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {account.isActive ? 'Ativa' : 'Inativa'}
                          </button>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
              <motion.div 
                initial={{ y: '100%', opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">Carteira</p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">{editingAccount ? 'Editar Conta' : 'Nova Conta'}</h2>
                  </div>
                  <button onClick={closeModal} className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"><X size={20} strokeWidth={2.5} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Nome da Conta</label>
                      <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Nubank Principal" className={INPUT_CLASS} />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Tipo de Conta</label>
                      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })} className={SELECT_CLASS}>
                        <option value="checking">Conta Corrente</option>
                        <option value="wallet">Carteira Digital</option>
                        <option value="cash">Dinheiro Físico</option>
                        <option value="savings">Poupança</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Instituição / Banco (Opcional)</label>
                      <input type="text" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex.: Itaú, Nu Pagamentos" className={INPUT_CLASS} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Saldo Inicial</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-[#3498DB]">R$</span>
                        <input type="number" step="0.01" required value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} placeholder="0.00" className="w-full rounded-[1.25rem] border-2 border-[#3498DB]/30 bg-[#3498DB]/5 p-4 pl-14 text-3xl font-black tracking-tighter text-[#3498DB] outline-none transition-all placeholder:text-[#3498DB]/50 focus:border-[#3498DB] focus:bg-white focus:ring-4 focus:ring-[#3498DB]/10" />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm mt-2">
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cor de Identificação</label>
                        <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border-none bg-transparent p-0 outline-none" />
                      </div>
                      
                      <div className="hidden h-8 w-px bg-slate-100 sm:block" />
                      
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status da Conta</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isActive: !form.isActive })}
                          className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-all ${
                            form.isActive ? 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60] shadow-inner' : 'bg-slate-200 shadow-inner'
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-3 rounded-[1.25rem] bg-rose-50 p-4 text-sm font-bold text-[#FF3366]">
                      <AlertTriangle size={18} className="shrink-0" />
                      {formError}
                    </div>
                  )}

                  <button type="submit" disabled={saving} className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#3498DB] to-[#2980b9] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#3498DB]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#3498DB]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {saving ? <Loader2 className="animate-spin relative z-10" size={20} /> : <><CheckCircle2 size={20} className="relative z-10" /><span className="relative z-10">{editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta'}</span></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        <AnimatePresence>
          {deleteConfirm ? (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 text-center shadow-2xl"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#FF3366]">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="mb-2 text-xl font-black tracking-tighter text-[#34495E]">
                  Excluir conta?
                </h3>
                <p className="mb-2 text-sm font-black text-[#34495E]">{deleteConfirm.name}</p>
                <p className="mb-8 text-xs font-bold leading-relaxed text-slate-400">
                  Tem certeza? Esta ação removerá a conta. As transações vinculadas a ela podem ficar órfãs.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-[1.25rem] bg-[#FF3366] py-4 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all hover:bg-[#e62e5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir conta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="w-full rounded-[1.25rem] bg-slate-100 py-4 font-bold text-slate-500 transition-all hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

      </motion.div>
    </>
  );
}