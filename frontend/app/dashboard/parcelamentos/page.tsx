'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken } from '../../../services/auth';
import {
  fetchCategories,
  type Category,
} from '../../../services/categories';
import {
  fetchCreditCards,
  type CreditCard,
} from '../../../services/creditCards';
import {
  createInstallmentPlan,
  fetchInstallmentPlanById,
  fetchInstallmentPlans,
  type InstallmentPlan,
  type InstallmentPlanTransaction,
} from '../../../services/installmentPlans';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  FileText,
  Layers3,
  Loader2,
  Plus,
  Receipt,
  Wallet,
  XCircle,
} from 'lucide-react';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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
  tone: 'green' | 'blue' | 'purple' | 'dark';
  icon: React.ReactNode;
}) {
  const styles = {
    green: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#2ECC71] to-[#27AE60]',
      value: 'text-[#2ECC71]',
      label: 'text-slate-500',
    },
    blue: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#3498DB] to-[#2980B9]',
      value: 'text-[#3498DB]',
      label: 'text-slate-500',
    },
    purple: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]',
      value: 'text-[#9B59B6]',
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

type FormState = {
  description: string;
  totalAmount: string;
  installmentCount: string;
  category: string;
  creditCard: string;
  transactionDate: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  description: '',
  totalAmount: '',
  installmentCount: '2',
  category: '',
  creditCard: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function InstallmentPlansPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);

      const [categoriesData, cardsData, plansData] = await Promise.all([
        fetchCategories({ type: 'expense', limit: 100 }),
        fetchCreditCards({ isActive: true }),
        fetchInstallmentPlans(),
      ]);

      setCategories(categoriesData.filter((item) => item.type === 'expense'));
      setCreditCards(cardsData.filter((item) => item.isActive));
      setPlans(plansData);

      if (plansData.length > 0) {
        const firstPlan = await fetchInstallmentPlanById(plansData[0]._id);
        setSelectedPlan(firstPlan);
      } else {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Erro ao carregar parcelamentos:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível carregar os parcelamentos.'
      );

      if (!redirected) {
        setPageError('Não foi possível carregar os dados da página.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSelectPlan = async (planId: string) => {
    try {
      setDetailsLoading(true);
      const plan = await fetchInstallmentPlanById(planId);
      setSelectedPlan(plan);
    } catch (error) {
      console.error('Erro ao carregar detalhes do parcelamento:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível carregar os detalhes do parcelamento.'
      );

      if (!redirected) {
        setPageError('Não foi possível carregar os detalhes do parcelamento.');
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.description.trim()) {
      return 'Informe a descrição da compra.';
    }

    const totalAmount = Number(form.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return 'Informe um valor total válido.';
    }

    const installmentCount = Number(form.installmentCount);
    if (!Number.isInteger(installmentCount) || installmentCount < 2) {
      return 'Informe pelo menos 2 parcelas.';
    }

    if (!form.category) {
      return 'Selecione a categoria.';
    }

    if (!form.creditCard) {
      return 'Selecione o cartão de crédito.';
    }

    if (!form.transactionDate) {
      return 'Informe a data da compra.';
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

    try {
      setSubmitting(true);

      const createdPlan = await createInstallmentPlan({
        description: form.description.trim(),
        totalAmount: Number(form.totalAmount),
        installmentCount: Number(form.installmentCount),
        category: form.category,
        creditCard: form.creditCard,
        transactionDate: form.transactionDate,
        notes: form.notes.trim(),
      });

      setForm(INITIAL_FORM);
      setFormSuccess('Parcelamento criado com sucesso.');

      const plansData = await fetchInstallmentPlans();
      setPlans(plansData);

      const detailedPlan = await fetchInstallmentPlanById(createdPlan._id);
      setSelectedPlan(detailedPlan);
    } catch (error) {
      console.error('Erro ao criar parcelamento:', error);

      const redirected = handleAuthError(
        error,
        'Não foi possível criar o parcelamento.'
      );

      if (!redirected) {
        setFormError(getErrorMessage(error, 'Não foi possível criar o parcelamento.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const planStats = useMemo(() => {
    const totalPlans = plans.length;
    const totalAmount = plans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    const totalInstallments = plans.reduce(
      (sum, plan) => sum + (plan.installmentCount || 0),
      0
    );

    const plannedTransactions =
      selectedPlan?.transactions?.filter((item) => item.status === 'planned').length || 0;

    return {
      totalPlans,
      totalAmount,
      totalInstallments,
      plannedTransactions,
    };
  }, [plans, selectedPlan]);

  const installmentPreview = useMemo(() => {
    const total = Number(form.totalAmount);
    const count = Number(form.installmentCount);

    if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(count) || count <= 0) {
      return [];
    }

    const totalInCents = Math.round(total * 100);
    const baseInCents = Math.floor(totalInCents / count);
    const remainder = totalInCents % count;

    return Array.from({ length: count }, (_, index) => {
      const cents = baseInCents + (index < remainder ? 1 : 0);
      return cents / 100;
    });
  }, [form.totalAmount, form.installmentCount]);

  const selectedPlanConfirmedCount = useMemo(() => {
    return selectedPlan?.transactions?.filter((item) => item.status === 'confirmed').length || 0;
  }, [selectedPlan]);

  const selectedPlanProgress = useMemo(() => {
    if (!selectedPlan?.installmentCount) return 0;
    return (selectedPlanConfirmedCount / selectedPlan.installmentCount) * 100;
  }, [selectedPlan, selectedPlanConfirmedCount]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Carregando parcelamentos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar</h3>
          <p className="text-slate-500 mb-6">{pageError}</p>

          <button
            onClick={loadInitialData}
            className="h-11 px-5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          title="Parcelamentos ativos"
          value={String(planStats.totalPlans)}
          subtitle="Compras parceladas registradas"
          tone="blue"
          icon={<Layers3 size={24} />}
        />

        <SummaryCard
          title="Valor parcelado"
          value={formatCurrency(planStats.totalAmount)}
          subtitle="Volume total cadastrado"
          tone="purple"
          icon={<Wallet size={24} />}
        />

        <SummaryCard
          title="Total de parcelas"
          value={String(planStats.totalInstallments)}
          subtitle="Parcelas geradas no sistema"
          tone="green"
          icon={<Calculator size={24} />}
        />

        <SummaryCard
          title="Parcelas futuras"
          value={String(planStats.plannedTransactions)}
          subtitle="Do parcelamento selecionado"
          tone="dark"
          icon={<Calendar size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center">
              <Plus className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Novo parcelamento</h2>
              <p className="text-sm text-slate-500">
                Registre uma compra parcelada com lógica financeira correta
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ex.: Notebook Dell"
                className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor total
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Parcelas
                </label>
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={form.installmentCount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, installmentCount: e.target.value }))
                  }
                  className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Categoria
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full h-12 rounded-2xl border border-slate-300 px-4 bg-white text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
              >
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.icon ? `${category.icon} ` : ''}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Cartão de crédito
              </label>
              <select
                value={form.creditCard}
                onChange={(e) => setForm((prev) => ({ ...prev, creditCard: e.target.value }))}
                className="w-full h-12 rounded-2xl border border-slate-300 px-4 bg-white text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
              >
                <option value="">Selecione</option>
                {creditCards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {card.name} • fecha dia {card.closingDay}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Data da compra
              </label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, transactionDate: e.target.value }))
                }
                className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Observações
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações opcionais"
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition resize-none"
              />
            </div>

            {installmentPreview.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt size={18} className="text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700">
                    Prévia das parcelas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                  {installmentPreview.map((value, index) => (
                    <div
                      key={`${index + 1}-${value}`}
                      className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-500">{index + 1}ª parcela</span>
                      <p className="font-semibold text-slate-800">{formatCurrency(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formSuccess && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-green-700 font-medium">{formSuccess}</p>
              </div>
            )}

            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                <XCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700 font-medium">{formError}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="h-12 px-5 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar parcelamento'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Parcelamentos</h2>
                <p className="text-sm text-slate-500">
                  Lista das compras parceladas cadastradas
                </p>
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CreditCardIcon className="text-slate-400" size={28} />
                </div>
                <p className="text-slate-600 font-medium">Nenhum parcelamento cadastrado</p>
                <p className="text-sm text-slate-400 mt-2">
                  Crie o primeiro parcelamento para começar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const isSelected = selectedPlan?._id === plan._id;

                  return (
                    <button
                      key={plan._id}
                      onClick={() => handleSelectPlan(plan._id)}
                      className={`w-full text-left px-6 py-4 transition-colors ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{plan.description}</p>
                          <p className="text-sm text-slate-500">
                            {plan.category?.name || 'Sem categoria'} • {plan.creditCard?.name || 'Sem cartão'}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(plan.totalAmount)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {plan.installmentCount}x • {formatDate(plan.transactionDate)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detalhes do parcelamento</h2>
                <p className="text-sm text-slate-500">
                  Visualização operacional das parcelas geradas
                </p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="py-12 flex items-center justify-center text-slate-500 gap-3">
                <Loader2 size={20} className="animate-spin" />
                Carregando detalhes...
              </div>
            ) : !selectedPlan ? (
              <div className="py-12 text-center text-slate-500">
                Selecione um parcelamento para ver os detalhes.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 mb-1">Descrição</p>
                    <p className="font-semibold text-slate-800">{selectedPlan.description}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 mb-1">Valor total</p>
                    <p className="font-semibold text-slate-800">
                      {formatCurrency(selectedPlan.totalAmount)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 mb-1">Estrutura</p>
                    <p className="font-semibold text-slate-800">
                      {selectedPlan.installmentCount} parcelas
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Progresso</span>
                    <span className="text-sm text-slate-500">
                      {selectedPlanConfirmedCount}/{selectedPlan.installmentCount} confirmada(s)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2ECC71] transition-all duration-500"
                      style={{ width: `${Math.min(selectedPlanProgress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-800">Parcelas geradas</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(selectedPlan.transactions || []).map((transaction: InstallmentPlanTransaction) => (
                      <div
                        key={transaction._id}
                        className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-slate-500">
                            Compra: {formatDate(transaction.transactionDate)} • Competência:{' '}
                            {formatDate(transaction.competencyDate)}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="font-bold text-slate-900">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <span
                            className={`inline-flex mt-1 items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              transaction.status === 'confirmed'
                                ? 'bg-green-100 text-[#2ECC71]'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {transaction.status === 'confirmed' ? 'Confirmada' : 'Planejada'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                  Essa estrutura já prepara o Monity para o próximo salto:
                  previsão de fatura, limite comprometido do cartão e saldo projetado por competência.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}