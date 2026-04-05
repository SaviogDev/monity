'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/services/categories';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#3498DB',
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
      color: '#3498DB',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color || '#3498DB',
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
      color: '#3498DB',
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Deseja excluir esta categoria? Ela não estará mais disponível para novos lançamentos.'
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteCategory(id);
      toast.success('Categoria excluída!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir. Esta categoria pode estar em uso.');
    } finally {
      setDeletingId(null);
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
      <div className="flex min-h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#3498DB] border-t-transparent shadow-lg shadow-[#3498DB]/20" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-6 p-4 pb-32 lg:space-y-8 lg:p-8"
    >
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <h1 className="tracking-tighte text-4xl font-black text-slate-800">Categorias</h1>
          <p className="text-lg font-medium text-slate-500">
            Organize a origem e o destino do seu dinheiro
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-[#3498DB]/10"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-[#3498DB] p-4 font-bold text-white shadow-lg shadow-[#3498DB]/20 transition-all hover:bg-[#2980B9]"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Nova Categoria</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        <motion.div
          variants={itemVariants}
          className="flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Tags size={24} />
          </div>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Total Cadastradas
            </p>
            <p className="text-3xl font-black tracking-tighter text-blue-600">{stats.total}</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Categorias de Receita
            </p>
            <p className="text-3xl font-black tracking-tighter text-emerald-600">
              {stats.income}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Categorias de Despesa
            </p>
            <p className="text-3xl font-black tracking-tighter text-rose-600">{stats.expense}</p>
          </div>
        </motion.div>
      </div>

      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-slate-50 bg-slate-50/50 p-6 md:flex-row md:items-center lg:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] text-white shadow-lg">
              <Tags size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-slate-800 sm:text-2xl">
                Minhas Categorias
              </h3>
              <p className="text-sm font-medium text-slate-500">
                {filteredCategories.length} registradas
              </p>
            </div>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
            className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-[#3498DB]/10"
          >
            <option value="all">Todas as Categorias</option>
            <option value="income">Apenas Receitas</option>
            <option value="expense">Apenas Despesas</option>
          </select>
        </div>

        <div className="p-6 lg:p-8">
          {categories.length === 0 && !searchTerm ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                <Sparkles className="text-blue-400" size={40} />
              </div>

              <h4 className="mb-2 text-2xl font-black text-slate-800">Painel em branco!</h4>

              <p className="mx-auto mb-8 max-w-md font-medium text-slate-500">
                Notamos que você ainda não tem categorias. Para facilitar, podemos gerar uma lista
                com as categorias essenciais do dia a dia.
              </p>

              <button
                onClick={handleSeedDefaults}
                disabled={isSeeding}
                className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 font-black text-white shadow-xl transition-all hover:bg-slate-800 disabled:opacity-50"
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
            <div className="py-12 text-center font-bold text-slate-400">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCategories.map((category) => (
                <motion.div
                  key={category._id}
                  variants={itemVariants}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-xl sm:p-6"
                >
                  <div
                    className="absolute left-0 top-0 h-1.5 w-full"
                    style={{ backgroundColor: category.color || '#cbd5e1' }}
                  />

                  <div className="mb-4 mt-2 flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
                      style={{
                        backgroundColor: `${category.color || '#3498DB'}15`,
                        color: category.color || '#3498DB',
                      }}
                    >
                      {category.type === 'income' ? (
                        <TrendingUp size={24} />
                      ) : (
                        <TrendingDown size={24} />
                      )}
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest sm:text-[10px] ${
                        category.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {category.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h4 className="mb-1 truncate text-lg font-black text-slate-800 sm:text-xl">
                      {category.name}
                    </h4>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color || '#3498DB' }}
                      />
                      Cor Customizada
                    </p>
                  </div>

                  <div className="absolute bottom-5 right-5 flex gap-2 rounded-l-xl bg-white/90 py-1 pl-4 opacity-100 backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => openEditModal(category)}
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(category._id)}
                      disabled={deletingId === category._id}
                      className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors hover:text-rose-500 disabled:opacity-50"
                    >
                      {deletingId === category._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tighter text-slate-800 sm:text-3xl">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>

                <button
                  onClick={closeModal}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, type: 'expense' }))}
                    className={`flex-1 rounded-xl py-4 font-black transition-all ${
                      form.type === 'expense'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    🔴 Despesa
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, type: 'income' }))}
                    className={`flex-1 rounded-xl py-4 font-black transition-all ${
                      form.type === 'income'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    🟢 Receita
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ex: Alimentação, Salário..."
                    className="w-full rounded-2xl border-none bg-slate-50 p-5 text-xl font-bold outline-none transition-all focus:ring-4 focus:ring-[#3498DB]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Cor de Identificação
                  </label>
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="h-12 w-12 cursor-pointer rounded-xl border-none bg-transparent"
                    />
                    <span className="font-bold text-slate-700">{form.color}</span>
                  </div>
                </div>

                <div
                  className="relative mt-6 overflow-hidden rounded-3xl p-6 shadow-xl"
                  style={{ backgroundColor: form.color || '#3498DB' }}
                >
                  <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/4 -translate-y-1/2 rounded-full bg-white opacity-10 blur-2xl" />

                  <div className="relative z-10 text-white">
                    <div className="mb-4 flex items-center justify-between">
                      {form.type === 'income' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}

                      <span className="rounded-lg bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">
                        {form.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>

                    <p className="truncate text-2xl font-black">
                      {form.name.trim() || 'Nova Categoria'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-5 text-xl font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mx-auto animate-spin" size={24} />
                    ) : editingCategory ? (
                      'Salvar Alterações'
                    ) : (
                      'Criar Categoria'
                    )}
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