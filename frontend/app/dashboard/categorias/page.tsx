'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken } from '../../../services/auth';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryPayload,
} from '../../../services/categories';
import {
  Loader2,
  Palette,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from 'lucide-react';

const PAGE_SIZE = 12;

interface CategoryFormState {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

interface FiltersState {
  search: string;
  type: '' | 'income' | 'expense';
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: 'green' | 'red' | 'blue' | 'dark';
}) {
  const styles = {
    green: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60]',
      value: 'text-[#2ECC71]',
      label: 'text-slate-500',
    },
    red: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#E74C3C] to-[#C0392B]',
      value: 'text-[#E74C3C]',
      label: 'text-slate-500',
    },
    blue: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#3498DB] to-[#2980B9]',
      value: 'text-[#3498DB]',
      label: 'text-slate-500',
    },
    dark: {
      box: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50]',
      icon: 'bg-white/20',
      value: 'text-white',
      label: 'text-white/70',
    },
  }[tone];

  const Icon = tone === 'dark' ? Search : tone === 'blue' ? Tags : Palette;

  return (
    <div className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${styles.box}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>

      <p className={`text-sm font-medium mb-1 ${styles.label}`}>{title}</p>
      <p className={`text-2xl md:text-3xl font-bold ${styles.value}`}>{value}</p>
    </div>
  );
}

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    type: '',
  });

  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState<CategoryFormState>({
    name: '',
    type: 'expense',
    icon: '🧾',
    color: '#E74C3C',
  });

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (
          message.includes('unauthorized') ||
          message.includes('token') ||
          message.includes('sessão') ||
          message.includes('session') ||
          message.includes('401')
        ) {
          clearToken();
          router.replace('/login');
          return true;
        }
      }

      return false;
    },
    [router]
  );

  const loadCategories = useCallback(async () => {
    setListLoading(true);
    setPageError(null);

    try {
      const categoryList = await fetchCategories({ limit: 100 });
      setCategories(categoryList);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);

      if (handleUnauthorized(error)) return;

      setPageError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as categorias.'
      );
    } finally {
      setListLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.type]);

  const filteredCategories = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return categories.filter((category) => {
      const searchMatch =
        !term ||
        category.name.toLowerCase().includes(term) ||
        (category.icon || '').toLowerCase().includes(term);

      const typeMatch = !filters.type || category.type === filters.type;

      return searchMatch && typeMatch;
    });
  }, [categories, filters.search, filters.type]);

  const stats = useMemo(() => {
    const incomeTotal = categories.filter((category) => category.type === 'income').length;
    const expenseTotal = categories.filter((category) => category.type === 'expense').length;

    return {
      total: categories.length,
      incomeTotal,
      expenseTotal,
      filtered: filteredCategories.length,
    };
  }, [categories, filteredCategories]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, page]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormError(null);
    setForm({
      name: '',
      type: 'expense',
      icon: '🧾',
      color: '#E74C3C',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormError(null);
    setForm({
      name: category.name || '',
      type: category.type,
      icon: category.icon || '',
      color: category.color || (category.type === 'income' ? '#2ECC71' : '#E74C3C'),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  const handleTypeChange = (value: 'income' | 'expense') => {
    setForm((prev) => {
      const wasDefaultIncome = prev.icon === '💰' && prev.color === '#2ECC71';
      const wasDefaultExpense = prev.icon === '🧾' && prev.color === '#E74C3C';

      if (value === 'income' && wasDefaultExpense) {
        return { ...prev, type: value, icon: '💰', color: '#2ECC71' };
      }

      if (value === 'expense' && wasDefaultIncome) {
        return { ...prev, type: value, icon: '🧾', color: '#E74C3C' };
      }

      return { ...prev, type: value };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError('Informe o nome da categoria.');
      return;
    }

    if (!form.type) {
      setFormError('Selecione o tipo da categoria.');
      return;
    }

    const payload: CategoryPayload = {
      name: form.name.trim(),
      type: form.type,
      icon: form.icon.trim(),
      color: form.color,
    };

    try {
      setIsSubmitting(true);

      if (editingCategory) {
        await updateCategory(editingCategory._id, payload);
      } else {
        await createCategory(payload);
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);

      if (handleUnauthorized(error)) return;

      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar a categoria.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Deseja excluir a categoria "${category.name}"?`);

    if (!confirmed) return;

    try {
      setDeletingId(category._id);
      await deleteCategory(category._id);
      await loadCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);

      if (handleUnauthorized(error)) return;

      setPageError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a categoria.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingCategory ? 'Editar categoria' : 'Nova categoria'}
                </h2>
                <p className="text-sm text-slate-500">
                  Defina o nome, o tipo e a aparência da categoria
                </p>
              </div>

              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <span className="sr-only">Fechar</span>×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome da categoria
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Ex.: Alimentação, Salário, Transporte..."
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      handleTypeChange(event.target.value as 'income' | 'expense')
                    }
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  >
                    <option value="expense">Saída</option>
                    <option value="income">Entrada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Ícone
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, icon: event.target.value }))
                    }
                    placeholder="Ex.: 💰, 🍔, 🚗"
                    maxLength={4}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, color: event.target.value }))
                      }
                      className="h-12 w-16 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, color: event.target.value }))
                      }
                      placeholder="#2ECC71"
                      className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pré-visualização
                  </label>
                  <div className="h-16 px-4 rounded-2xl border border-slate-200 flex items-center gap-4 bg-slate-50">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-md"
                      style={{ backgroundColor: form.color || '#3498DB' }}
                    >
                      {form.icon || '🏷️'}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {form.name || 'Nome da categoria'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {form.type === 'income' ? 'Categoria de entrada' : 'Categoria de saída'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-12 px-5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 px-5 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : editingCategory ? (
                    'Salvar alterações'
                  ) : (
                    'Criar categoria'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Total de categorias" value={String(stats.total)} tone="blue" />
        <StatCard title="Categorias de entrada" value={String(stats.incomeTotal)} tone="green" />
        <StatCard title="Categorias de saída" value={String(stats.expenseTotal)} tone="red" />
        <StatCard title="Exibidas nos filtros" value={String(stats.filtered)} tone="dark" />
      </div>

      <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Filtros</h3>
              <p className="text-sm text-slate-500">
                Busque por nome e filtre pelo tipo de categoria
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setFilters({
                  search: '',
                  type: '',
                })
              }
              className="h-11 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Nome ou ícone da categoria"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: event.target.value as FiltersState['type'],
                  }))
                }
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
              >
                <option value="">Todos</option>
                <option value="income">Entradas</option>
                <option value="expense">Saídas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-5 lg:px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Lista de categorias</h3>
            <p className="text-sm text-slate-500">
              {filteredCategories.length} categoria(s) encontrada(s)
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white font-medium shadow-lg shadow-green-500/30"
          >
            Nova categoria
          </button>
        </div>

        {pageError && (
          <div className="mx-5 lg:mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {pageError}
          </div>
        )}

        {listLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Carregando categorias...
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Tags className="text-slate-400" size={28} />
            </div>
            <h4 className="text-lg font-semibold text-slate-800 mb-1">
              Nenhuma categoria encontrada
            </h4>
            <p className="text-slate-500">
              Ajuste os filtros ou crie uma nova categoria para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 font-semibold">Cor</th>
                    <th className="px-6 py-4 font-semibold">Ícone</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedCategories.map((category) => (
                    <tr
                      key={category._id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg shadow-sm"
                            style={{ backgroundColor: category.color || '#3498DB' }}
                          >
                            {category.icon || '🏷️'}
                          </div>

                          <div>
                            <div className="font-semibold text-slate-800">
                              {category.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {category.type === 'income'
                                ? 'Categoria de entrada'
                                : 'Categoria de saída'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            category.type === 'income'
                              ? 'bg-green-100 text-[#2ECC71]'
                              : 'bg-red-100 text-[#E74C3C]'
                          }`}
                        >
                          {category.type === 'income' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-slate-700">
                          <span
                            className="w-5 h-5 rounded-full border border-slate-200"
                            style={{ backgroundColor: category.color || '#3498DB' }}
                          />
                          <span>{category.color || '-'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-700 text-lg">
                        {category.icon || '—'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(category)}
                            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(category)}
                            disabled={deletingId === category._id}
                            className="w-10 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-60"
                            title="Excluir"
                          >
                            {deletingId === category._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {paginatedCategories.map((category) => (
                <div key={category._id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-sm"
                        style={{ backgroundColor: category.color || '#3498DB' }}
                      >
                        {category.icon || '🏷️'}
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-800">
                          {category.name}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          {category.type === 'income' ? 'Entrada' : 'Saída'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        category.type === 'income'
                          ? 'bg-green-100 text-[#2ECC71]'
                          : 'bg-red-100 text-[#E74C3C]'
                      }`}
                    >
                      {category.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Cor</span>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: category.color || '#3498DB' }}
                      />
                      <span>{category.color || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-sm text-slate-500">
                      Ícone: <span className="text-lg">{category.icon || '—'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(category)}
                        className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(category)}
                        disabled={deletingId === category._id}
                        className="w-10 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-60"
                      >
                        {deletingId === category._id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 lg:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>

                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={openCreateModal}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white rounded-full shadow-xl shadow-green-500/50 flex items-center justify-center z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}