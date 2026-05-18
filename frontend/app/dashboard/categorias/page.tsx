'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronDown,
  Filter,
} from 'lucide-react';

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/services/categories';

// --- CONSTANTS ---
const DEFAULT_CATEGORIES = [
  { name: 'Salário', type: 'income' as const, color: '#2ECC71' },
  { name: 'Investimentos', type: 'income' as const, color: '#3498DB' },
  { name: 'Vendas', type: 'income' as const, color: '#9B59B6' },
  { name: 'Moradia', type: 'expense' as const, color: '#34495E' },
  { name: 'Alimentação', type: 'expense' as const, color: '#E74C3C' },
  { name: 'Transporte', type: 'expense' as const, color: '#F1C40F' },
  { name: 'Saúde', type: 'expense' as const, color: '#1ABC9C' },
  { name: 'Educação', type: 'expense' as const, color: '#2980B9' },
  { name: 'Lazer', type: 'expense' as const, color: '#E67E22' },
  { name: 'Assinaturas', type: 'expense' as const, color: '#8E44AD' },
  { name: 'Cartão de Crédito', type: 'expense' as const, color: '#D35400' },
];

// --- ANIMATION VARIANTS ---
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
};

// --- DESIGN DECORATIONS ---
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
  value: string | number;
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#9B59B6',
    parent: '' as string,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || cat.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories, searchTerm, typeFilter]);

  const stats = useMemo(() => {
    const income = categories.filter((c) => c.type === 'income').length;
    const expense = categories.filter((c) => c.type === 'expense').length;

    return {
      total: categories.length,
      income,
      expense,
    };
  }, [categories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      type: 'expense',
      color: '#9B59B6',
      parent: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color || '#9B59B6',
      parent: typeof category.parent === 'object' ? category.parent?._id : (category.parent || ''),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error('O nome é obrigatório.'); return; }

    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await updateCategory(editingCategory._id, {
          name,
          type: form.type,
          color: form.color,
          parent: form.parent || null,
        });
        toast.success('Categoria atualizada!');
      } else {
        await createCategory({
          name,
          type: form.type,
          color: form.color,
          parent: form.parent || null,
        });
        toast.success('Categoria criada!');
      }
      closeModal();
      await loadData();
    } catch (error) {
      toast.error('Erro ao salvar categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm?.id) return;
    try {
      setIsDeleting(true);
      await deleteCategory(deleteConfirm.id);
      toast.success('Categoria excluída!');
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir categoria.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setIsSeeding(true);
      const existingKeys = new Set(categories.map((c) => `${c.type}:${c.name.trim().toLowerCase()}`));
      const categoriesToCreate = DEFAULT_CATEGORIES.filter((c) => !existingKeys.has(`${c.type}:${c.name.trim().toLowerCase()}`));
      if (categoriesToCreate.length === 0) { toast('Você já possui todas as categorias essenciais.'); return; }
      await Promise.all(categoriesToCreate.map((c) => createCategory(c)));
      toast.success(`${categoriesToCreate.length} categorias adicionadas!`);
      await loadData();
    } catch (error) {
      toast.error('Erro ao gerar categorias.');
    } finally {
      setIsSeeding(false);
    }
  };

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
        {/* HEADER */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <Tags size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Label System</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Categorias</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Organize a origem e o destino do seu dinheiro.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar categoria..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-base)] px-12 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:border-[var(--monity-green)]/50"
              />
            </div>
            <button 
              onClick={openCreateModal} 
              className="flex h-[3.5rem] w-full sm:w-auto items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] px-8 font-black uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,230,130,0.3)] active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              Nova Categoria
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Total" value={stats.total} subtitle="Categorias cadastradas" icon={Tags} color="blue" />
          <MetricCard title="Receitas" value={stats.income} subtitle="Categorias de entrada" icon={TrendingUp} color="green" />
          <MetricCard title="Despesas" value={stats.expense} subtitle="Categorias de saída" icon={TrendingDown} color="red" />
        </div>

        {/* LISTAGEM CONTROLES */}
        <motion.div variants={itemV} className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/30 p-4 sm:flex-row sm:items-center sm:justify-between px-6">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-[var(--monity-green)] shadow-[0_0_10px_rgba(0,230,130,0.5)]" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               {filteredCategories.length} categoria(s) filtrada(s)
             </span>
          </div>

          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')} 
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none transition-all hover:border-[var(--monity-green)]/30 cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            <option value="income">Apenas Receitas</option>
            <option value="expense">Apenas Despesas</option>
          </select>
        </motion.div>

        {/* GRID DE CATEGORIAS */}
        {categories.length === 0 && !searchTerm ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center p-10">
            <Sparkles className="h-16 w-16 text-slate-800 mb-6" strokeWidth={1.5} />
            <h4 className="text-2xl font-black tracking-tight text-white">Seu painel está vazio</h4>
            <p className="mt-2 text-slate-500 font-medium max-w-sm mx-auto">Comece gerando as categorias essenciais ou crie as suas personalizadas.</p>
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="mt-8 flex items-center gap-3 rounded-[1.25rem] bg-white/5 border border-white/5 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> Gerar Categorias Essenciais</>}
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]/30 text-center p-10">
            <Tags className="h-16 w-16 text-slate-800 mb-6" strokeWidth={1.5} />
            <h4 className="text-2xl font-black tracking-tight text-white">Nenhuma categoria encontrada</h4>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCategories.map((category) => {
                const catColor = category.color || 'var(--monity-green)';
                return (
                  <motion.div
                    key={category._id}
                    layout
                    variants={itemV}
                    className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-accent)] hover:bg-[var(--bg-card-hover)]"
                  >
                    {/* Glowing Accent */}
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px] opacity-[0.03] transition-opacity group-hover:opacity-[0.1]" style={{ backgroundColor: catColor }} />

                    <div className="relative z-10 mb-6 flex items-start justify-between">
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner transition-all group-hover:scale-110" 
                        style={{ backgroundColor: `${catColor}15`, color: catColor }}
                      >
                        {category.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditModal(category)} className="rounded-xl bg-white/5 p-2.5 text-slate-500 transition-all hover:text-white">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ id: category._id, name: category.name })} className="rounded-xl bg-rose-500/5 p-2.5 text-slate-600 transition-all hover:bg-rose-500 hover:text-white">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 flex-1">
                      <h4 className="text-xl font-black tracking-tighter text-white group-hover:text-[var(--monity-green)] transition-colors truncate">
                        {category.name}
                      </h4>
                      <p className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                        {catColor}
                      </p>
                      {category.parent && (
                        <p className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span className="text-slate-700">Sub de:</span>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-400">
                            {typeof category.parent === 'object' ? category.parent.name : '...'}
                          </span>
                        </p>
                      )}
                    </div>
                    
                    <div className="relative z-10 mt-6 pt-5 border-t border-white/[0.05]">
                      <span className={`inline-block rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
                        category.type === 'income' ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {category.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* MODAL: CADASTRO/EDIÇÃO */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl custom-scrollbar"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Label Config</p>
                    <h2 className="text-3xl font-syne font-black tracking-tighter text-white">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                  </div>
                  <button onClick={closeModal} className="rounded-2xl bg-white/5 p-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex rounded-2xl bg-[var(--bg-base)] p-1.5 border border-[var(--border)] shadow-inner">
                    <button
                      type="button" onClick={() => setForm(p => ({ ...p, type: 'expense' }))}
                      className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button" onClick={() => setForm(p => ({ ...p, type: 'income' }))}
                      className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'income' ? 'bg-[var(--monity-green)] text-black shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      Receita
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome da Categoria</label>
                    <input
                      type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Alimentação, Lazer..."
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identidade Visual (Cor)</label>
                    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
                      <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-16 cursor-pointer rounded-lg border-none bg-transparent p-0 outline-none" />
                      <span className="text-sm font-mono font-bold text-slate-400 uppercase">{form.color}</span>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria Pai (Opcional)</label>
                    <select
                      value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))}
                      className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-6 py-5 text-sm font-bold text-white outline-none focus:border-[var(--monity-green)]/30 transition-all cursor-pointer"
                    >
                      <option value="">Nenhuma (Categoria Principal)</option>
                      {categories.filter(c => c.type === form.type && !c.parent && c._id !== editingCategory?._id).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-[3.2rem] text-slate-700 pointer-events-none group-focus-within:text-[var(--monity-green)] transition-colors" size={18} />
                  </div>

                  <button
                    type="submit" disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[var(--monity-green)] py-6 text-sm font-black uppercase tracking-widest text-black shadow-[0_10px_30px_rgba(0,230,130,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: EXCLUSÃO */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="relative w-full max-w-md rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center shadow-2xl"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertTriangle size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-syne font-black text-white">Excluir Categoria?</h3>
                <p className="mt-2 text-sm font-bold text-slate-100">{deleteConfirm.name}</p>
                <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Esta ação é irreversível. Lançamentos existentes com esta categoria permanecerão, mas ela não estará disponível para novos registros.</p>
                <div className="mt-10 space-y-3">
                  <button onClick={handleDeleteConfirm} disabled={isDeleting} className="w-full rounded-2xl bg-rose-500 py-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-rose-600 active:scale-[0.98]">
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Exclusão'}
                  </button>
                  <button onClick={() => setDeleteConfirm(null)} className="w-full rounded-2xl bg-white/5 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Cancelar</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}