'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken } from '../../../services/auth';
import {
  fetchInvoices,
  fetchInvoiceByCardAndMonth,
  type Invoice,
} from '../../../services/invoices';
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Receipt,
  Wallet,
  AlertTriangle,
  Clock3,
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

function formatMonthYear(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
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
  tone: 'blue' | 'green' | 'purple' | 'dark' | 'amber';
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
    purple: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#9B59B6] to-[#8E44AD]',
      value: 'text-[#9B59B6]',
      label: 'text-slate-500',
    },
    amber: {
      box: 'bg-white border border-slate-200',
      icon: 'bg-gradient-to-br from-[#F39C12] to-[#D68910]',
      value: 'text-[#F39C12]',
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

function getStatusBadge(status: Invoice['status']) {
  if (status === 'closed') {
    return 'bg-green-100 text-[#2ECC71]';
  }

  if (status === 'partial') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-blue-100 text-[#3498DB]';
}

function getStatusLabel(status: Invoice['status']) {
  if (status === 'closed') return 'Fechada';
  if (status === 'partial') return 'Parcial';
  return 'Aberta';
}

function getTimingLabel(timing: Invoice['timing']) {
  if (timing === 'past') return 'Passada';
  if (timing === 'current') return 'Atual';
  return 'Futura';
}

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInvoices = async () => {
      try {
        setPageError(null);

        const data = await fetchInvoices();

        if (!isMounted) return;

        setInvoices(data);

        if (data.length > 0) {
          const firstInvoice = await fetchInvoiceByCardAndMonth(
            data[0].cardId,
            data[0].monthKey
          );

          if (!isMounted) return;
          setSelectedInvoice(firstInvoice);
        } else {
          setSelectedInvoice(null);
        }
      } catch (error) {
        console.error('Erro ao carregar faturas:', error);

        const message = getErrorMessage(error, 'Não foi possível carregar as faturas.');

        if (shouldLogout(message)) {
          clearToken();
          router.replace('/login');
          return;
        }

        if (isMounted) {
          setPageError('Não foi possível carregar as faturas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectInvoice = async (invoice: Invoice) => {
    try {
      setDetailsLoading(true);

      const detail = await fetchInvoiceByCardAndMonth(invoice.cardId, invoice.monthKey);
      setSelectedInvoice(detail);
    } catch (error) {
      console.error('Erro ao carregar detalhes da fatura:', error);

      const message = getErrorMessage(
        error,
        'Não foi possível carregar os detalhes da fatura.'
      );

      if (shouldLogout(message)) {
        clearToken();
        router.replace('/login');
        return;
      }

      setPageError('Não foi possível carregar os detalhes da fatura.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const summary = useMemo(() => {
    return invoices.reduce(
      (acc, item) => {
        acc.total += item.total;
        acc.confirmed += item.confirmedTotal;
        acc.planned += item.plannedTotal;

        if (item.status === 'open') acc.openCount += 1;
        if (item.status === 'partial') acc.partialCount += 1;
        if (item.status === 'closed') acc.closedCount += 1;

        return acc;
      },
      {
        total: 0,
        confirmed: 0,
        planned: 0,
        openCount: 0,
        partialCount: 0,
        closedCount: 0,
      }
    );
  }, [invoices]);

  const selectedInvoiceUsage = useMemo(() => {
    if (!selectedInvoice) return 0;

    const totalUsed =
      selectedInvoice.confirmedTotal + selectedInvoice.plannedTotal;
    const available = selectedInvoice.availableCardLimit;
    const estimatedLimit = totalUsed + available;

    if (estimatedLimit <= 0) return 0;

    return Math.min((totalUsed / estimatedLimit) * 100, 100);
  }, [selectedInvoice]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Carregando faturas...</p>
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
          <p className="text-slate-500">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          title="Total em faturas"
          value={formatCurrency(summary.total)}
          subtitle="Somatório das faturas agrupadas"
          tone="blue"
          icon={<Wallet size={24} />}
        />

        <SummaryCard
          title="Confirmado"
          value={formatCurrency(summary.confirmed)}
          subtitle={`${summary.closedCount} fatura(s) fechada(s)`}
          tone="green"
          icon={<CheckCircle2 size={24} />}
        />

        <SummaryCard
          title="Planejado"
          value={formatCurrency(summary.planned)}
          subtitle={`${summary.openCount} fatura(s) aberta(s)`}
          tone="purple"
          icon={<Clock3 size={24} />}
        />

        <SummaryCard
          title="Parciais"
          value={String(summary.partialCount)}
          subtitle="Faturas com parte confirmada e parte futura"
          tone="amber"
          icon={<AlertTriangle size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Faturas</h2>
            <p className="text-sm text-slate-500">
              Agrupadas por cartão e competência
            </p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-slate-400" size={28} />
              </div>
              <p className="text-slate-600 font-medium">Nenhuma fatura encontrada</p>
              <p className="text-sm text-slate-400 mt-2">
                Adicione compras no crédito para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => {
                const isSelected =
                  selectedInvoice?.cardId === invoice.cardId &&
                  selectedInvoice?.monthKey === invoice.monthKey;

                return (
                  <button
                    key={`${invoice.cardId}-${invoice.monthKey}`}
                    onClick={() => handleSelectInvoice(invoice)}
                    className={`w-full text-left px-6 py-5 transition-colors ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34495E] to-[#2C3E50] flex items-center justify-center">
                            <CreditCard className="text-white" size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {invoice.cardName}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatMonthYear(invoice.competencyDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${getStatusBadge(
                              invoice.status
                            )}`}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>

                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {getTimingLabel(invoice.timing)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900">
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {invoice.transactionCount} compra(s)
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] flex items-center justify-center">
              <Receipt className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detalhe da fatura</h2>
              <p className="text-sm text-slate-500">
                Visão operacional da fatura selecionada
              </p>
            </div>
          </div>

          {detailsLoading ? (
            <div className="py-16 flex items-center justify-center text-slate-500 gap-3">
              <Loader2 size={20} className="animate-spin" />
              Carregando detalhes...
            </div>
          ) : !selectedInvoice ? (
            <div className="py-16 text-center text-slate-500">
              Selecione uma fatura para ver os detalhes.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Cartão</p>
                  <p className="font-semibold text-slate-800">{selectedInvoice.cardName}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Competência</p>
                  <p className="font-semibold text-slate-800">
                    {formatMonthYear(selectedInvoice.competencyDate)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                      selectedInvoice.status
                    )}`}
                  >
                    {getStatusLabel(selectedInvoice.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Total</p>
                  <p className="font-bold text-slate-900">
                    {formatCurrency(selectedInvoice.total)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Confirmado</p>
                  <p className="font-bold text-[#2ECC71]">
                    {formatCurrency(selectedInvoice.confirmedTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Planejado</p>
                  <p className="font-bold text-[#9B59B6]">
                    {formatCurrency(selectedInvoice.plannedTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Disponível estimado</p>
                  <p
                    className={`font-bold ${
                      selectedInvoice.availableCardLimit >= 0
                        ? 'text-[#2ECC71]'
                        : 'text-[#E74C3C]'
                    }`}
                  >
                    {formatCurrency(selectedInvoice.availableCardLimit)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Uso estimado do cartão
                  </span>
                  <span className="text-sm text-slate-500">
                    {selectedInvoiceUsage.toFixed(0)}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedInvoiceUsage < 60
                        ? 'bg-[#2ECC71]'
                        : selectedInvoiceUsage < 85
                        ? 'bg-[#F39C12]'
                        : 'bg-[#E74C3C]'
                    }`}
                    style={{ width: `${selectedInvoiceUsage}%` }}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Fechamento dia {selectedInvoice.closingDay} • vencimento dia {selectedInvoice.dueDay}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="font-semibold text-slate-800">Compras da fatura</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {selectedInvoice.transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-slate-500">
                          {transaction.category?.name || 'Sem categoria'} • Compra em{' '}
                          {formatDate(transaction.transactionDate)}
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
                          {transaction.status === 'confirmed' ? 'Confirmado' : 'Planejado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                Agora o Monity já separa a lógica de fatura do simples registro de transações.
                O próximo salto é classificar faturas em aberta, fechada e próxima fatura com mais inteligência.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}