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
  TrendingDown,
  Activity,
  CreditCard,
  Target
} from 'lucide-react';

import { createAccount, updateAccount, deleteAccount } from '@/services/accounts';
import { useFinancialStore } from '@/stores/financial-store';

// --- TYPES ---
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
  color: '#00e682',
  isActive: true,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  wallet: 'Carteira',
  cash: 'Dinheiro Físico',
  savings: 'Poupança',
};

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
      color: account.color || '#00e682',
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
        toast.success('Conta atualizada!');
      } else {
        await createAccount(payload);
        toast.success('Conta criada!');
      }
      await loadAll();
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar a conta.');
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
      toast.success('Conta excluída!');
      setDeleteConfirm(null);
    } catch (err: any) {
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
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <Landmark size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Capital Management</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Contas Bancárias</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Onde o seu dinheiro está alocado e guardado.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar conta..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-base)] px-12 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:border-[var(--monity-green)]/50"
              />
            </div>
            <button 
              onClick={openCreateModal} 
              className="flex h-[3.5rem] w-full sm:w-auto items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              Nova Conta
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Saldo Total"
            value={formatCurrency(summary.totalBalance)}
            subtitle="Soma de todos os saldos"
            icon={Wallet}
            color="green"
          />
          <MetricCard
            title="Instituições"
            value={String(summary.total)}
            subtitle="Total de contas cadastradas"
            icon={Landmark}
            color="blue"
          />
          <MetricCard
            title="Ativas"
            value={String(summary.active)}
            subtitle="Contas em uso regular"
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Inativas"
            value={String(summary.inactive)}
            subtitle="Contas pausadas ou encerradas"
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* CONTROLES DE FILTRO */}
        <motion.div variants={itemV} className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/30 p-4 sm:flex-row sm:items-center sm:justify-between px-6">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-[var(--monity-green)] shadow-[0_0_10px_rgba(0,230,130,0.5)]" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               {filteredAccounts.length} conta(s) filtrada(s)
             </span>
          </div>

          <div className="flex gap-3">
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value as 'all' | AccountType)} 
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none transition-all hover:border-[var(--monity-green)]/30 cursor-pointer"
            >
              <option value="all">Todos os Tipos</option>
              <option value="checking">Conta Corrente</option>
              <option value="wallet">Carteira</option>
              <option value="cash">Dinheiro</option>
              <option value="savings">Poupança</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} 
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none transition-all hover:border-[var(--monity-green)]/30 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </div>
        </motion.div>

        {/* LISTAGEM */}
        {filteredAccounts.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center p-10">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 text-slate-700">
              <Landmark size={48} strokeWidth={1.5} />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-white">Nenhuma conta encontrada</h4>
            <p className="mt-2 text-slate-500 font-medium max-w-sm">Tente ajustar seus filtros ou crie uma nova conta bancária.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAccounts.map((account) => {
                const Icon = getAccountIcon(account.type);
                const accColor = account.color || 'var(--monity-green)';

                return (
                  <motion.div 
                    key={account._id} 
                    layout
                    variants={itemV}
                    className={`group relative flex flex-col h-full overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] p-8 transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)] ${!account.isActive ? 'opacity-60' : ''}`}
                  >
                    {/* Glowing Accent */}
                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-[80px] opacity-[0.03] transition-opacity group-hover:opacity-[0.08]" style={{ backgroundColor: accColor }} />
                    
                    <div className="relative z-10 mb-10 flex items-start justify-between">
                      <div className="flex items-center gap-5">
                        <div 
                          className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-all group-hover:scale-110" 
                          style={{ backgroundColor: `${accColor}10`, color: accColor }}
                        >
                          <Icon size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black tracking-tighter text-white group-hover:text-[var(--monity-green)] transition-colors">{account.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{accountTypeLabels[account.type]}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditModal(account)} className="rounded-xl bg-white/[0.03] p-2.5 text-slate-500 transition-all hover:bg-white/[0.08] hover:text-white">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ id: account._id, name: account.name })} className="rounded-xl bg-rose-500/5 p-2.5 text-slate-600 transition-all hover:bg-rose-500 hover:text-white">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 mb-10">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saldo Disponível</p>
                      <p className="text-4xl font-black tracking-tighter text-white leading-none">{formatCurrency(account.currentBalance || 0)}</p>
                    </div>

                    <div className="relative z-10 mt-auto grid grid-cols-2 gap-4 pt-8 border-t border-white/[0.05]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={12} className="text-[var(--monity-green)]" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Receitas</p>
                        </div>
                        <p className="text-sm font-black text-[var(--monity-green)]">{formatCurrency(account.totalIncome || 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingDown size={12} className="text-rose-500" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Despesas</p>
                        </div>
                        <p className="text-sm font-black text-rose-500">{formatCurrency(account.totalExpense || 0)}</p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-8 flex items-center justify-between">
                      <button 
                        onClick={() => handleToggleStatus(account)} 
                        className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                          account.isActive 
                            ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)] border border-[var(--monity-green)]/10' 
                            : 'bg-white/5 text-slate-600 border border-white/5'
                        }`}
                      >
                        {account.isActive ? 'Ativa' : 'Inativa'}
                      </button>
                      <div className="h-2 w-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: accColor }} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Modal: Cadastro/Edição */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl sm:p-12 custom-scrollbar"
              >
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--monity-green)]">Capital Source</p>
                    <h2 className="font-syne text-4xl font-black tracking-tighter text-white">{editingAccount ? 'Editar Conta' : 'Nova Conta'}</h2>
                  </div>
                  <button onClick={closeModal} className="rounded-2xl bg-white/5 p-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identificação da Conta</label>
                      <input 
                        type="text" required value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })} 
                        placeholder="Ex.: Nubank Principal, Santander Invest" 
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all" 
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Categoria de Conta</label>
                      <select 
                        value={form.type} 
                        onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })} 
                        className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all cursor-pointer"
                      >
                        <option value="checking">Conta Corrente</option>
                        <option value="wallet">Carteira Digital</option>
                        <option value="cash">Dinheiro Físico</option>
                        <option value="savings">Poupança</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Instituição Financeira</label>
                      <input 
                        type="text" value={form.bank} 
                        onChange={(e) => setForm({ ...form, bank: e.target.value })} 
                        placeholder="Ex.: Itaú, XP" 
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all" 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Capital Inicial</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-syne text-2xl font-black text-[var(--monity-green)]">R$</span>
                        <input 
                          type="number" step="0.01" required value={form.initialBalance} 
                          onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} 
                          placeholder="0,00" 
                          className="w-full rounded-[2rem] border border-[var(--monity-green)]/10 bg-[var(--monity-green)]/5 p-10 pl-16 font-syne text-5xl font-black tracking-tighter text-[var(--monity-green)] outline-none placeholder:text-[var(--monity-green)]/10" 
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--bg-base)] p-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visual Identity</label>
                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Cor de identificação no dashboard</p>
                      </div>
                      <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-12 w-20 cursor-pointer rounded-xl border-none bg-transparent p-0 outline-none" />
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-xs font-bold text-rose-500">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span className="uppercase tracking-widest">{formError}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] py-6 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={24} /> : <>{editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta'}</>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Exclusão */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center shadow-2xl"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertTriangle size={48} strokeWidth={1.5} />
                </div>
                <h3 className="font-syne text-3xl font-black tracking-tighter text-white mb-2">Excluir Conta?</h3>
                <p className="mb-10 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Esta ação é irreversível. O saldo e as transações vinculadas à <span className="text-rose-500">{deleteConfirm.name}</span> serão afetados.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-2xl bg-rose-500 py-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600 active:scale-[0.98]"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="w-full rounded-2xl bg-white/5 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:text-white"
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