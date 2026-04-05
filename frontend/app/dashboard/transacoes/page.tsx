'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Calendar as CalendarIcon,
  Upload,
  Landmark,
  CreditCard as CreditCardIcon,
  FileUp,
  Repeat,
  Split,
  CalendarClock,
  Receipt,
} from 'lucide-react';

import { useFinancialStore } from '@/stores/financial-store';
import { fetchCategories, type Category } from '@/services/categories';
import { fetchAccounts, type Account } from '@/services/accounts';
import { fetchCreditCards, type CreditCard } from '@/services/creditCards';
import { type TransactionPayload } from '@/services/transactions';

type TransactionType = 'income' | 'expense';
type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'transfer';
type TransactionStatus = 'confirmed' | 'planned' | string;
type ImportTargetType = 'account' | 'creditCard';

type CreditCardWithMetrics = CreditCard & {
  limit?: number | null;
  availableLimit?: number | null;
  usedLimit?: number | null;
  linkedAccount?:
    | string
    | {
        _id?: string;
        name?: string | null;
      }
    | null;
};

interface TransactionItem {
  _id: string;
  description: string;
  amount: number;
  type: TransactionType;
  transactionDate?: string | null;
  purchaseDate?: string | null;
  category?: { _id?: string; name?: string | null } | null;
  account?: { _id?: string; name?: string | null } | null;
  creditCard?: { _id?: string; name?: string | null } | null;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  isInstallment?: boolean;
  recurrenceRule?: {
    type?: TransactionType;
    category?: string;
    frequency?: string;
    startDate?: string;
    value?: number;
  } | null;
  installmentIndex?: number;
  installmentCount?: number;
  installmentPlan?: {
    totalAmount?: number;
    totalInstallments?: number;
    currentInstallment?: number;
    installmentAmount?: number;
    purchaseDate?: string;
  } | null;
  status?: TransactionStatus;
  isVirtual?: boolean;
}

interface ImportResponsePayload {
  message?: string;
  importedCount?: number;
  createdCount?: number;
  duplicatesCount?: number;
  skippedCount?: number;
  earliestTransactionDate?: string | null;
  latestTransactionDate?: string | null;
  [key: string]: unknown;
}

interface ImportResponse {
  success?: boolean;
  message?: string;
  data?: ImportResponsePayload;
  [key: string]: unknown;
}

interface TransactionFormState {
  type: TransactionType;
  description: string;
  amount: string;
  category: string;
  account: string;
  creditCard: string;
  paymentMethod: PaymentMethod;
  date: string;
  isRecurring: boolean;
  isInstallment: boolean;
  installments: string;
}

const EXPENSE_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'debit', label: 'Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer', label: 'Transfer.' },
  { value: 'credit', label: 'Crédito' },
];

const INCOME_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transfer.' },
  { value: 'cash', label: 'Dinheiro' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const INPUT_CLASS =
  'w-full rounded-[1.2rem] border border-transparent bg-slate-50 px-4 py-3.5 font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/20 focus:ring-4 focus:ring-[#3498DB]/10';

const SELECT_CLASS =
  'w-full appearance-none rounded-[1.2rem] border border-transparent bg-slate-50 px-4 py-3.5 font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/20 focus:ring-4 focus:ring-[#3498DB]/10';

function getDefaultPaymentMethod(type: TransactionType): PaymentMethod {
  return type === 'income' ? 'transfer' : 'pix';
}

function getMethodOptions(type: TransactionType) {
  return type === 'income' ? INCOME_METHOD_OPTIONS : EXPENSE_METHOD_OPTIONS;
}

function sanitizePaymentMethod(type: TransactionType, paymentMethod: PaymentMethod): PaymentMethod {
  const allowed = getMethodOptions(type).map((option) => option.value);
  return allowed.includes(paymentMethod) ? paymentMethod : getDefaultPaymentMethod(type);
}

function createInitialForm(): TransactionFormState {
  return {
    type: 'expense',
    description: '',
    amount: '',
    category: '',
    account: '',
    creditCard: '',
    paymentMethod: 'pix',
    date: getTodayISODateUTC(),
    isRecurring: false,
    isInstallment: false,
    installments: '2',
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTodayISODateUTC() {
  const now = new Date();
  return formatISODateUTC(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  );
}

function parseISODateOnlyUTC(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseDateLikeUTC(value?: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISODateOnlyUTC(value);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatISODateUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  const date = parseDateLikeUTC(value);
  if (!date) return '---';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatMonthLabelFromDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function createUTCMonthDate(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
}

function getLastDayOfMonthUTC(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

function buildClampedUTCDate(year: number, monthIndex: number, day: number) {
  const safeDay = Math.min(day, getLastDayOfMonthUTC(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, safeDay, 12, 0, 0));
}

function calculateMonthDiff(baseDate: Date, targetYear: number, targetMonth: number) {
  return (targetYear - baseDate.getUTCFullYear()) * 12 + (targetMonth - baseDate.getUTCMonth());
}

function calculateCreditCardDueDate(
  purchaseDateISO: string,
  closingDay: number,
  dueDay: number
): string {
  const purchaseDate = parseISODateOnlyUTC(purchaseDateISO);
  if (!purchaseDate) return purchaseDateISO;

  const purchaseYear = purchaseDate.getUTCFullYear();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const purchaseDay = purchaseDate.getUTCDate();

  let dueMonth = purchaseMonth;
  let dueYear = purchaseYear;

  if (purchaseDay > closingDay) {
    dueMonth += 1;
  }

  if (dueDay <= closingDay) {
    dueMonth += 1;
  }

  while (dueMonth > 11) {
    dueMonth -= 12;
    dueYear += 1;
  }

  const safeDueDay = Math.min(dueDay, getLastDayOfMonthUTC(dueYear, dueMonth));
  return formatISODateUTC(new Date(Date.UTC(dueYear, dueMonth, safeDueDay, 12, 0, 0)));
}

function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function getLinkedAccountName(card: CreditCardWithMetrics | null) {
  if (!card?.linkedAccount) return null;
  if (typeof card.linkedAccount === 'string') return null;
  return card.linkedAccount.name || null;
}

function getTransactionBaseDate(transaction: TransactionItem) {
  return parseDateLikeUTC(transaction.transactionDate || transaction.purchaseDate);
}

function getTransactionTimingLabel(transaction: TransactionItem) {
  const isCredit = transaction.paymentMethod === 'credit';
  const purchaseDate = formatDate(transaction.purchaseDate || transaction.installmentPlan?.purchaseDate);
  const competencyDate = formatDate(transaction.transactionDate || transaction.purchaseDate);

  if (isCredit) {
    return {
      primaryLabel: 'Compra',
      primaryValue: purchaseDate,
      secondaryLabel: 'Competência',
      secondaryValue: competencyDate,
    };
  }

  return {
    primaryLabel: 'Data',
    primaryValue: competencyDate,
    secondaryLabel: null,
    secondaryValue: null,
  };
}

async function importTransactionsFile({
  file,
  targetType,
  accountId,
  creditCardId,
}: {
  file: File;
  targetType: ImportTargetType;
  accountId?: string;
  creditCardId?: string;
}): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (targetType === 'account' && accountId) {
    formData.append('accountId', accountId);
  }

  if (targetType === 'creditCard' && creditCardId) {
    formData.append('creditCardId', creditCardId);
  }

  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('monity_token') : null;

  const response = await fetch(`${getApiBaseUrl()}/transactions/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: ImportResponse = {};

  if (contentType.includes('application/json')) {
    payload = (await response.json()) as ImportResponse;
  } else {
    const text = await response.text();
    payload = { message: text || 'Falha ao importar arquivo.' };
  }

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload?.data?.message ||
        payload?.message ||
        'Falha ao importar arquivo. Verifique o formato e tente novamente.'
    );
  }

  return payload;
}

function extractImportSummary(response: ImportResponse) {
  const data = response.data || {};

  return {
    importedCount:
      typeof data.importedCount === 'number'
        ? data.importedCount
        : typeof data.createdCount === 'number'
          ? data.createdCount
          : undefined,
    duplicatesCount: typeof data.duplicatesCount === 'number' ? data.duplicatesCount : undefined,
    skippedCount: typeof data.skippedCount === 'number' ? data.skippedCount : undefined,
    earliestTransactionDate:
      typeof data.earliestTransactionDate === 'string' ? data.earliestTransactionDate : null,
    latestTransactionDate:
      typeof data.latestTransactionDate === 'string' ? data.latestTransactionDate : null,
    message: data.message || response.message,
  };
}

function MetricCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone: 'blue' | 'red' | 'green' | 'slate';
  icon: ReactNode;
}) {
  const styles = {
    blue: 'bg-[#3498DB]/10 text-[#3498DB]',
    red: 'bg-rose-50 text-[#FF3366]',
    green: 'bg-[#2ECC71]/10 text-[#2ECC71]',
    slate: 'bg-slate-50 text-[#34495E]',
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner ${styles}`}>
        {icon}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {title}
        </p>
        <p className="truncate text-2xl font-black tracking-tighter text-[#34495E] sm:text-3xl">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

export default function TransactionsPage() {
  const {
    transactions,
    loading,
    loadAll,
    refreshDerivedData,
    deleteAndSync,
    createAndSync,
  } = useFinancialStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return createUTCMonthDate(now.getUTCFullYear(), now.getUTCMonth());
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [importTargetType, setImportTargetType] = useState<ImportTargetType>('account');
  const [selectedImportAccountId, setSelectedImportAccountId] = useState('');
  const [selectedImportCreditCardId, setSelectedImportCreditCardId] = useState('');

  const [form, setForm] = useState<TransactionFormState>(createInitialForm);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeTransactions = useMemo(
    () => (Array.isArray(transactions) ? (transactions as TransactionItem[]) : []),
    [transactions]
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.isActive !== false),
    [accounts]
  );

  const activeCreditCards = useMemo(
    () => creditCards.filter((card) => card.isActive !== false),
    [creditCards]
  );

  const selectedCreditCard = useMemo(() => {
    return (
      activeCreditCards.find((card) => card._id === form.creditCard) as CreditCardWithMetrics | undefined
    ) || null;
  }, [activeCreditCards, form.creditCard]);

  const selectedImportCreditCard = useMemo(() => {
    return (
      activeCreditCards.find((card) => card._id === selectedImportCreditCardId) as
        | CreditCardWithMetrics
        | undefined
    ) || null;
  }, [activeCreditCards, selectedImportCreditCardId]);

  const cardPreview = useMemo(() => {
    if (!selectedCreditCard || !form.date) return null;

    const estimatedDueDate = calculateCreditCardDueDate(
      form.date,
      Number(selectedCreditCard.closingDay),
      Number(selectedCreditCard.dueDay)
    );

    const dueDate = parseDateLikeUTC(estimatedDueDate);

    return {
      estimatedDueDate,
      dueLabel: dueDate ? formatDate(estimatedDueDate) : '---',
      cycleLabel: dueDate ? formatMonthLabelFromDate(dueDate) : '---',
      limit: selectedCreditCard.limit ?? null,
      availableLimit: selectedCreditCard.availableLimit ?? null,
      usedLimit: selectedCreditCard.usedLimit ?? null,
      linkedAccountName: getLinkedAccountName(selectedCreditCard),
    };
  }, [form.date, selectedCreditCard]);

  const loadInitialData = useCallback(async () => {
    try {
      const [cats, accs, cards] = await Promise.all([
        fetchCategories({}),
        fetchAccounts(),
        fetchCreditCards({}),
      ]);

      setCategories(cats);
      setAccounts(accs);
      setCreditCards(cards);

      const firstActiveAccount = accs.find((account) => account.isActive !== false);
      const firstActiveCard = cards.find((card) => card.isActive !== false);

      if (firstActiveAccount) {
        setSelectedImportAccountId(firstActiveAccount._id);
        setForm((prev) => ({
          ...prev,
          account: prev.account || firstActiveAccount._id,
        }));
      }

      if (firstActiveCard) {
        setSelectedImportCreditCardId(firstActiveCard._id);
        setForm((prev) => ({
          ...prev,
          creditCard: prev.creditCard || firstActiveCard._id,
        }));
      }

      await loadAll();
    } catch {
      toast.error('Erro ao carregar dados iniciais.');
    }
  }, [loadAll]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const filteredTransactions = useMemo(() => {
    const selectedMonth = viewDate.getUTCMonth();
    const selectedYear = viewDate.getUTCFullYear();
    const projectedList: TransactionItem[] = [];

    for (const transaction of safeTransactions) {
      const baseDate = getTransactionBaseDate(transaction);
      if (!baseDate) continue;

      const txMonth = baseDate.getUTCMonth();
      const txYear = baseDate.getUTCFullYear();

      if (txMonth === selectedMonth && txYear === selectedYear) {
        projectedList.push(transaction);
        continue;
      }

      if (transaction.isRecurring && transaction.recurrenceRule && !transaction.isInstallment) {
        const monthDiff = calculateMonthDiff(baseDate, selectedYear, selectedMonth);

        if (monthDiff > 0) {
          const virtualDate = buildClampedUTCDate(selectedYear, selectedMonth, baseDate.getUTCDate());

          projectedList.push({
            ...transaction,
            _id: `${transaction._id}-v-${monthDiff}`,
            transactionDate: virtualDate.toISOString(),
            purchaseDate: virtualDate.toISOString(),
            status: 'planned',
            isVirtual: true,
          });
        }
      }
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projectedList
      .filter((transaction) => {
        if (!normalizedSearch) return true;

        const description = transaction.description?.toLowerCase() || '';
        const categoryName = transaction.category?.name?.toLowerCase() || '';
        const accountName = transaction.account?.name?.toLowerCase() || '';
        const cardName = transaction.creditCard?.name?.toLowerCase() || '';

        return (
          description.includes(normalizedSearch) ||
          categoryName.includes(normalizedSearch) ||
          accountName.includes(normalizedSearch) ||
          cardName.includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        const dateA = getTransactionBaseDate(a)?.getTime() || 0;
        const dateB = getTransactionBaseDate(b)?.getTime() || 0;
        return dateB - dateA;
      });
  }, [safeTransactions, searchTerm, viewDate]);

  const totals = useMemo(() => {
    const income = roundMoney(
      filteredTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    );

    const expense = roundMoney(
      filteredTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    );

    return {
      income,
      expense,
      balance: roundMoney(income - expense),
    };
  }, [filteredTransactions]);

  const changeMonth = useCallback((offset: number) => {
    setViewDate((current) =>
      createUTCMonthDate(current.getUTCFullYear(), current.getUTCMonth() + offset)
    );
  }, []);

  const openImportModal = useCallback(() => {
    if (isImporting) return;
    setIsImportModalOpen(true);
  }, [isImporting]);

  const openCreateModal = useCallback(() => {
    setForm((prev) => ({
      ...createInitialForm(),
      account: prev.account || activeAccounts[0]?._id || '',
      creditCard: prev.creditCard || activeCreditCards[0]?._id || '',
    }));
    setIsModalOpen(true);
  }, [activeAccounts, activeCreditCards]);

  const handleConfirmImportTarget = useCallback(() => {
    if (importTargetType === 'account' && !selectedImportAccountId) {
      toast.error('Selecione a conta de destino para o extrato bancário.');
      return;
    }

    if (importTargetType === 'creditCard' && !selectedImportCreditCardId) {
      toast.error('Selecione o cartão de destino para o extrato de cartão.');
      return;
    }

    setIsImportModalOpen(false);
    fileInputRef.current?.click();
  }, [importTargetType, selectedImportAccountId, selectedImportCreditCardId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isSupported = lowerName.endsWith('.ofx') || lowerName.endsWith('.csv');

    if (!isSupported) {
      toast.error('Formato inválido. Envie um arquivo .ofx ou .csv.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (importTargetType === 'account' && !selectedImportAccountId) {
      toast.error('Selecione uma conta antes de importar.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (importTargetType === 'creditCard' && !selectedImportCreditCardId) {
      toast.error('Selecione um cartão antes de importar.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const toastId = toast.loading('Importando transações...');
    setIsImporting(true);

    try {
      const result = await importTransactionsFile({
        file,
        targetType: importTargetType,
        accountId: importTargetType === 'account' ? selectedImportAccountId : undefined,
        creditCardId: importTargetType === 'creditCard' ? selectedImportCreditCardId : undefined,
      });

      const summary = extractImportSummary(result);
      await refreshDerivedData();

      if (summary.earliestTransactionDate) {
        const firstImportedDate = parseDateLikeUTC(summary.earliestTransactionDate);

        if (firstImportedDate) {
          setViewDate(
            createUTCMonthDate(firstImportedDate.getUTCFullYear(), firstImportedDate.getUTCMonth())
          );
        }
      }

      const fragments: string[] = [];

      if (typeof summary.importedCount === 'number') {
        fragments.push(`${summary.importedCount} importada(s)`);
      }

      if (typeof summary.duplicatesCount === 'number' && summary.duplicatesCount > 0) {
        fragments.push(`${summary.duplicatesCount} duplicada(s) ignorada(s)`);
      }

      if (typeof summary.skippedCount === 'number' && summary.skippedCount > 0) {
        fragments.push(`${summary.skippedCount} ignorada(s)`);
      }

      const focusDate = summary.earliestTransactionDate
        ? parseDateLikeUTC(summary.earliestTransactionDate)
        : null;

      toast.success(
        `${
          fragments.length
            ? `Importação concluída: ${fragments.join(' • ')}`
            : summary.message || 'Importação concluída com sucesso!'
        }${focusDate ? ` • Mostrando ${formatMonthLabelFromDate(focusDate)}` : ''}`,
        { id: toastId }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao importar arquivo. Verifique o formato e tente novamente.';

      toast.error(message, { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      const nextPaymentMethod = sanitizePaymentMethod(type, form.paymentMethod);

      setForm((prev) => ({
        ...prev,
        type,
        paymentMethod: nextPaymentMethod,
        isInstallment: type === 'income' ? false : prev.isInstallment,
        installments: type === 'income' ? '2' : prev.installments,
        creditCard: nextPaymentMethod === 'credit' ? prev.creditCard || activeCreditCards[0]?._id || '' : '',
        account:
          nextPaymentMethod === 'credit'
            ? ''
            : prev.account || activeAccounts[0]?._id || '',
      }));
    },
    [activeAccounts, activeCreditCards, form.paymentMethod]
  );

  const handlePaymentMethodChange = useCallback(
    (paymentMethod: PaymentMethod) => {
      setForm((prev) => ({
        ...prev,
        paymentMethod,
        account: paymentMethod === 'credit' ? '' : prev.account || activeAccounts[0]?._id || '',
        creditCard:
          paymentMethod === 'credit' ? prev.creditCard || activeCreditCards[0]?._id || '' : '',
        isInstallment: paymentMethod === 'credit' && prev.type === 'expense' ? prev.isInstallment : false,
        installments:
          paymentMethod === 'credit' && prev.type === 'expense' ? prev.installments : '2',
      }));
    },
    [activeAccounts, activeCreditCards]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const description = form.description.trim();
    const numericAmount = roundMoney(Number(form.amount));
    const installmentCount = form.isInstallment ? Math.max(2, Number(form.installments) || 2) : 1;
    const isCredit = form.paymentMethod === 'credit';
    const selectedCategory = categories.find((category) => category._id === form.category);

    if (!description) {
      toast.error('Informe uma descrição.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }

    if (!form.category || !selectedCategory) {
      toast.error('Selecione uma categoria.');
      return;
    }

    if (selectedCategory.type !== form.type) {
      toast.error('A categoria selecionada não corresponde ao tipo do lançamento.');
      return;
    }

    if (isCredit && !form.creditCard) {
      toast.error('Selecione um cartão de crédito.');
      return;
    }

    if (!isCredit && !form.account) {
      toast.error('Selecione uma conta.');
      return;
    }

    if (form.isInstallment && form.type !== 'expense') {
      toast.error('Somente despesas podem ser parceladas.');
      return;
    }

    setIsSubmitting(true);

    try {
      const installmentAmount = form.isInstallment
        ? roundMoney(numericAmount / installmentCount)
        : numericAmount;

      const payload: TransactionPayload = {
        description,
        type: form.type,
        amount: numericAmount,
        category: form.category,
        paymentMethod: form.paymentMethod,
        transactionDate: form.date,
        purchaseDate: isCredit ? form.date : null,
        account: isCredit ? null : form.account,
        creditCard: isCredit ? form.creditCard : null,
      };

      if (!isCredit && form.isRecurring) {
        payload.isRecurring = true;
        payload.recurrenceRule = {
          type: form.type,
          category: form.category,
          frequency: 'monthly',
          startDate: form.date,
          value: numericAmount,
        };
      }

      if (isCredit && form.type === 'expense' && form.isInstallment) {
        payload.isInstallment = true;
        payload.installmentPlan = {
          totalAmount: numericAmount,
          totalInstallments: installmentCount,
          currentInstallment: 1,
          installmentAmount,
          purchaseDate: form.date,
          valueMode: 'total',
        };
      }

      await createAndSync(payload);

      toast.success(
        isCredit
          ? 'Compra lançada. O backend recalculou a competência do cartão.'
          : 'Lançamento criado com sucesso.'
      );

      setIsModalOpen(false);
      setForm((prev) => ({
        ...createInitialForm(),
        account: activeAccounts[0]?._id || prev.account || '',
        creditCard: activeCreditCards[0]?._id || prev.creditCard || '',
      }));
    } catch {
      toast.error('Erro ao salvar transação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);

    try {
      await deleteAndSync(deleteId.split('-v-')[0]);
      toast.success('Lançamento removido.');
    } catch {
      toast.error('Erro ao excluir lançamento.');
    } finally {
      setDeleteId(null);
      setIsDeleting(false);
    }
  };

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(viewDate);

  const deleteTarget = deleteId
    ? filteredTransactions.find((transaction) => transaction._id === deleteId)
    : null;

  const deleteMessage = deleteTarget?.isVirtual
    ? 'Este item é uma projeção recorrente. Ao excluir, a recorrência base será removida e os próximos meses também desaparecerão.'
    : 'Se houver parcelas vinculadas, todo o grupo será removido.';

  const currentMethodOptions = getMethodOptions(form.type);
  const isCredit = form.paymentMethod === 'credit';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-[1600px] space-y-6 px-4 pb-32 pt-4 sm:space-y-10 sm:px-6 sm:pt-6 lg:px-10"
    >
      <div className="flex flex-col gap-6 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full items-center justify-between gap-4 xl:w-auto xl:justify-start xl:gap-6">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-[1.2rem] bg-slate-50 p-3 text-slate-400 transition-all hover:bg-[#3498DB]/10 hover:text-[#3498DB]"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={24} strokeWidth={3} />
          </button>

          <div className="min-w-[190px] text-center">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#3498DB]">
              Período
            </p>
            <h1 className="text-xl font-black capitalize tracking-tighter text-[#34495E] sm:text-2xl">
              {monthLabel}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-[1.2rem] bg-slate-50 p-3 text-slate-400 transition-all hover:bg-[#3498DB]/10 hover:text-[#3498DB]"
            aria-label="Próximo mês"
          >
            <ChevronRight size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
          <div className="relative w-full xl:w-80">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Pesquisar lançamento, conta ou categoria..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-[1.2rem] border border-transparent bg-slate-50 py-3.5 pl-12 pr-4 font-bold text-[#34495E] outline-none transition-all focus:border-[#3498DB]/20 focus:ring-4 focus:ring-[#3498DB]/10"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={openImportModal}
            disabled={isImporting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-slate-100 px-6 py-3.5 font-black text-[#34495E] transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isImporting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload size={20} strokeWidth={3} />
                Importar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#2ECC71] px-8 py-3.5 font-black text-white shadow-lg shadow-[#2ECC71]/30 transition-all hover:scale-[1.02] active:scale-[0.99] sm:w-auto"
          >
            <Plus size={20} strokeWidth={3} />
            Lançar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <MetricCard
          title="Entradas"
          value={formatCurrency(totals.income)}
          tone="green"
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          title="Saídas"
          value={formatCurrency(totals.expense)}
          tone="red"
          icon={<TrendingDown size={20} />}
        />
        <MetricCard
          title="Balanço"
          value={formatCurrency(totals.balance)}
          tone="blue"
          icon={<Wallet size={20} />}
        />
      </div>

      <div className="min-h-[500px] overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 p-10 text-center">
            <Loader2 size={36} className="animate-spin text-[#2ECC71]" />
            <p className="text-sm font-bold text-slate-400">Carregando lançamentos...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex min-h-[500px] flex-col items-center justify-center p-10 text-center">
            <CalendarIcon className="mb-4 text-slate-200" size={52} />
            <p className="text-base font-black text-[#34495E]">Nenhum lançamento neste mês.</p>
            <p className="mt-2 text-sm font-bold text-slate-400">
              Tente mudar o período, pesquisar por outro termo ou importar um extrato.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-50">
            {filteredTransactions.map((transaction) => {
              const isIncome = transaction.type === 'income';
              const statusLabel = transaction.status === 'confirmed' ? '● Liquidado' : '○ Planejado';
              const destination =
                transaction.account?.name || transaction.creditCard?.name || 'Manual';
              const timing = getTransactionTimingLabel(transaction);

              return (
                <motion.div
                  key={transaction._id}
                  variants={itemVariants}
                  className="group flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/40 sm:p-8 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-5">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] shadow-inner ${
                        isIncome ? 'bg-emerald-50 text-[#2ECC71]' : 'bg-rose-50 text-[#FF3366]'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp size={24} strokeWidth={2.5} />
                      ) : (
                        <TrendingDown size={24} strokeWidth={2.5} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="flex flex-wrap items-center gap-2 text-lg font-black text-[#34495E]">
                        <span className="truncate">{transaction.description}</span>

                        {transaction.isInstallment ? (
                          <span className="rounded-lg bg-[#3498DB]/10 px-2 py-0.5 text-[9px] font-black uppercase text-[#3498DB]">
                            P {transaction.installmentIndex}/{transaction.installmentCount}
                          </span>
                        ) : null}

                        {transaction.isRecurring && !transaction.isVirtual ? (
                          <span className="rounded-lg bg-[#2ECC71]/10 px-2 py-0.5 text-[9px] font-black uppercase text-[#2ECC71]">
                            Recorrente
                          </span>
                        ) : null}

                        {transaction.paymentMethod === 'credit' ? (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">
                            Cartão
                          </span>
                        ) : null}

                        {transaction.isVirtual ? (
                          <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                            Projetado
                          </span>
                        ) : null}
                      </h3>

                      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        {transaction.category?.name || 'Geral'} • {destination}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-[0.9rem] bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-500">
                          <Receipt size={12} />
                          {timing.primaryLabel}: {timing.primaryValue}
                        </span>

                        {timing.secondaryLabel && timing.secondaryValue ? (
                          <span className="inline-flex items-center gap-1 rounded-[0.9rem] bg-[#3498DB]/10 px-3 py-1.5 text-[11px] font-black text-[#3498DB]">
                            <CalendarClock size={12} />
                            {timing.secondaryLabel}: {timing.secondaryValue}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-6 md:w-auto md:justify-end md:gap-8">
                    <div className="text-left md:text-right">
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                          transaction.status === 'confirmed' ? 'text-[#2ECC71]' : 'text-amber-500'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <p
                        className={`text-xl font-black tracking-tighter ${
                          isIncome ? 'text-[#2ECC71]' : 'text-[#34495E]'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(Number(transaction.amount || 0))}
                      </p>

                      <button
                        type="button"
                        onClick={() => setDeleteId(transaction._id)}
                        className="rounded-xl p-2 text-slate-300 transition-colors hover:text-rose-500"
                        aria-label="Excluir lançamento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isImportModalOpen ? (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative w-full max-w-xl rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#3498DB]">
                    Importação
                  </p>
                  <h2 className="text-2xl font-black tracking-tighter text-[#34495E]">
                    Escolha o destino do arquivo
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#34495E]"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setImportTargetType('account')}
                  className={`rounded-[1.5rem] border p-5 text-left transition-all ${
                    importTargetType === 'account'
                      ? 'border-[#3498DB]/30 bg-[#3498DB]/10 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB]">
                    <Landmark size={22} />
                  </div>
                  <h3 className="text-lg font-black tracking-tighter text-[#34495E]">
                    Conta bancária
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-slate-400">
                    Use para extrato de conta, PIX, TED, boletos e movimentações diretas.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportTargetType('creditCard')}
                  className={`rounded-[1.5rem] border p-5 text-left transition-all ${
                    importTargetType === 'creditCard'
                      ? 'border-[#2ECC71]/30 bg-[#2ECC71]/10 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2ECC71]/10 text-[#2ECC71]">
                    <CreditCardIcon size={22} />
                  </div>
                  <h3 className="text-lg font-black tracking-tighter text-[#34495E]">
                    Cartão de crédito
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-slate-400">
                    Use para OFX/CSV da fatura. O backend recalcula a competência da compra.
                  </p>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {importTargetType === 'account' ? (
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Conta de destino
                    </label>
                    <select
                      value={selectedImportAccountId}
                      onChange={(event) => setSelectedImportAccountId(event.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Selecione uma conta</option>
                      {activeAccounts.map((account) => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      O extrato será vinculado exatamente a esta conta.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Cartão de destino
                    </label>
                    <select
                      value={selectedImportCreditCardId}
                      onChange={(event) => setSelectedImportCreditCardId(event.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Selecione um cartão</option>
                      {activeCreditCards.map((card) => (
                        <option key={card._id} value={card._id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      Fechamento {selectedImportCreditCard?.closingDay || '--'} • vencimento{' '}
                      {selectedImportCreditCard?.dueDay || '--'}.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-full rounded-[1.2rem] bg-slate-100 py-3.5 font-bold text-slate-500 transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImportTarget}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#34495E] py-3.5 font-black text-white shadow-lg shadow-[#34495E]/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <FileUp size={18} />
                  Escolher arquivo
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2.5rem] bg-white p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#3498DB]">
                    Lançamento manual
                  </p>
                  <h2 className="text-xl font-black tracking-tighter text-[#34495E]">
                    Novo lançamento
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#34495E]"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex rounded-[1.2rem] bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 rounded-[0.9rem] py-2.5 text-xs font-black transition-all ${
                      form.type === 'expense'
                        ? 'bg-white text-[#FF3366] shadow-sm'
                        : 'text-slate-400'
                    }`}
                  >
                    Despesa
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 rounded-[0.9rem] py-2.5 text-xs font-black transition-all ${
                      form.type === 'income'
                        ? 'bg-white text-[#2ECC71] shadow-sm'
                        : 'text-slate-400'
                    }`}
                  >
                    Receita
                  </button>
                </div>

                <input
                  type="text"
                  required
                  placeholder="O que foi?"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className={INPUT_CLASS}
                />

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                    className="w-full rounded-[1.2rem] border border-transparent bg-slate-50 p-4 pl-12 text-2xl font-black tracking-tighter text-[#34495E] outline-none transition-all focus:border-[#3498DB]/20 focus:ring-4 focus:ring-[#3498DB]/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    required
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    className={SELECT_CLASS}
                  >
                    <option value="">Categoria</option>
                    {categories
                      .filter((category) => category.type === form.type)
                      .map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>

                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                    className={INPUT_CLASS}
                    aria-label={isCredit ? 'Data da compra' : 'Data do lançamento'}
                  />
                </div>

                <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {isCredit ? 'Data da compra' : 'Data do lançamento'}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-slate-500">
                    {isCredit
                      ? 'No crédito, o backend usa esta data como purchaseDate e recalcula automaticamente a competência/vencimento conforme o ciclo do cartão.'
                      : 'Fora do crédito, esta é a data real do lançamento e também a base da recorrência quando ativada.'}
                  </p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Forma de pagamento
                  </label>

                  <div className={`grid gap-2 ${form.type === 'income' ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {currentMethodOptions.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => handlePaymentMethodChange(method.value)}
                        className={`rounded-[0.9rem] py-2.5 text-[10px] font-black uppercase transition-all ${
                          form.paymentMethod === method.value
                            ? 'bg-[#34495E] text-white shadow-md'
                            : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>

                  {form.paymentMethod === 'credit' ? (
                    <div className="space-y-3">
                      <select
                        required
                        value={form.creditCard}
                        onChange={(event) => setForm((prev) => ({ ...prev, creditCard: event.target.value }))}
                        className={SELECT_CLASS}
                      >
                        <option value="">Qual cartão?</option>
                        {activeCreditCards.map((card) => (
                          <option key={card._id} value={card._id}>
                            {card.name}
                          </option>
                        ))}
                      </select>

                      {selectedCreditCard ? (
                        <div className="rounded-[1.4rem] border border-[#3498DB]/10 bg-[#3498DB]/5 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <CreditCardIcon size={16} className="text-[#3498DB]" />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#34495E]">
                              Prévia do cartão
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-500">
                            <div className="rounded-[1rem] bg-white px-3 py-2.5">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Fechamento
                              </p>
                              <p className="mt-1 text-[#34495E]">Dia {selectedCreditCard.closingDay}</p>
                            </div>
                            <div className="rounded-[1rem] bg-white px-3 py-2.5">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Vencimento
                              </p>
                              <p className="mt-1 text-[#34495E]">Dia {selectedCreditCard.dueDay}</p>
                            </div>
                            <div className="rounded-[1rem] bg-white px-3 py-2.5">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Competência estimada
                              </p>
                              <p className="mt-1 text-[#34495E]">{cardPreview?.cycleLabel || '---'}</p>
                            </div>
                            <div className="rounded-[1rem] bg-white px-3 py-2.5">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Vencimento estimado
                              </p>
                              <p className="mt-1 text-[#34495E]">{cardPreview?.dueLabel || '---'}</p>
                            </div>
                          </div>

                          {cardPreview?.linkedAccountName ? (
                            <p className="mt-3 text-xs font-bold text-slate-500">
                              Conta de pagamento vinculada: {cardPreview.linkedAccountName}
                            </p>
                          ) : null}

                          {cardPreview?.availableLimit !== null && cardPreview?.availableLimit !== undefined ? (
                            <div className="mt-3 rounded-[1rem] bg-white px-3 py-2.5 text-xs font-bold text-slate-500">
                              Limite disponível atual:{' '}
                              <span className="text-[#34495E]">
                                {formatCurrency(Number(cardPreview.availableLimit || 0))}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                          Cadastre ou selecione um cartão para lançar compras no crédito.
                        </div>
                      )}

                      {form.type === 'expense' ? (
                        <div className="rounded-[1.2rem] bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Split size={16} className="text-[#3498DB]" />
                              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#34495E]">
                                Parcelar compra
                              </span>
                            </div>

                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={form.isInstallment}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    isInstallment: event.target.checked,
                                    installments: event.target.checked ? prev.installments || '2' : '2',
                                  }))
                                }
                                className="h-4 w-4 accent-[#2ECC71]"
                              />
                              <span className="text-xs font-bold text-slate-500">Ativar</span>
                            </label>
                          </div>

                          {form.isInstallment ? (
                            <div className="mt-3 space-y-3">
                              <div className="flex items-center justify-between rounded-[1rem] bg-white px-3 py-2.5">
                                <span className="text-xs font-bold text-slate-500">Quantidade</span>
                                <input
                                  type="number"
                                  min="2"
                                  step="1"
                                  value={form.installments}
                                  onChange={(event) => setForm((prev) => ({ ...prev, installments: event.target.value }))}
                                  className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-sm font-black text-[#34495E] outline-none focus:border-[#3498DB]/20"
                                />
                              </div>

                              {Number(form.installments) >= 2 && Number(form.amount) > 0 ? (
                                <div className="rounded-[1rem] bg-white px-3 py-2.5 text-xs font-bold text-slate-500">
                                  Parcela estimada:{' '}
                                  <span className="text-[#34495E]">
                                    {formatCurrency(
                                      roundMoney(
                                        Number(form.amount) / Math.max(2, Number(form.installments) || 2)
                                      )
                                    )}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        required
                        value={form.account}
                        onChange={(event) => setForm((prev) => ({ ...prev, account: event.target.value }))}
                        className={SELECT_CLASS}
                      >
                        <option value="">Qual conta?</option>
                        {activeAccounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.name}
                          </option>
                        ))}
                      </select>

                      <div className="rounded-[1.2rem] bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Repeat size={16} className="text-[#2ECC71]" />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#34495E]">
                              Recorrente mensal
                            </span>
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.isRecurring}
                              onChange={(event) => setForm((prev) => ({ ...prev, isRecurring: event.target.checked }))}
                              className="h-4 w-4 accent-[#2ECC71]"
                            />
                            <span className="text-xs font-bold text-slate-500">Ativar</span>
                          </label>
                        </div>

                        <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
                          O sistema projeta os próximos meses visualmente e mantém o fluxo futuro organizado.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#2ECC71] py-4 text-base font-black text-white shadow-lg shadow-[#2ECC71]/30 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Confirmar
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl"
            >
              <AlertTriangle className="mx-auto mb-4 text-[#FF3366]" size={32} />
              <h3 className="mb-2 text-xl font-black tracking-tighter text-[#34495E]">
                Excluir lançamento?
              </h3>
              <p className="mb-6 text-sm font-bold leading-relaxed text-slate-400">
                {deleteMessage}
              </p>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="mb-2 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#FF3366] py-3.5 font-black text-white shadow-lg shadow-[#FF3366]/20 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sim, excluir'}
              </button>

              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="w-full rounded-[1.2rem] bg-slate-50 py-3.5 font-bold text-slate-500 transition-all hover:bg-slate-100"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}