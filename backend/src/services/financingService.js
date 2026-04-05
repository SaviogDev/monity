import mongoose from 'mongoose';
import Financing from '../models/Financing.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';

const FINANCING_NOTE_PREFIX = '[financing-contract-id:';
const VALID_FINANCING_STATUSES = ['active', 'completed', 'cancelled'];

function roundMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NaN;
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function buildUTCDate(year, monthIndex, day) {
  const safeDay = Math.min(
    day,
    new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0, 0)).getUTCDate()
  );

  return new Date(Date.UTC(year, monthIndex, safeDay, 12, 0, 0, 0));
}

function parseISODateOnlyUTC(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return buildUTCDate(Number(year), Number(month) - 1, Number(day));
}

function parseDate(value, fieldName = 'Data') {
  if (!value) {
    throw new Error(`${fieldName} inválida.`);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldName} inválida.`);
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
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} inválida.`);
  }

  return buildUTCDate(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );
}

function addMonthsKeepingDayUTC(dateInput, monthsToAdd) {
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
}

function getTodayUTCDate() {
  const now = new Date();
  return buildUTCDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function getStatusForDate(dateInput) {
  const txDate = parseDate(dateInput, 'Data da parcela');
  const today = getTodayUTCDate();

  return txDate.getTime() > today.getTime() ? 'planned' : 'confirmed';
}

function ensureObjectId(value, fieldLabel) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldLabel} inválido.`);
  }
}

function buildFinancingMarker(financingId) {
  return `${FINANCING_NOTE_PREFIX}${String(financingId)}]`;
}

function buildFinancingRegex(financingId) {
  return new RegExp(
    `\\[financing-contract-id:${String(financingId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`
  );
}

async function validateCategoryAndAccount({ userId, category, account }) {
  ensureObjectId(category, 'Categoria');
  ensureObjectId(account, 'Conta');

  const [categoryDoc, accountDoc] = await Promise.all([
    Category.findOne({ _id: category, user: userId }),
    Account.findOne({ _id: account, user: userId }),
  ]);

  if (!categoryDoc) {
    throw new Error('Categoria não encontrada.');
  }

  if (categoryDoc.type !== 'expense') {
    throw new Error('Financiamento exige categoria do tipo despesa.');
  }

  if (!accountDoc) {
    throw new Error('Conta não encontrada.');
  }

  return { categoryDoc, accountDoc };
}

function normalizeCreatePayload(payload = {}) {
  const description = String(payload.description || '').trim();
  const totalAmount = roundMoney(payload.totalAmount);
  const downPayment = roundMoney(payload.downPayment ?? 0);
  const installmentValue = roundMoney(payload.installmentValue);
  const totalInstallments = Number(payload.totalInstallments);
  const currentInstallment = Number(payload.currentInstallment ?? 1);
  const startDate = parseDate(payload.startDate, 'Data do primeiro vencimento');
  const category = payload.category;
  const account = payload.account;

  if (!description) {
    throw new Error('Descrição obrigatória.');
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Valor total do bem inválido.');
  }

  if (!Number.isFinite(downPayment) || downPayment < 0) {
    throw new Error('Entrada inválida.');
  }

  if (downPayment >= totalAmount) {
    throw new Error('A entrada deve ser menor que o valor total do bem.');
  }

  if (!Number.isFinite(installmentValue) || installmentValue <= 0) {
    throw new Error('Valor da parcela inválido.');
  }

  if (!Number.isInteger(totalInstallments) || totalInstallments < 1) {
    throw new Error('Quantidade total de parcelas inválida.');
  }

  if (
    !Number.isInteger(currentInstallment) ||
    currentInstallment < 1 ||
    currentInstallment > totalInstallments
  ) {
    throw new Error('Parcela atual inválida.');
  }

  const financedAmount = roundMoney(totalAmount - downPayment);
  if (!Number.isFinite(financedAmount) || financedAmount <= 0) {
    throw new Error('Valor financiado inválido.');
  }

  const endDate = addMonthsKeepingDayUTC(startDate, totalInstallments - 1);

  return {
    description,
    totalAmount,
    downPayment,
    financedAmount,
    installmentValue,
    totalInstallments,
    currentInstallment,
    startDate,
    endDate,
    category,
    account,
  };
}

function buildTransactionDocsFromFinancing({
  userId,
  financingId,
  description,
  financedAmount,
  installmentValue,
  totalInstallments,
  currentInstallment,
  startDate,
  category,
  account,
}) {
  const groupId = `financing:${String(financingId)}`;
  const marker = buildFinancingMarker(financingId);
  const docs = [];

  for (let installmentIndex = currentInstallment; installmentIndex <= totalInstallments; installmentIndex += 1) {
    const offset = installmentIndex - currentInstallment;
    const transactionDate = addMonthsKeepingDayUTC(startDate, offset);

    docs.push({
      user: userId,
      description,
      type: 'expense',
      amount: installmentValue,
      category,
      account,
      creditCard: null,
      paymentMethod: 'debit',
      transactionDate,
      purchaseDate: transactionDate,
      status: getStatusForDate(transactionDate),
      source: 'financing',
      notes: `${marker} Parcela ${installmentIndex}/${totalInstallments}`,
      groupId,
      isRecurring: false,
      isInstallment: true,
      installmentIndex,
      installmentCount: totalInstallments,
      installmentPlan: {
        totalInstallments,
        currentInstallment: installmentIndex,
        installmentAmount: installmentValue,
        totalAmount: financedAmount,
        purchaseDate: startDate,
        description,
        valueMode: 'installment',
      },
      recurrenceRule: null,
    });
  }

  return docs;
}

async function deleteFinancingTransactions({ userId, financingId }) {
  const markerRegex = buildFinancingRegex(financingId);

  await Transaction.deleteMany({
    user: userId,
    source: 'financing',
    notes: { $regex: markerRegex },
  });
}

async function rebuildFinancingTransactions({
  userId,
  financing,
}) {
  await deleteFinancingTransactions({
    userId,
    financingId: financing._id,
  });

  if (financing.status !== 'active') {
    return;
  }

  const docs = buildTransactionDocsFromFinancing({
    userId,
    financingId: financing._id,
    description: financing.description,
    financedAmount: financing.financedAmount,
    installmentValue: financing.installmentValue,
    totalInstallments: financing.totalInstallments,
    currentInstallment: financing.currentInstallment || 1,
    startDate: financing.startDate,
    category: financing.category,
    account: financing.account,
  });

  if (docs.length > 0) {
    await Transaction.insertMany(docs);
  }
}

async function populateFinancingById(financingId, userId) {
  return Financing.findOne({ _id: financingId, user: userId })
    .populate('category', 'name color icon type')
    .populate('account', 'name type color bankCode currentBalance');
}

export async function createFinancing(userId, payload) {
  const normalized = normalizeCreatePayload(payload);

  await validateCategoryAndAccount({
    userId,
    category: normalized.category,
    account: normalized.account,
  });

  const financing = await Financing.create({
    user: userId,
    description: normalized.description,
    totalAmount: normalized.totalAmount,
    financedAmount: normalized.financedAmount,
    downPayment: normalized.downPayment,
    installmentValue: normalized.installmentValue,
    totalInstallments: normalized.totalInstallments,
    currentInstallment: normalized.currentInstallment,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    category: normalized.category,
    account: normalized.account,
    status: 'active',
  });

  await rebuildFinancingTransactions({
    userId,
    financing,
  });

  return populateFinancingById(financing._id, userId);
}

export async function getAllFinancings(userId) {
  const financings = await Financing.find({ user: userId })
    .populate('category', 'name color icon type')
    .populate('account', 'name type color bankCode currentBalance')
    .sort({ createdAt: -1 });

  return financings;
}

export async function getFinancingById(userId, financingId) {
  ensureObjectId(financingId, 'Financiamento');

  const financing = await populateFinancingById(financingId, userId);

  if (!financing) {
    throw new Error('Financiamento não encontrado.');
  }

  return financing;
}

export async function getFinancingSummary(userId) {
  const activeFinancings = await Financing.find({
    user: userId,
    status: 'active',
  }).select('_id installmentValue');

  const activeIds = activeFinancings.map((item) => item._id);

  let totalDebt = 0;

  if (activeIds.length > 0) {
    const markerRegexList = activeIds.map((id) => buildFinancingRegex(id));

    const plannedTransactions = await Transaction.find({
      user: userId,
      source: 'financing',
      status: 'planned',
      $or: markerRegexList.map((regex) => ({
        notes: { $regex: regex },
      })),
    }).select('amount');

    totalDebt = roundMoney(
      plannedTransactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
    );
  }

  const monthlyCommitment = roundMoney(
    activeFinancings.reduce(
      (acc, financing) => acc + Number(financing.installmentValue || 0),
      0
    )
  );

  return {
    activeContracts: activeFinancings.length,
    totalDebt: Number.isFinite(totalDebt) ? totalDebt : 0,
    monthlyCommitment: Number.isFinite(monthlyCommitment) ? monthlyCommitment : 0,
  };
}

export async function updateFinancing(userId, financingId, payload) {
  ensureObjectId(financingId, 'Financiamento');

  const financing = await Financing.findOne({
    _id: financingId,
    user: userId,
  });

  if (!financing) {
    throw new Error('Financiamento não encontrado.');
  }

  const mergedPayload = {
    description:
      payload.description !== undefined ? payload.description : financing.description,
    totalAmount:
      payload.totalAmount !== undefined ? payload.totalAmount : financing.totalAmount,
    downPayment:
      payload.downPayment !== undefined ? payload.downPayment : financing.downPayment,
    installmentValue:
      payload.installmentValue !== undefined
        ? payload.installmentValue
        : financing.installmentValue,
    totalInstallments:
      payload.totalInstallments !== undefined
        ? payload.totalInstallments
        : financing.totalInstallments,
    currentInstallment:
      payload.currentInstallment !== undefined
        ? payload.currentInstallment
        : financing.currentInstallment || 1,
    startDate:
      payload.startDate !== undefined ? payload.startDate : financing.startDate,
    category:
      payload.category !== undefined ? payload.category : String(financing.category),
    account:
      payload.account !== undefined ? payload.account : String(financing.account),
  };

  const normalized = normalizeCreatePayload(mergedPayload);

  await validateCategoryAndAccount({
    userId,
    category: normalized.category,
    account: normalized.account,
  });

  financing.description = normalized.description;
  financing.totalAmount = normalized.totalAmount;
  financing.financedAmount = normalized.financedAmount;
  financing.downPayment = normalized.downPayment;
  financing.installmentValue = normalized.installmentValue;
  financing.totalInstallments = normalized.totalInstallments;
  financing.currentInstallment = normalized.currentInstallment;
  financing.startDate = normalized.startDate;
  financing.endDate = normalized.endDate;
  financing.category = normalized.category;
  financing.account = normalized.account;

  if (
    payload.status !== undefined &&
    VALID_FINANCING_STATUSES.includes(String(payload.status))
  ) {
    financing.status = String(payload.status);
  }

  await financing.save();

  await rebuildFinancingTransactions({
    userId,
    financing,
  });

  return populateFinancingById(financing._id, userId);
}

export async function deleteFinancing(userId, financingId) {
  ensureObjectId(financingId, 'Financiamento');

  const financing = await Financing.findOne({
    _id: financingId,
    user: userId,
  });

  if (!financing) {
    throw new Error('Financiamento não encontrado.');
  }

  await deleteFinancingTransactions({
    userId,
    financingId: financing._id,
  });

  await financing.deleteOne();

  return {
    message: 'Financiamento removido com sucesso.',
    deletedCount: 1,
  };
}