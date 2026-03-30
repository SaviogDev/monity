'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Landmark,
  PiggyBank,
  Banknote,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCcw,
  CheckCircle2,
  XCircle,
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
  createdAt?: string;
  updatedAt?: string;
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
  color: '#2563eb',
  isActive: true,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta corrente',
  wallet: 'Carteira',
  cash: 'Dinheiro',
  savings: 'Poupança',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function getAccountIcon(type: AccountType) {
  switch (type) {
    case 'checking':
      return Landmark;
    case 'wallet':
      return Wallet;
    case 'cash':
      return Banknote;
    case 'savings':
      return PiggyBank;
    default:
      return Wallet;
  }
}

function normalizeNumber(value: string) {
  if (!value) return 0;
  const clean = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(clean);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocorreu um erro desconhecido.';
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

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function refreshAll() {
    try {
      setError('');
      await loadAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Não foi possível carregar as contas.');
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  function openCreateModal() {
    setEditingAccount(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingAccount(account);
    setForm({
      name: account.name || '',
      type: account.type,
      initialBalance: String(account.initialBalance ?? 0),
      bank: account.bankCode || '',
      color: account.color || '#2563eb',
      isActive: account.isActive,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setEditingAccount(null);
    setForm(defaultForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: form.name.trim(),
        type: form.type,
        initialBalance: normalizeNumber(form.initialBalance),
        bankCode: form.bank.trim() || null,
        color: form.color,
        isActive: form.isActive,
      };

      if (!payload.name) {
        throw new Error('Informe o nome da conta.');
      }

      if (editingAccount?._id) {
        await updateAccount(editingAccount._id, payload);
        setSuccessMessage('Conta atualizada com sucesso.');
      } else {
        await createAccount(payload);
        setSuccessMessage('Conta criada com sucesso.');
      }

      await loadAll();
      closeModal();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Não foi possível salvar a conta.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Tem certeza que deseja excluir esta conta?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');

      await deleteAccount(id);
      await loadAll();
      setSuccessMessage('Conta excluída com sucesso.');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Não foi possível excluir a conta.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(account: Account) {
    try {
      setError('');

      const payload = {
        isActive: !account.isActive,
      };

      const result = await updateAccount(account._id, payload);

      await loadAll();

      setSuccessMessage(
        result.isActive ? 'Conta ativada com sucesso.' : 'Conta desativada com sucesso.'
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Não foi possível alterar o status da conta.');
    }
  }

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        account.name.toLowerCase().includes(search.toLowerCase()) ||
        (account.bankCode || '').toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'all' ? true : account.type === typeFilter;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? account.isActive
          : !account.isActive;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, search, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((item) => item.isActive).length;
    const inactive = total - active;

    const totalBalance = accounts.reduce(
      (acc, item) => acc + Number(item.currentBalance || 0),
      0
    );

    return { total, active, inactive, totalBalance };
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Contas</h1>
          <p className="text-sm text-gray-500">
            Gerencie suas contas, bancos, carteira e saldo inicial.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova conta
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total de contas</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</h3>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Ativas</p>
          <h3 className="mt-2 text-2xl font-bold text-emerald-600">{summary.active}</h3>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inativas</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-500">{summary.inactive}</h3>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Saldo total atual</p>
          <h3 className="mt-2 text-2xl font-bold text-blue-600">
            {formatCurrency(summary.totalBalance)}
          </h3>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome da conta ou banco..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | AccountType)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="checking">Conta corrente</option>
            <option value="wallet">Carteira</option>
            <option value="cash">Dinheiro</option>
            <option value="savings">Poupança</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Carregando contas...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Wallet className="h-7 w-7 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Nenhuma conta encontrada
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Cadastre sua primeira conta para começar a organizar o caixa do sistema.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Criar conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredAccounts.map((account) => {
            const Icon = getAccountIcon(account.type);

            return (
              <div
                key={account._id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                      style={{ backgroundColor: account.color || '#2563eb' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-gray-900">
                          {account.name}
                        </h3>

                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            <XCircle className="h-3.5 w-3.5" />
                            Inativa
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {accountTypeLabels[account.type]}
                        {account.bankCode ? ` • ${account.bankCode}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEditModal(account)}
                      className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(account._id)}
                      disabled={deletingId === account._id}
                      className="rounded-xl border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Saldo atual
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {formatCurrency(Number(account.currentBalance || 0))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Entradas</p>
                      <p className="text-sm font-semibold text-emerald-800">
                        {formatCurrency(Number(account.totalIncome || 0))}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs text-red-700">Saídas</p>
                      <p className="text-sm font-semibold text-red-800">
                        {formatCurrency(Number(account.totalExpense || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Banco / origem
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {account.bankCode || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Cor da conta:{' '}
                    <span className="font-medium text-gray-600">{account.color || '#2563eb'}</span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(account)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      account.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {account.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAccount ? 'Editar conta' : 'Nova conta'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Cadastre a conta base para controlar saldo e origem das movimentações.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nome da conta
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Nubank principal"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        type: e.target.value as AccountType,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  >
                    <option value="checking">Conta corrente</option>
                    <option value="wallet">Carteira</option>
                    <option value="cash">Dinheiro</option>
                    <option value="savings">Poupança</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Saldo inicial
                  </label>
                  <input
                    type="text"
                    value={form.initialBalance}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        initialBalance: e.target.value,
                      }))
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Banco / instituição
                  </label>
                  <input
                    type="text"
                    value={form.bank}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bank: e.target.value }))
                    }
                    placeholder="Ex.: Itaú, Inter, Caixa"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Cor
                  </label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="h-[50px] w-full rounded-xl border border-gray-200 bg-white p-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Conta ativa</p>
                  <p className="text-xs text-gray-500">
                    Contas inativas deixam de aparecer como opção operacional.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    form.isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      form.isActive ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Preview
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
                    style={{ backgroundColor: form.color || '#2563eb' }}
                  >
                    {(() => {
                      const Icon = getAccountIcon(form.type);
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">
                      {form.name || 'Nome da conta'}
                    </h3>
                    <p className="text-sm text-white/70">
                      {accountTypeLabels[form.type]}
                      {form.bank ? ` • ${form.bank}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs text-white/60">Saldo inicial</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(normalizeNumber(form.initialBalance))}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Salvando...'
                    : editingAccount
                    ? 'Salvar alterações'
                    : 'Criar conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}