'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken } from '../../../services/auth';
import {
  createCreditCard,
  deleteCreditCard,
  fetchCreditCards,
  updateCreditCard,
  type CreditCard,
  type CreditCardPayload,
} from '../../../services/creditCards';
import {
  CreditCard as CreditCardIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';

const PAGE_SIZE = 12;

interface CreditCardFormState {
  name: string;
  bankCode: string;
  limit: string;
  closingDay: string;
  dueDay: string;
  color: string;
  isActive: boolean;
}

interface FiltersState {
  search: string;
  isActive: '' | 'true' | 'false';
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function shouldLogout(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('unauthorized') ||
    normalized.includes('token') ||
    normalized.includes('sessão') ||
    normalized.includes('session') ||
    normalized.includes('401')
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone: 'blue' | 'green' | 'red' | 'dark';
  icon: React.ReactNode;
}) {
  const styles = {
    blue: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#3498DB] to-[#2980B9]',
      value: 'text-[#3498DB]',
      label: 'text-slate-500',
    },
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
    dark: {
      box: 'bg-gradient-to-br from-[#34495E] to-[#2C3E50]',
      icon: 'bg-white/20',
      value: 'text-white',
      label: 'text-white/70',
    },
  }[tone];

  return (
    <div className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow ${styles.box}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>

      <p className={`text-sm font-medium mb-1 ${styles.label}`}>{title}</p>
      <p className={`text-2xl md:text-3xl font-bold ${styles.value}`}>{value}</p>
      {subtitle ? <p className={`text-xs mt-2 ${styles.label}`}>{subtitle}</p> : null}
    </div>
  );
}

const INITIAL_FORM: CreditCardFormState = {
  name: '',
  bankCode: '',
  limit: '',
  closingDay: '25',
  dueDay: '5',
  color: '#9B59B6',
  isActive: true,
};

export default function CreditCardsPage() {
  const router = useRouter();

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    isActive: '',
  });

  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CreditCardFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const message = getErrorMessage(error, fallbackMessage);

      if (shouldLogout(message)) {
        clearToken();
        router.replace('/login');
        return true;
      }

      return false;
    },
    [router]
  );

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);

      const data = await fetchCreditCards({});
      setCards(data);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível carregar os cartões.'
      );

      if (!redirected) {
        setPageError('Não foi possível carregar os cartões.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.isActive]);

  const filteredCards = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      const searchMatch =
        !term ||
        card.name.toLowerCase().includes(term) ||
        String(card.bankCode || '').toLowerCase().includes(term);

      const activeMatch =
        !filters.isActive ||
        String(card.isActive) === filters.isActive;

      return searchMatch && activeMatch;
    });
  }, [cards, filters]);

  const stats = useMemo(() => {
    const active = cards.filter((card) => card.isActive).length;
    const inactive = cards.filter((card) => !card.isActive).length;
    const totalLimit = cards.reduce((sum, card) => sum + (card.limit || 0), 0);

    return {
      total: cards.length,
      active,
      inactive,
      totalLimit,
    };
  }, [cards]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedCards = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
  }, [filteredCards, page]);

  const openCreateModal = () => {
    setEditingCard(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setForm({
      name: card.name || '',
      bankCode: card.bankCode || '',
      limit: String(card.limit || ''),
      closingDay: String(card.closingDay || 25),
      dueDay: String(card.dueDay || 5),
      color: card.color || '#9B59B6',
      isActive: card.isActive,
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingCard(null);
    setFormError(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Informe o nome do cartão.';
    }

    const closingDay = Number(form.closingDay);
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      return 'O dia de fechamento deve ser entre 1 e 31.';
    }

    const dueDay = Number(form.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return 'O dia de vencimento deve ser entre 1 e 31.';
    }

    if (form.limit.trim()) {
      const limit = Number(form.limit);
      if (!Number.isFinite(limit) || limit < 0) {
        return 'Informe um limite válido.';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: CreditCardPayload = {
      name: form.name.trim(),
      bankCode: form.bankCode.trim() || null,
      limit: form.limit.trim() ? Number(form.limit) : null,
      closingDay: Number(form.closingDay),
      dueDay: Number(form.dueDay),
      color: form.color,
      isActive: form.isActive,
    };

    try {
      setSubmitting(true);

      if (editingCard) {
        await updateCreditCard(editingCard._id, payload);
        setFormSuccess('Cartão atualizado com sucesso.');
      } else {
        await createCreditCard(payload);
        setFormSuccess('Cartão criado com sucesso.');
      }

      await loadCards();

      setTimeout(() => {
        setIsModalOpen(false);
        setEditingCard(null);
        setForm(INITIAL_FORM);
        setFormSuccess(null);
      }, 500);
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível salvar o cartão.'
      );

      if (!redirected) {
        setFormError(getErrorMessage(error, 'Não foi possível salvar o cartão.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (card: CreditCard) => {
    const confirmed = window.confirm(`Deseja excluir o cartão "${card.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(card._id);
      await deleteCreditCard(card._id);
      await loadCards();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível excluir o cartão.'
      );

      if (!redirected) {
        setPageError(getErrorMessage(error, 'Não foi possível excluir o cartão.'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Carregando cartões...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingCard ? 'Editar cartão' : 'Novo cartão'}
                </h2>
                <p className="text-sm text-slate-500">
                  Cadastre o cartão para usar parcelamento, faturas e projeções
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
                    Nome do cartão
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex.: Nubank, Itaú Black, Inter"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Banco / código
                  </label>
                  <input
                    type="text"
                    value={form.bankCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, bankCode: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Limite
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.limit}
                    onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))}
                    placeholder="0,00"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Dia de fechamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.closingDay}
                    onChange={(e) => setForm((prev) => ({ ...prev, closingDay: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Dia de vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.dueDay}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDay: e.target.value }))}
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
                      onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-12 w-16 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Cartão ativo
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pré-visualização
                  </label>
                  <div
                    className="rounded-2xl p-5 text-white shadow-lg"
                    style={{ backgroundColor: form.color || '#9B59B6' }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <CreditCardIcon size={24} />
                      <span className="text-sm opacity-90">
                        {form.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <p className="text-lg font-bold">{form.name || 'Nome do cartão'}</p>
                    <p className="text-sm opacity-90 mt-1">
                      Fecha dia {form.closingDay || '-'} • vence dia {form.dueDay || '-'}
                    </p>
                    <p className="text-sm opacity-90 mt-3">
                      Limite: {form.limit ? formatCurrency(Number(form.limit)) : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {formSuccess}
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
                  disabled={submitting}
                  className="h-12 px-5 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : editingCard ? (
                    'Salvar alterações'
                  ) : (
                    'Criar cartão'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          title="Total de cartões"
          value={String(stats.total)}
          subtitle="Cartões cadastrados"
          tone="blue"
          icon={<CreditCardIcon size={24} />}
        />

        <SummaryCard
          title="Cartões ativos"
          value={String(stats.active)}
          subtitle="Disponíveis para uso"
          tone="green"
          icon={<Wallet size={24} />}
        />

        <SummaryCard
          title="Cartões inativos"
          value={String(stats.inactive)}
          subtitle="Fora de operação"
          tone="red"
          icon={<AlertTriangle size={24} />}
        />

        <SummaryCard
          title="Limite total"
          value={formatCurrency(stats.totalLimit)}
          subtitle="Soma dos limites"
          tone="dark"
          icon={<CalendarDays size={24} />}
        />
      </div>

      <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-lg border border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Filtros</h3>
              <p className="text-sm text-slate-500">
                Busque por nome e filtre por status do cartão
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setFilters({
                  search: '',
                  isActive: '',
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
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Nome do cartão ou banco"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Status
              </label>
              <select
                value={filters.isActive}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    isActive: e.target.value as FiltersState['isActive'],
                  }))
                }
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/30 focus:border-[#2ECC71]"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-5 lg:px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Lista de cartões</h3>
            <p className="text-sm text-slate-500">
              {filteredCards.length} cartão(ões) encontrado(s)
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white font-medium shadow-lg shadow-green-500/30"
          >
            Novo cartão
          </button>
        </div>

        {pageError && (
          <div className="mx-5 lg:mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {pageError}
          </div>
        )}

        {filteredCards.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CreditCardIcon className="text-slate-400" size={28} />
            </div>
            <h4 className="text-lg font-semibold text-slate-800 mb-1">
              Nenhum cartão encontrado
            </h4>
            <p className="text-slate-500">
              Crie seu primeiro cartão para usar parcelamentos e faturas.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">Cartão</th>
                    <th className="px-6 py-4 font-semibold">Limite</th>
                    <th className="px-6 py-4 font-semibold">Fechamento</th>
                    <th className="px-6 py-4 font-semibold">Vencimento</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedCards.map((card) => (
                    <tr
                      key={card._id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: card.color || '#9B59B6' }}
                          >
                            <CreditCardIcon size={20} />
                          </div>

                          <div>
                            <div className="font-semibold text-slate-800">{card.name}</div>
                            <div className="text-sm text-slate-500">
                              {card.bankCode || 'Sem banco informado'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {formatCurrency(card.limit)}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        Dia {card.closingDay}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        Dia {card.dueDay}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            card.isActive
                              ? 'bg-green-100 text-[#2ECC71]'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {card.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(card)}
                            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(card)}
                            disabled={deletingId === card._id}
                            className="w-10 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-60"
                            title="Excluir"
                          >
                            {deletingId === card._id ? (
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
              {paginatedCards.map((card) => (
                <div key={card._id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: card.color || '#9B59B6' }}
                      >
                        <CreditCardIcon size={20} />
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-800">{card.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">
                          {card.bankCode || 'Sem banco informado'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        card.isActive
                          ? 'bg-green-100 text-[#2ECC71]'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {card.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Limite</p>
                      <p className="font-semibold text-slate-800">
                        {formatCurrency(card.limit)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Fechamento</p>
                      <p className="font-semibold text-slate-800">Dia {card.closingDay}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Vencimento</p>
                      <p className="font-semibold text-slate-800">Dia {card.dueDay}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-slate-500">Cor</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-4 h-4 rounded-full border border-slate-200"
                          style={{ backgroundColor: card.color || '#9B59B6' }}
                        />
                        <span className="font-semibold text-slate-800">
                          {card.color || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(card)}
                      className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(card)}
                      disabled={deletingId === card._id}
                      className="w-10 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-60"
                    >
                      {deletingId === card._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
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