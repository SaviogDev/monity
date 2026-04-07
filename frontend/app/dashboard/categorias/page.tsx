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
} from 'lucide-react';

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/services/categories';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const INPUT_CLASS =
  'w-full rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#9B59B6]/40 focus:bg-white focus:ring-4 focus:ring-[#9B59B6]/10';

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

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#9B59B6]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#E74C3C]/10 blur-[100px]" />
    </div>
  );
}

function MetricCard({ title, value, tone, icon }: { title: string; value: string | number; tone: 'blue' | 'green' | 'red'; icon: ReactNode }) {
  const styles = {
    blue: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#3498DB]/10',
    green: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#2ECC71]/10',
    red: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#FF3366]/10',
  }[tone];

  const iconStyles = {
    blue: 'bg-[#3498DB]/10 text-[#3498DB]',
    green: 'bg-[#2ECC71]/10 text-[#2ECC71]',
    red: 'bg-rose-50 text-[#FF3366]',
  }[tone];

  return (
    <motion.div variants={itemVariants} className={`flex flex-col justify-between rounded-[1.75rem] p-6 transition-all hover:-translate-y-1 sm:rounded-[2rem] ${styles}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner ${iconStyles}`}>
        {icon}
      </div>
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {title}
        </p>
        <p className="truncate text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">
          {value}
        </p>
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
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color || '#9B59B6',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;

    setIsModalOpen(false);
    setEditingCategory(null);
    setForm({
      name: '',
      type: 'expense',
      color: '#9B59B6',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast.error('O nome é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingCategory) {
        await updateCategory(editingCategory._id, {
          name,
          type: form.type,
          color: form.color,
        });

        toast.success('Categoria atualizada!');
      } else {
        await createCategory({
          name,
          type: form.type,
          color: form.color,
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
      toast.success('Categoria excluída com sucesso!');
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir. Esta categoria pode estar em uso.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setIsSeeding(true);

      const existingKeys = new Set(
        categories.map((category) => `${category.type}:${category.name.trim().toLowerCase()}`)
      );

      const categoriesToCreate = DEFAULT_CATEGORIES.filter(
        (category) => !existingKeys.has(`${category.type}:${category.name.trim().toLowerCase()}`)
      );

      if (categoriesToCreate.length === 0) {
        toast('Você já possui todas as categorias essenciais.');
        return;
      }

      await Promise.all(categoriesToCreate.map((category) => createCategory(category)));

      toast.success(`${categoriesToCreate.length} categorias essenciais adicionadas!`);
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
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#9B59B6] border-t-transparent shadow-lg shadow-[#9B59B6]/20" />
      </div>
    );
  }

  return (
    <>
      <BackgroundBlobs />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1600px] space-y-6 px-4 pb-32 pt-4 sm:space-y-8 sm:px-6 sm:pt-6 lg:px-10"
      >
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#9B59B6]">
              Painel de Classificação
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl">Categorias</h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">
              Organize a origem e o destino do seu dinheiro com cores personalizadas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-[1.25rem] border-2 border-slate-100 bg-white/50 py-3.5 pl-12 pr-4 font-bold text-[#34495E] outline-none transition-all placeholder:text-slate-400 focus:border-[#9B59B6]/40 focus:bg-white focus:ring-4 focus:ring-[#9B59B6]/10"
              />
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-tr from-[#9B59B6] to-[#8E44AD] px-6 py-3.5 font-black text-white shadow-lg shadow-[#9B59B6]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#9B59B6]/40 active:translate-y-0 active:scale-[0.98] sm:w-auto"
            >
              <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" /> Nova Categoria
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
          <MetricCard title="Total Cadastradas" value={stats.total} tone="blue" icon={<Tags size={24} />} />
          <MetricCard title="Categorias de Receita" value={stats.income} tone="green" icon={<TrendingUp size={24} />} />
          <MetricCard title="Categorias de Despesa" value={stats.expense} tone="red" icon={<TrendingDown size={24} />} />
        </div>

        {/* LISTAGEM DE CATEGORIAS */}
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]"
        >
          <div className="flex flex-col gap-4 border-b border-slate-100/50 bg-white/40 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9B59B6]/10 text-[#9B59B6] shadow-inner">
                <Tags size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#34495E]">
                  Minhas Categorias
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  {filteredCategories.length} registradas
                </p>
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
              className="cursor-pointer appearance-none rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm outline-none transition-all hover:bg-white focus:border-[#9B59B6]/40 focus:ring-4 focus:ring-[#9B59B6]/10"
            >
              <option value="all">Todas as Categorias</option>
              <option value="income">Apenas Receitas</option>
              <option value="expense">Apenas Despesas</option>
            </select>
          </div>

          <div className="p-6 sm:p-8">
            {categories.length === 0 && !searchTerm ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                  <Sparkles className="text-[#3498DB]" size={40} />
                </div>
                <h4 className="mb-2 text-2xl font-black tracking-tighter text-[#34495E]">Painel em branco!</h4>
                <p className="mx-auto mb-8 max-w-md text-sm font-bold text-slate-500">
                  Notamos que você ainda não tem categorias. Para facilitar, podemos gerar uma lista
                  com as categorias essenciais do dia a dia.
                </p>
                <button
                  onClick={handleSeedDefaults}
                  disabled={isSeeding}
                  className="flex items-center gap-3 rounded-[1.25rem] bg-[#34495E] px-8 py-4 font-black text-white shadow-xl shadow-[#34495E]/20 transition-all hover:-translate-y-0.5 hover:bg-[#2C3E50] disabled:opacity-50"
                >
                  {isSeeding ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Gerar Categorias Essenciais
                    </>
                  )}
                </button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <Tags className="mb-4 text-slate-300" size={52} />
                <h4 className="text-xl font-black tracking-tight text-[#34495E]">Nenhuma categoria encontrada.</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
                <AnimatePresence>
                  {filteredCategories.map((category) => {
                    const catColor = category.color || '#9B59B6';
                    return (
                      <motion.div
                        key={category._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                      >
                        {/* Efeito luminoso do cartão */}
                        <div
                          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                          style={{ backgroundColor: catColor }}
                        />

                        <div className="relative z-10 mb-5 flex items-start justify-between">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-[1rem] shadow-sm"
                            style={{
                              backgroundColor: `${catColor}15`,
                              color: catColor,
                            }}
                          >
                            {category.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                            <button onClick={() => openEditModal(category)} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-100 hover:text-[#3498DB]">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ id: category._id, name: category.name })} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-[#FF3366]">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="relative z-10 flex-1">
                          <h4 className="mb-1 truncate text-lg font-black tracking-tight text-[#34495E] sm:text-xl">
                            {category.name}
                          </h4>
                          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catColor }} />
                            Cor Customizada
                          </p>
                        </div>
                        
                        <div className="relative z-10 mt-4 border-t border-slate-100/50 pt-4">
                          <span
                            className={`inline-block rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                              category.type === 'income'
                                ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
                                : 'bg-[#FF3366]/10 text-[#FF3366]'
                            }`}
                          >
                            {category.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              />

              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#9B59B6]">
                      Organização
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-[#34495E]">
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                  </div>

                  <button
                    onClick={closeModal}
                    className="rounded-full bg-slate-100 p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex rounded-[1.25rem] bg-slate-100/80 p-1.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, type: 'expense' }))}
                      className={`flex-1 rounded-xl py-3 text-xs font-black transition-all ${
                        form.type === 'expense'
                          ? 'bg-white text-[#FF3366] shadow-md'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, type: 'income' }))}
                      className={`flex-1 rounded-xl py-3 text-xs font-black transition-all ${
                        form.type === 'income'
                          ? 'bg-white text-[#2ECC71] shadow-md'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Receita
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Nome da Categoria
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Ex: Alimentação, Salário..."
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Cor de Identificação
                    </label>
                    <div className="flex items-center gap-4 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/50 p-4 transition-all focus-within:border-[#9B59B6]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#9B59B6]/10">
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, color: e.target.value }))
                        }
                        className="h-10 w-12 cursor-pointer rounded-lg border-none bg-transparent p-0 outline-none"
                      />
                      <span className="text-sm font-bold text-[#34495E]">{form.color}</span>
                    </div>
                  </div>

                  {/* PREVIEW CARD DA COR */}
                  <div
                    className="relative mt-2 overflow-hidden rounded-[1.5rem] p-6 shadow-lg transition-colors"
                    style={{ backgroundColor: form.color || '#9B59B6' }}
                  >
                    <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl" />

                    <div className="relative z-10 text-white">
                      <div className="mb-4 flex items-center justify-between">
                        {form.type === 'income' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}

                        <span className="rounded-lg bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                          {form.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>

                      <p className="truncate text-2xl font-black tracking-tight shadow-black/5 text-shadow-sm">
                        {form.name.trim() || 'Nova Categoria'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] bg-gradient-to-tr from-[#9B59B6] to-[#8E44AD] py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#9B59B6]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#9B59B6]/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin relative z-10" size={20} />
                        <span className="relative z-10">Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} className="relative z-10" />
                        <span className="relative z-10">{editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}</span>
                      </>
                    )}
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
                  Excluir categoria?
                </h3>
                <p className="mb-2 text-sm font-black text-[#34495E]">{deleteConfirm.name}</p>
                <p className="mb-8 text-xs font-bold leading-relaxed text-slate-400">
                  Tem certeza? Esta categoria não estará mais disponível para novos lançamentos.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center rounded-[1.25rem] bg-[#FF3366] py-4 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all hover:bg-[#e62e5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir categoria'}
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