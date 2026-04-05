import mongoose from 'mongoose';
import ofx from 'ofx-js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import CreditCard from '../models/CreditCard.js';
import { matchCategory } from '../utils/categoryMatcher.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const POPULATE_FIELDS = [
  { path: 'category' },
  { path: 'account' },
  { path: 'creditCard' },
];

const VALID_PAYMENT_METHODS = ['pix', 'debit', 'credit', 'cash', 'transfer', 'boleto'];
const VALID_STATUSES = ['confirmed', 'planned'];
const VALID_SOURCES = [
  'manual',
  'import',
  'installment',
  'recurrence',
  'salary',
  'carryover',
  'financing',
];

/* ================= HELPERS ================= */

const roundMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NaN;
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const normalizeObjectIdValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value?._id) return String(value._id);
  return String(value);
};

const normalizeGroupId = (value) => {
  if (!value) return new mongoose.Types.ObjectId().toHexString();
  return String(value);
};

const buildUTCDate = (year, monthIndex, day) => {
  const safeDay = Math.min(
    day,
    new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate()
  );

  return new Date(Date.UTC(year, monthIndex, safeDay, 12, 0, 0, 0));
};

const parseISODateOnlyUTC = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return buildUTCDate(Number(year), Number(month) - 1, Number(day));
};

const parseBRDateUTC = (value) => {
  const match = String(value || '').trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return buildUTCDate(Number(year), Number(month) - 1, Number(day));
};

const parseUSDateUTC = (value) => {
  const match = String(value || '').trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match;
  return buildUTCDate(Number(year), Number(month) - 1, Number(day));
};

const parseOFXDateUTC = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (digits.length < 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  if (!year || !month || !day) return null;
  return buildUTCDate(year, month - 1, day);
};

const parseDate = (value, fieldName = 'Data') => {
  if (!value) {
    throw new Error(`${fieldName} inválida`);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldName} inválida`);
    }

    return buildUTCDate(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    );
  }

  if (typeof value === 'string') {
    const iso = parseISODateOnlyUTC(value);
    if (iso) return iso;

    const br = parseBRDateUTC(value);
    if (br) return br;

    const us = parseUSDateUTC(value);
    if (us) return us;

    const ofxDate = parseOFXDateUTC(value);
    if (ofxDate) return ofxDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} inválida`);
  }

  return buildUTCDate(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );
};

const parseImportedDate = (value) => {
  if (!value) return null;

  try {
    return parseDate(value, 'Data');
  } catch {
    return null;
  }
};

const addMonthsKeepingDayUTC = (dateInput, monthsToAdd) => {
  const baseDate = parseDate(dateInput, 'Data base');
  const targetDay = baseDate.getUTCDate();

  const nextDate = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth() + monthsToAdd,
      targetDay,
      12,
      0,
      0,
      0
    )
  );

  if (nextDate.getUTCDate() !== targetDay) {
    nextDate.setUTCDate(0);
    nextDate.setUTCHours(12, 0, 0, 0);
  }

  return nextDate;
};

const stripAccents = (value = '') =>
  String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeKeywordText = (value = '') =>
  stripAccents(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizePaymentMethod = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return VALID_PAYMENT_METHODS.includes(normalized) ? normalized : null;
};

const sanitizeStatus = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return VALID_STATUSES.includes(normalized) ? normalized : null;
};

const sanitizeSource = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return VALID_SOURCES.includes(normalized) ? normalized : null;
};

const populateTransactionById = async (id) => {
  return Transaction.findById(id).populate(POPULATE_FIELDS);
};

const getTodayUTCDate = () => {
  const today = new Date();
  return buildUTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
};

const getStatusForTransactionDate = (transactionDate) => {
  const tx = parseDate(transactionDate, 'Data da transação');
  const todayUTC = getTodayUTCDate();

  return tx.getTime() > todayUTC.getTime() ? 'planned' : 'confirmed';
};

const calculateCreditCardDueDateUTC = (purchaseDateInput, closingDay, dueDay) => {
  const purchaseDate = parseDate(purchaseDateInput, 'Data de compra');
  const purchaseYear = purchaseDate.getUTCFullYear();
  const purchaseMonth = purchaseDate.getUTCMonth();
  const purchaseDay = purchaseDate.getUTCDate();

  let dueMonth = purchaseMonth;
  let dueYear = purchaseYear;

  if (purchaseDay > Number(closingDay)) {
    dueMonth += 1;
  }

  if (Number(dueDay) <= Number(closingDay)) {
    dueMonth += 1;
  }

  while (dueMonth > 11) {
    dueMonth -= 12;
    dueYear += 1;
  }

  return buildUTCDate(dueYear, dueMonth, Number(dueDay));
};

const resolveTransactionDates = ({
  paymentMethod,
  purchaseDate,
  transactionDate,
  creditCard,
}) => {
  const normalizedPurchaseDate = purchaseDate
    ? parseDate(purchaseDate, 'Data de compra')
    : transactionDate
      ? parseDate(transactionDate, 'Data da transação')
      : null;

  if (!normalizedPurchaseDate) {
    throw new Error('Data de compra ou data da transação é obrigatória');
  }

  if (paymentMethod === 'credit') {
    if (!creditCard) {
      throw new Error('Cartão de crédito obrigatório para calcular a competência');
    }

    const competencyDate = calculateCreditCardDueDateUTC(
      normalizedPurchaseDate,
      Number(creditCard.closingDay),
      Number(creditCard.dueDay)
    );

    return {
      purchaseDate: normalizedPurchaseDate,
      transactionDate: competencyDate,
      cycleClosingDay: Number(creditCard.closingDay),
      cycleDueDay: Number(creditCard.dueDay),
    };
  }

  return {
    purchaseDate: normalizedPurchaseDate,
    transactionDate: transactionDate
      ? parseDate(transactionDate, 'Data da transação')
      : normalizedPurchaseDate,
    cycleClosingDay: null,
    cycleDueDay: null,
  };
};

const normalizeInstallmentPlan = ({
  installmentPlan,
  amount,
  purchaseDate,
}) => {
  if (!installmentPlan || typeof installmentPlan !== 'object') {
    throw new Error('Transações parceladas exigem um plano de parcelamento válido');
  }

  const totalInstallments = Number(
    installmentPlan.totalInstallments ?? installmentPlan.installmentCount
  );
  const currentInstallment = Number(
    installmentPlan.currentInstallment ?? installmentPlan.installmentIndex ?? 1
  );
  const installmentAmount = roundMoney(
    installmentPlan.installmentAmount ?? amount
  );

  if (!Number.isInteger(totalInstallments) || totalInstallments < 2) {
    throw new Error('Quantidade de parcelas inválida');
  }

  if (
    !Number.isInteger(currentInstallment) ||
    currentInstallment < 1 ||
    currentInstallment > totalInstallments
  ) {
    throw new Error('Parcela atual inválida');
  }

  if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
    throw new Error('Valor da parcela inválido');
  }

  const normalizedPurchaseDate = parseDate(
    installmentPlan.purchaseDate || purchaseDate,
    'Data de compra'
  );

  const totalAmount =
    installmentPlan.totalAmount !== undefined && installmentPlan.totalAmount !== null
      ? roundMoney(installmentPlan.totalAmount)
      : roundMoney(installmentAmount * totalInstallments);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Valor total do parcelamento inválido');
  }

  return {
    totalInstallments,
    currentInstallment,
    installmentAmount,
    purchaseDate: normalizedPurchaseDate,
    totalAmount,
    description: installmentPlan.description || '',
    valueMode: installmentPlan.valueMode || 'installment',
  };
};

const buildPayloadFromExistingTransaction = (transaction, payload = {}) => {
  return {
    description:
      payload.description !== undefined
        ? payload.description
        : transaction.description,
    type: payload.type !== undefined ? payload.type : transaction.type,
    amount: payload.amount !== undefined ? payload.amount : transaction.amount,
    category:
      payload.category !== undefined
        ? payload.category
        : normalizeObjectIdValue(transaction.category),
    account:
      payload.account !== undefined
        ? payload.account
        : normalizeObjectIdValue(transaction.account),
    creditCard:
      payload.creditCard !== undefined
        ? payload.creditCard
        : normalizeObjectIdValue(transaction.creditCard),
    paymentMethod:
      payload.paymentMethod !== undefined
        ? payload.paymentMethod
        : transaction.paymentMethod,
    transactionDate:
      payload.transactionDate !== undefined
        ? payload.transactionDate
        : transaction.transactionDate,
    purchaseDate:
      payload.purchaseDate !== undefined
        ? payload.purchaseDate
        : transaction.purchaseDate ||
          transaction.installmentPlan?.purchaseDate ||
          transaction.transactionDate,
    notes: payload.notes !== undefined ? payload.notes : transaction.notes,
    isRecurring:
      payload.isRecurring !== undefined
        ? payload.isRecurring
        : transaction.isRecurring,
    recurrenceRule:
      payload.recurrenceRule !== undefined
        ? payload.recurrenceRule
        : transaction.recurrenceRule,
    isInstallment:
      payload.isInstallment !== undefined
        ? payload.isInstallment
        : transaction.isInstallment,
    installmentPlan:
      payload.installmentPlan !== undefined
        ? payload.installmentPlan
        : transaction.installmentPlan,
    groupId:
      payload.groupId !== undefined ? payload.groupId : transaction.groupId,
    status: payload.status !== undefined ? payload.status : transaction.status,
    source: payload.source !== undefined ? payload.source : transaction.source,
  };
};

const detectCsvDelimiter = (lines) => {
  const sample = lines.slice(0, 5).join('\n');
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (tabs >= semicolons && tabs >= commas) return '\t';
  if (semicolons >= commas) return ';';
  return ',';
};

const splitCsvLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const getRowValue = (row, candidates) => {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== null && row[candidate] !== '') {
      return row[candidate];
    }
  }
  return null;
};

const coerceAmount = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  let raw = String(value || '').trim();
  if (!raw) return NaN;

  const isNegativeByParenthesis = /^\(.*\)$/.test(raw);
  raw = raw.replace(/[()]/g, '');
  raw = raw.replace(/[R$\s]/gi, '');

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');

  if (hasComma && hasDot) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return NaN;

  return isNegativeByParenthesis ? -parsed : parsed;
};

const normalizeTypeFromRow = ({ typeRaw, amount }) => {
  const normalized = normalizeKeywordText(typeRaw || '');

  if (['income', 'receita', 'credito', 'credit', 'entrada', 'inflow'].includes(normalized)) {
    return 'income';
  }

  if (['expense', 'despesa', 'debito', 'debit', 'saida', 'outflow'].includes(normalized)) {
    return 'expense';
  }

  return amount >= 0 ? 'income' : 'expense';
};

const SPECIAL_CATEGORY_HINTS = [
  {
    key: 'investment-application',
    type: 'expense',
    descriptionPatterns: [/aplicacao rdb/i, /aplica[cç][aã]o rdb/i, /investimento/i, /caixinha/i],
    categoryKeywords: ['invest', 'aplic', 'rdb', 'reserva', 'caixinha', 'guardado'],
  },
  {
    key: 'investment-redemption',
    type: 'income',
    descriptionPatterns: [/resgate rdb/i, /resgate/i, /rendimento/i],
    categoryKeywords: ['invest', 'resgate', 'rdb', 'reserva', 'rendimento', 'aplic'],
  },
  {
    key: 'invoice-payment',
    type: 'expense',
    descriptionPatterns: [/pagamento de fatura/i, /fatura/i],
    categoryKeywords: ['cartao', 'cart', 'fatura', 'credito'],
  },
  {
    key: 'food-delivery',
    type: 'expense',
    descriptionPatterns: [/ifood/i],
    categoryKeywords: ['aliment', 'comida', 'refeic', 'restaurante', 'delivery', 'mercado'],
  },
  {
    key: 'fuel',
    type: 'expense',
    descriptionPatterns: [/posto/i, /combust/i],
    categoryKeywords: ['combust', 'carro', 'veiculo', 'transporte'],
  },
];

const findCategoryByHints = ({ description, type, categories }) => {
  const normalizedDescription = normalizeKeywordText(description);

  const matchedHints = SPECIAL_CATEGORY_HINTS.filter((hint) => {
    if (hint.type !== type) return false;
    return hint.descriptionPatterns.some((pattern) => pattern.test(normalizedDescription));
  });

  if (!matchedHints.length) return null;

  let bestCategory = null;
  let bestScore = 0;

  for (const category of categories) {
    const normalizedCategoryName = normalizeKeywordText(category.name || '');
    let score = 0;

    for (const hint of matchedHints) {
      for (const keyword of hint.categoryKeywords) {
        if (normalizedCategoryName.includes(keyword)) {
          score += 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory?._id ? String(bestCategory._id) : null;
};

const inferPaymentMethodFromDescription = ({ description, type, isCreditCard }) => {
  if (isCreditCard) return 'credit';

  const normalized = normalizeKeywordText(description);

  if (normalized.includes('aplicacao rdb') || normalized.includes('resgate rdb')) {
    return 'transfer';
  }

  if (normalized.includes('pagamento de fatura') || normalized.includes('fatura')) {
    return 'transfer';
  }

  if (type === 'income') return 'transfer';

  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('debito')) return 'debit';
  if (
    normalized.includes('transferencia') ||
    normalized.includes('ted') ||
    normalized.includes('doc') ||
    normalized.includes('boleto') ||
    normalized.includes('pagamento')
  ) {
    return 'transfer';
  }

  return 'pix';
};

const parseOFXBuffer = async (buffer) => {
  const rawData = buffer.toString('utf-8');
  const ofxStartIndex = rawData.indexOf('<OFX>');

  if (ofxStartIndex === -1) {
    throw new Error('Arquivo OFX inválido.');
  }

  const lines = rawData.slice(ofxStartIndex).split(/\r?\n/);
  const mergedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('<')) {
      mergedLines.push(trimmed);
    } else if (mergedLines.length > 0) {
      mergedLines[mergedLines.length - 1] += ` ${trimmed}`;
    }
  }

  const ofxData = await ofx.parse(mergedLines.join('\n'));

  const bankMsg =
    ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
  const creditMsg =
    ofxData?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

  let rawTransactions = [];
  let isCreditCard = false;

  if (bankMsg) {
    rawTransactions = bankMsg;
    isCreditCard = false;
  } else if (creditMsg) {
    rawTransactions = creditMsg;
    isCreditCard = true;
  }

  if (!rawTransactions) {
    throw new Error('Nenhuma transação encontrada no OFX.');
  }

  const transactionsArray = Array.isArray(rawTransactions)
    ? rawTransactions
    : [rawTransactions];

  return {
    kind: 'ofx',
    isCreditCard,
    rows: transactionsArray.map((trn, index) => ({
      rowNumber: index + 1,
      description: String(trn.MEMO || trn.NAME || 'Transação OFX').trim(),
      amount: coerceAmount(trn.TRNAMT),
      postedAt: parseOFXDateUTC(trn.DTPOSTED),
      fitid: trn.FITID ? String(trn.FITID) : null,
      typeRaw: trn.TRNTYPE ? String(trn.TRNTYPE) : null,
      raw: trn,
    })),
  };
};

const parseCSVBuffer = (buffer) => {
  const raw = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV inválido: cabeçalho ou linhas ausentes.');
  }

  const delimiter = detectCsvDelimiter(lines);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeKeywordText);

  const rows = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index], delimiter);
    const row = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });

    const description = getRowValue(row, [
      'descricao',
      'description',
      'historico',
      'memo',
      'name',
      'titulo',
      'detalhe',
      'detalhes',
      'lancamento',
      'lançamento',
    ]);

    const explicitAmount = getRowValue(row, [
      'valor',
      'amount',
      'vlr',
      'quantia',
      'valorliquido',
      'valorfinal',
      'valorbruto',
      'total',
    ]);

    const creditValue = getRowValue(row, ['credito', 'credit', 'entrada']);
    const debitValue = getRowValue(row, ['debito', 'débito', 'debit', 'saida', 'saída']);

    let amount = NaN;

    if (explicitAmount !== null) {
      amount = coerceAmount(explicitAmount);
    } else if (creditValue !== null || debitValue !== null) {
      const credit = creditValue !== null ? coerceAmount(creditValue) : 0;
      const debit = debitValue !== null ? coerceAmount(debitValue) : 0;
      amount = credit - debit;
    }

    const dateRaw = getRowValue(row, [
      'data',
      'date',
      'transactiondate',
      'datatransacao',
      'datamovimento',
      'dtposted',
      'competencia',
      'lançamento',
      'lancamento',
    ]);

    const typeRaw = getRowValue(row, ['tipo', 'type', 'natureza']);
    const fitid = getRowValue(row, ['fitid', 'id', 'identificador', 'documento', 'nsu']);

    rows.push({
      rowNumber: index + 1,
      description: String(description || '').trim(),
      amount,
      postedAt: parseImportedDate(dateRaw),
      fitid: fitid ? String(fitid).trim() : null,
      typeRaw: typeRaw ? String(typeRaw).trim() : null,
      raw: row,
    });
  }

  return {
    kind: 'csv',
    isCreditCard: false,
    rows,
  };
};

const parseImportFile = async (file) => {
  if (!file?.buffer) {
    throw new Error('Arquivo não enviado.');
  }

  const fileName = String(file.originalname || '').toLowerCase();

  if (fileName.endsWith('.ofx')) {
    return parseOFXBuffer(file.buffer);
  }

  if (fileName.endsWith('.csv')) {
    return parseCSVBuffer(file.buffer);
  }

  throw new Error('Formato inválido. Envie um arquivo .ofx ou .csv.');
};

/* ================= VALIDATIONS ================= */

const validateCategory = async ({ userId, categoryId, type }) => {
  if (!categoryId || !isValidObjectId(categoryId)) {
    throw new Error('ID de categoria inválido ou ausente.');
  }

  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
  });

  if (!category) {
    throw new Error('Categoria não encontrada no banco de dados.');
  }

  if (category.type !== type) {
    throw new Error(
      `A categoria "${category.name}" é de ${category.type}, mas a transação é de ${type}.`
    );
  }

  return category;
};

const validateAccount = async ({ userId, accountId }) => {
  if (!accountId) return null;
  if (!isValidObjectId(accountId)) throw new Error('Conta inválida');

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });

  if (!account) throw new Error('Conta não encontrada');
  return account;
};

const validateCreditCard = async ({ userId, creditCardId }) => {
  if (!creditCardId) return null;
  if (!isValidObjectId(creditCardId)) throw new Error('Cartão inválido');

  const card = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!card) throw new Error('Cartão não encontrado');
  return card;
};

const validateRecurringRule = async ({
  userId,
  type,
  category,
  isRecurring,
  recurrenceRule,
}) => {
  if (!isRecurring) return null;

  if (!recurrenceRule || typeof recurrenceRule !== 'object') {
    throw new Error(
      'Transações recorrentes exigem uma regra de recorrência detalhada'
    );
  }

  const {
    type: recurrenceType,
    value,
    category: recurrenceCategory,
    frequency,
    dayOfMonth,
    startDate,
  } = recurrenceRule;

  if (!recurrenceType) {
    throw new Error('Campo obrigatório ausente na recorrência: type');
  }
  if (!value || Number(value) <= 0) {
    throw new Error('Valor da recorrência ausente ou inválido');
  }
  if (!recurrenceCategory) {
    throw new Error('Categoria da recorrência ausente');
  }
  if (!frequency) {
    throw new Error('Frequência da recorrência ausente');
  }
  if (!startDate) {
    throw new Error('Data inicial da recorrência ausente');
  }

  if (recurrenceType !== type) {
    throw new Error('Tipo da recorrência deve ser igual ao tipo da transação');
  }

  if (recurrenceCategory !== category) {
    throw new Error(
      'Categoria da recorrência deve ser igual à categoria da transação'
    );
  }

  const allowedFrequencies = [
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly',
  ];

  if (!allowedFrequencies.includes(frequency)) {
    throw new Error('Frequência da recorrência inválida');
  }

  if (dayOfMonth !== undefined && dayOfMonth !== null && dayOfMonth !== '') {
    const parsedDay = Number(dayOfMonth);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      throw new Error('Dia da recorrência inválido');
    }
  }

  await validateCategory({
    userId,
    categoryId: recurrenceCategory,
    type: recurrenceType,
  });

  const parsedStartDate = parseDate(startDate, 'Data inicial da recorrência');

  return {
    type: recurrenceType,
    value: roundMoney(value),
    category: recurrenceCategory,
    frequency,
    dayOfMonth:
      dayOfMonth !== undefined && dayOfMonth !== null && dayOfMonth !== ''
        ? Number(dayOfMonth)
        : null,
    startDate: parsedStartDate,
  };
};

const resolveImportDestination = async ({
  userId,
  isCreditCard,
  accountId,
  creditCardId,
}) => {
  if (isCreditCard) {
    if (creditCardId) {
      const selectedCard = await validateCreditCard({
        userId,
        creditCardId,
      });

      return {
        mode: 'creditCard',
        creditCard: selectedCard,
        account: null,
      };
    }

    const userCards = await CreditCard.find({ user: userId });

    if (userCards.length === 1) {
      return {
        mode: 'creditCard',
        creditCard: userCards[0],
        account: null,
      };
    }

    throw new Error(
      'Importação de cartão exige um cartão definido. Envie o creditCardId no upload ou deixe apenas um cartão cadastrado.'
    );
  }

  if (accountId) {
    const selectedAccount = await validateAccount({
      userId,
      accountId,
    });

    return {
      mode: 'account',
      account: selectedAccount,
      creditCard: null,
    };
  }

  const userAccounts = await Account.find({
    user: userId,
    type: { $in: ['checking', 'wallet', 'cash', 'savings'] },
  });

  if (userAccounts.length === 1) {
    return {
      mode: 'account',
      account: userAccounts[0],
      creditCard: null,
    };
  }

  throw new Error(
    'Importação de extrato bancário exige uma conta definida. Envie o accountId no upload ou deixe apenas uma conta cadastrada.'
  );
};

const findCategoryForImportedTransaction = async ({
  userId,
  description,
  type,
  categoriesByType,
  memoryCache,
}) => {
  const cacheKey = `${type}:${description}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const allowedCategories = categoriesByType[type] || [];
  let categoryId = null;

  const hintedCategoryId = findCategoryByHints({
    description,
    type,
    categories: allowedCategories,
  });

  if (hintedCategoryId) {
    categoryId = hintedCategoryId;
  }

  if (!categoryId) {
    const lastSameTx = await Transaction.findOne({
      user: userId,
      description,
      type,
    })
      .sort({ transactionDate: -1 })
      .select('category');

    if (lastSameTx?.category) {
      categoryId = normalizeObjectIdValue(lastSameTx.category);
    }
  }

  if (!categoryId) {
    categoryId = matchCategory(description, allowedCategories);
  }

  if (!categoryId) {
    const fallback =
      allowedCategories.find((category) =>
        normalizeKeywordText(category.name).includes('outros')
      ) || allowedCategories[0];

    categoryId = fallback?._id ? String(fallback._id) : null;
  }

  if (!categoryId) {
    throw new Error(
      `Você precisa de ao menos uma categoria de ${type === 'income' ? 'Receita' : 'Despesa'}.`
    );
  }

  memoryCache.set(cacheKey, categoryId);
  return categoryId;
};

const buildImportNotes = ({ fileName, fitid, rowNumber, kind }) => {
  const parts = [
    `Importado automaticamente via ${String(kind || 'arquivo').toUpperCase()}`,
    `Arquivo: ${fileName}`,
  ];

  if (fitid) parts.push(`FITID: ${fitid}`);
  if (rowNumber) parts.push(`Linha: ${rowNumber}`);

  return parts.join(' | ');
};

const findExistingDuplicate = async ({
  userId,
  description,
  type,
  amount,
  transactionDate,
  paymentMethod,
  account,
  creditCard,
  fitid,
}) => {
  const txDate = parseDate(transactionDate, 'Data da transação');

  const startOfDayUTC = new Date(
    Date.UTC(
      txDate.getUTCFullYear(),
      txDate.getUTCMonth(),
      txDate.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const endOfDayUTC = new Date(
    Date.UTC(
      txDate.getUTCFullYear(),
      txDate.getUTCMonth(),
      txDate.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  const baseQuery = {
    user: userId,
    description,
    type,
    amount,
    paymentMethod,
    transactionDate: { $gte: startOfDayUTC, $lte: endOfDayUTC },
    ...(account ? { account } : { account: null }),
    ...(creditCard ? { creditCard } : { creditCard: null }),
  };

  let existing = await Transaction.findOne(baseQuery).select('_id');
  if (existing) return existing;

  if (fitid) {
    existing = await Transaction.findOne({
      user: userId,
      notes: { $regex: new RegExp(`FITID:\\s*${escapeRegExp(fitid)}`) },
    }).select('_id');

    if (existing) return existing;
  }

  return null;
};

/* ================= CORE PAYLOAD ================= */

const buildTransactionPayload = async ({ userId, payload }) => {
  const {
    description,
    type,
    amount,
    category,
    account,
    creditCard,
    paymentMethod,
    transactionDate,
    purchaseDate,
    notes,
    isRecurring,
    recurrenceRule,
    isInstallment,
    installmentPlan,
    groupId,
    status,
    source,
  } = payload;

  if (!type || !['income', 'expense'].includes(type)) {
    throw new Error('Tipo é obrigatório');
  }

  const normalizedAmount = roundMoney(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Valor inválido');
  }

  if (!category) {
    throw new Error(
      `A transação "${description || 'Importada'}" está sem categoria definida.`
    );
  }

  await validateCategory({ userId, categoryId: category, type });

  let finalAccount = null;
  let finalCreditCard = null;
  let finalPaymentMethod = sanitizePaymentMethod(paymentMethod);
  let validatedCreditCard = null;

  if (type === 'expense') {
    if (!finalPaymentMethod) {
      throw new Error('Forma de pagamento obrigatória para despesas');
    }

    if (finalPaymentMethod === 'credit') {
      if (!creditCard) {
        throw new Error('Cartão de crédito obrigatório para esse lançamento');
      }

      validatedCreditCard = await validateCreditCard({ userId, creditCardId: creditCard });
      finalCreditCard = normalizeObjectIdValue(validatedCreditCard._id);
      finalAccount = null;
    } else {
      if (!account) {
        throw new Error('Conta obrigatória para despesas fora do cartão');
      }

      const validatedAccount = await validateAccount({ userId, accountId: account });
      finalAccount = normalizeObjectIdValue(validatedAccount._id);
      finalCreditCard = null;
    }
  } else {
    finalPaymentMethod = finalPaymentMethod || 'transfer';

    if (!account) {
      throw new Error('Conta obrigatória para receitas');
    }

    const validatedAccount = await validateAccount({ userId, accountId: account });
    finalAccount = normalizeObjectIdValue(validatedAccount._id);
    finalCreditCard = null;
  }

  const actualIsRecurring = !!isRecurring;
  const actualIsInstallment = type === 'expense' ? !!isInstallment : false;

  if (actualIsRecurring && actualIsInstallment) {
    throw new Error('Uma transação não pode ser recorrente e parcelada ao mesmo tempo');
  }

  const resolvedDates = resolveTransactionDates({
    paymentMethod: finalPaymentMethod,
    purchaseDate,
    transactionDate,
    creditCard: validatedCreditCard,
  });

  const rawRecurrenceRule = actualIsRecurring
    ? recurrenceRule || payload.recurringRule || null
    : null;

  const normalizedRecurringRule = await validateRecurringRule({
    userId,
    type,
    category,
    isRecurring: actualIsRecurring,
    recurrenceRule: rawRecurrenceRule
      ? {
          ...rawRecurrenceRule,
          startDate: rawRecurrenceRule.startDate || resolvedDates.transactionDate,
        }
      : null,
  });

  const normalizedInstallmentPlan = actualIsInstallment
    ? normalizeInstallmentPlan({
        installmentPlan,
        amount: normalizedAmount,
        purchaseDate: resolvedDates.purchaseDate,
      })
    : null;

  let transactionSource = sanitizeSource(source);

  if (!transactionSource) {
    if (actualIsInstallment) {
      transactionSource =
        finalPaymentMethod === 'credit' ? 'installment' : 'financing';
    } else if (actualIsRecurring) {
      transactionSource = 'recurrence';
    } else {
      transactionSource = 'manual';
    }
  }

  const normalizedStatus = sanitizeStatus(status) || getStatusForTransactionDate(resolvedDates.transactionDate);

  return {
    description: description?.trim() || 'Transação importada',
    type,
    amount: normalizedAmount,
    category,
    account: finalAccount,
    creditCard: finalCreditCard,
    paymentMethod: finalPaymentMethod,
    transactionDate: resolvedDates.transactionDate,
    purchaseDate: resolvedDates.purchaseDate,
    status: normalizedStatus,
    source: transactionSource,
    notes: notes?.trim() || '',
    isRecurring: actualIsRecurring,
    isInstallment: actualIsInstallment,
    recurrenceRule: normalizedRecurringRule,
    installmentPlan: normalizedInstallmentPlan,
    groupId: actualIsInstallment ? normalizeGroupId(groupId) : null,
  };
};

/* ================= INSTALLMENTS ================= */

const generateInstallments = ({ basePayload }) => {
  const groupId = normalizeGroupId(basePayload.groupId);
  const { installmentPlan } = basePayload;

  const baseDate = parseDate(basePayload.transactionDate, 'Data da transação');
  const { totalInstallments, currentInstallment, installmentAmount, purchaseDate } =
    installmentPlan;

  const transactions = [];

  for (let i = currentInstallment; i <= totalInstallments; i += 1) {
    const nextDate = addMonthsKeepingDayUTC(baseDate, i - currentInstallment);

    transactions.push({
      ...basePayload,
      amount: installmentAmount,
      transactionDate: nextDate,
      purchaseDate,
      installmentIndex: i,
      installmentCount: totalInstallments,
      groupId,
      installmentPlan: {
        ...installmentPlan,
        currentInstallment: i,
      },
      status: getStatusForTransactionDate(nextDate),
      source:
        basePayload.paymentMethod === 'credit' ? 'installment' : 'financing',
    });
  }

  return transactions;
};

/* ================= IMPORT ================= */

export const importFromUpload = async ({
  userId,
  file,
  body = {},
}) => {
  const parsedFile = await parseImportFile(file);

  const isCreditCardImport =
    parsedFile.isCreditCard || Boolean(body.creditCardId);

  const destination = await resolveImportDestination({
    userId,
    isCreditCard: isCreditCardImport,
    accountId: body.accountId,
    creditCardId: body.creditCardId,
  });

  const userCategories = await Category.find({ user: userId });
  const categoriesByType = {
    income: userCategories.filter((category) => category.type === 'income'),
    expense: userCategories.filter((category) => category.type === 'expense'),
  };

  const categoryMemoryCache = new Map();

  const summary = {
    fileName: file.originalname,
    totalRows: parsedFile.rows.length,
    createdCount: 0,
    duplicatesCount: 0,
    skippedCount: 0,
    errors: [],
    importedIds: [],
    earliestTransactionDate: null,
    latestTransactionDate: null,
  };

  for (const row of parsedFile.rows) {
    try {
      if (!row.description) {
        summary.skippedCount += 1;
        summary.errors.push({
          rowNumber: row.rowNumber,
          reason: 'Descrição ausente.',
        });
        continue;
      }

      if (!Number.isFinite(row.amount) || row.amount === 0) {
        summary.skippedCount += 1;
        summary.errors.push({
          rowNumber: row.rowNumber,
          description: row.description,
          reason: 'Valor inválido ou zerado.',
        });
        continue;
      }

      if (!row.postedAt) {
        summary.skippedCount += 1;
        summary.errors.push({
          rowNumber: row.rowNumber,
          description: row.description,
          reason: 'Data inválida ou ausente.',
        });
        continue;
      }

      const type = normalizeTypeFromRow({
        typeRaw: row.typeRaw,
        amount: row.amount,
      });

      if (destination.mode === 'creditCard' && type === 'income') {
        summary.skippedCount += 1;
        summary.errors.push({
          rowNumber: row.rowNumber,
          description: row.description,
          reason:
            'Entrada/estorno em extrato de cartão não é suportado pelo modelo atual de importação.',
        });
        continue;
      }

      const categoryId = await findCategoryForImportedTransaction({
        userId,
        description: row.description,
        type,
        categoriesByType,
        memoryCache: categoryMemoryCache,
      });

      const purchaseDate = parseDate(row.postedAt, 'Data da linha importada');

      const rawPayload = {
        description: row.description,
        type,
        amount: Math.abs(roundMoney(row.amount)),
        category: categoryId,
        account: destination.account?._id || undefined,
        creditCard: destination.creditCard?._id || undefined,
        paymentMethod:
          destination.mode === 'creditCard'
            ? 'credit'
            : inferPaymentMethodFromDescription({
                description: row.description,
                type,
                isCreditCard: false,
              }),
        transactionDate: purchaseDate,
        purchaseDate,
        notes: buildImportNotes({
          fileName: file.originalname,
          fitid: row.fitid,
          rowNumber: row.rowNumber,
          kind: parsedFile.kind,
        }),
        source: 'import',
      };

      const basePayload = await buildTransactionPayload({
        userId,
        payload: rawPayload,
      });

      const duplicate = await findExistingDuplicate({
        userId,
        description: basePayload.description,
        type: basePayload.type,
        amount: basePayload.amount,
        transactionDate: basePayload.transactionDate,
        paymentMethod: basePayload.paymentMethod,
        account: basePayload.account || null,
        creditCard: basePayload.creditCard || null,
        fitid: row.fitid,
      });

      if (duplicate) {
        summary.duplicatesCount += 1;
        continue;
      }

      const created = await Transaction.create({
        user: userId,
        ...basePayload,
      });

      const createdDate = parseDate(created.transactionDate, 'Data criada');

      if (
        !summary.earliestTransactionDate ||
        createdDate.getTime() < new Date(summary.earliestTransactionDate).getTime()
      ) {
        summary.earliestTransactionDate = createdDate.toISOString();
      }

      if (
        !summary.latestTransactionDate ||
        createdDate.getTime() > new Date(summary.latestTransactionDate).getTime()
      ) {
        summary.latestTransactionDate = createdDate.toISOString();
      }

      summary.createdCount += 1;
      summary.importedIds.push(String(created._id));
    } catch (error) {
      summary.skippedCount += 1;
      summary.errors.push({
        rowNumber: row.rowNumber,
        description: row.description,
        reason: error.message || 'Erro ao importar linha.',
      });
    }
  }

  return {
    message: 'Importação concluída.',
    ...summary,
  };
};

/* ================= CRUD ================= */

export const getAll = async ({ userId, filters = {} }) => {
  const query = { user: userId };

  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.account) query.account = filters.account;
  if (filters.creditCard) query.creditCard = filters.creditCard;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
  if (filters.source) query.source = filters.source;
  if (filters.status) query.status = filters.status;
  if (filters.groupId) query.groupId = String(filters.groupId);

  if (filters.search) {
    query.description = { $regex: filters.search, $options: 'i' };
  }

  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};

    if (filters.startDate) {
      const start = parseDate(filters.startDate, 'Data inicial');
      query.transactionDate.$gte = new Date(
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
    }

    if (filters.endDate) {
      const end = parseDate(filters.endDate, 'Data final');
      query.transactionDate.$lte = new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
    }
  } else if (filters.year || filters.month) {
    const today = getTodayUTCDate();
    const year = filters.year ? Number(filters.year) : today.getUTCFullYear();
    const month = filters.month ? Number(filters.month) : today.getUTCMonth() + 1;

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    query.transactionDate = { $gte: startDate, $lte: endDate };
  }

  return Transaction.find(query)
    .populate(POPULATE_FIELDS)
    .sort({ transactionDate: -1, createdAt: -1 });
};

export const getById = async ({ userId, transactionId }) => {
  if (!isValidObjectId(transactionId)) {
    throw new Error('ID de transação inválido');
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  }).populate(POPULATE_FIELDS);

  if (!transaction) {
    throw new Error('Transação não encontrada');
  }

  return transaction;
};

export const create = async ({ userId, payload }) => {
  const basePayload = await buildTransactionPayload({ userId, payload });

  if (basePayload.isInstallment) {
    const installments = generateInstallments({ basePayload });
    const createdTransactions = [];

    for (const txData of installments) {
      const doc = await Transaction.create({ user: userId, ...txData });
      createdTransactions.push(doc);
    }

    return populateTransactionById(createdTransactions[0]._id);
  }

  const created = await Transaction.create({ user: userId, ...basePayload });
  return populateTransactionById(created._id);
};

export const update = async ({ userId, transactionId, payload }) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) {
    throw new Error('Transação não encontrada');
  }

  const isGrouped = Boolean(transaction.groupId);

  if (isGrouped) {
    const forbiddenKeys = [
      'type',
      'amount',
      'paymentMethod',
      'transactionDate',
      'purchaseDate',
      'account',
      'creditCard',
      'isRecurring',
      'recurrenceRule',
      'isInstallment',
      'installmentPlan',
      'installmentCount',
      'installmentIndex',
      'groupId',
      'source',
    ];

    const attemptedStructuralChange = forbiddenKeys.some(
      (key) => payload[key] !== undefined
    );

    if (attemptedStructuralChange) {
      throw new Error(
        'Para manter as parcelas alinhadas, não é permitido editar estrutura de um grupo parcelado. Exclua e recrie o lançamento.'
      );
    }

    const categoryId =
      payload.category !== undefined
        ? payload.category
        : normalizeObjectIdValue(transaction.category);

    if (payload.category !== undefined) {
      await validateCategory({
        userId,
        categoryId,
        type: transaction.type,
      });
    }

    const groupUpdate = {};
    if (payload.description !== undefined) {
      groupUpdate.description = payload.description?.trim() || transaction.description;
    }
    if (payload.category !== undefined) {
      groupUpdate.category = categoryId;
    }
    if (payload.notes !== undefined) {
      groupUpdate.notes = payload.notes?.trim() || '';
    }

    if (Object.keys(groupUpdate).length > 0) {
      await Transaction.updateMany(
        { user: userId, groupId: String(transaction.groupId) },
        { $set: groupUpdate }
      );
    }

    if (payload.status !== undefined) {
      transaction.status = sanitizeStatus(payload.status) || transaction.status;
      await transaction.save();
    }

    return populateTransactionById(transactionId);
  }

  const fullPayload = buildPayloadFromExistingTransaction(transaction, payload);
  const updatedPayload = await buildTransactionPayload({
    userId,
    payload: fullPayload,
  });

  if (payload.status !== undefined) {
    updatedPayload.status = sanitizeStatus(payload.status) || transaction.status;
  }

  if (payload.source !== undefined) {
    updatedPayload.source = sanitizeSource(payload.source) || updatedPayload.source;
  }

  Object.assign(transaction, updatedPayload);
  await transaction.save();

  return populateTransactionById(transaction._id);
};

export const remove = async ({ userId, transactionId }) => {
  if (!isValidObjectId(transactionId)) {
    throw new Error('ID de transação inválido');
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) {
    throw new Error('Transação não encontrada');
  }

  if (transaction.groupId) {
    const result = await Transaction.deleteMany({
      groupId: String(transaction.groupId),
      user: userId,
    });

    return {
      message: `${result.deletedCount} parcelas removidas com sucesso.`,
      deletedCount: result.deletedCount,
    };
  }

  await transaction.deleteOne();

  return {
    message: 'Transação removida com sucesso.',
    deletedCount: 1,
  };
};

/* ================= DASHBOARD ================= */

export const getSummary = async ({ userId, filters = {} }) => {
  const today = getTodayUTCDate();
  const year = filters.year ? parseInt(filters.year, 10) : today.getUTCFullYear();
  const month = filters.month
    ? parseInt(filters.month, 10)
    : today.getUTCMonth() + 1;

  let startDate;
  let endDate;

  if (filters.startDate && filters.endDate) {
    const parsedStart = parseDate(filters.startDate, 'Data inicial');
    const parsedEnd = parseDate(filters.endDate, 'Data final');

    startDate = new Date(
      Date.UTC(
        parsedStart.getUTCFullYear(),
        parsedStart.getUTCMonth(),
        parsedStart.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    endDate = new Date(
      Date.UTC(
        parsedEnd.getUTCFullYear(),
        parsedEnd.getUTCMonth(),
        parsedEnd.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
  } else {
    startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  }

  const accounts = await Account.find({
    user: userId,
    type: { $in: ['checking', 'wallet', 'cash', 'savings'] },
  });

  const currentRealBalance = roundMoney(
    accounts.reduce((acc, account) => acc + Number(account.currentBalance || 0), 0)
  );

  const match = {
    user: new mongoose.Types.ObjectId(userId),
    transactionDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['confirmed', 'planned'] },
  };

  if (filters.source) {
    match.source = filters.source;
  }

  if (filters.account) {
    match.account = new mongoose.Types.ObjectId(filters.account);
  }

  if (filters.creditCard) {
    match.creditCard = new mongoose.Types.ObjectId(filters.creditCard);
  }

  const stats = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          type: '$type',
          paymentMethod: '$paymentMethod',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let creditCardInvoice = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  stats.forEach((stat) => {
    if (stat._id.type === 'income') {
      totalIncome += stat.total;
      incomeCount += stat.count;
      return;
    }

    if (stat._id.type === 'expense') {
      expenseCount += stat.count;

      if (stat._id.paymentMethod === 'credit') {
        creditCardInvoice += stat.total;
      } else {
        totalExpense += stat.total;
      }
    }
  });

  totalIncome = roundMoney(totalIncome);
  totalExpense = roundMoney(totalExpense);
  creditCardInvoice = roundMoney(creditCardInvoice);

  const freeBalance = roundMoney(totalIncome - (totalExpense + creditCardInvoice));

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    realBalance: currentRealBalance,
    dashboard: {
      incomes: totalIncome,
      expenses: totalExpense,
      creditCard: creditCardInvoice,
      freeBalance,
    },
    income: totalIncome,
    expense: roundMoney(totalExpense + creditCardInvoice),
    incomeCount,
    expenseCount,
    balance: freeBalance,
  };
};
