import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import CreditCard from '../models/CreditCard.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/* ================= VALIDATIONS ================= */

const validateCategory = async ({ userId, categoryId, type }) => {
  if (!categoryId || !isValidObjectId(categoryId)) {
    throw new Error('Categoria inválida');
  }

  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
  });

  if (!category) throw new Error('Categoria não encontrada');

  if (category.type !== type) {
    throw new Error('Categoria incompatível com o tipo da transação');
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

  if (!isValidObjectId(creditCardId)) {
    throw new Error('Cartão inválido');
  }

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
    throw new Error('Transações recorrentes exigem uma regra de recorrência');
  }

  if (type !== 'income') {
    throw new Error('Recorrência permitida apenas para receitas');
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
    throw new Error('Campo obrigatório ausente ou inválido na recorrência: value');
  }

  if (!recurrenceCategory) {
    throw new Error('Campo obrigatório ausente na recorrência: category');
  }

  if (!frequency) {
    throw new Error('Campo obrigatório ausente na recorrência: frequency');
  }

  if (!startDate) {
    throw new Error('Campo obrigatório ausente na recorrência: startDate');
  }

  if (recurrenceType !== type) {
    throw new Error('Tipo da recorrência deve ser igual ao tipo da transação');
  }

  if (recurrenceCategory !== category) {
    throw new Error('Categoria da recorrência deve ser igual à categoria da transação');
  }

  const allowedFrequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

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

  const parsedStartDate = new Date(startDate);

  if (Number.isNaN(parsedStartDate.getTime())) {
    throw new Error('Data inicial da recorrência inválida');
  }

  return {
    type: recurrenceType,
    value: Number(value),
    category: recurrenceCategory,
    frequency,
    dayOfMonth:
      dayOfMonth !== undefined && dayOfMonth !== null && dayOfMonth !== ''
        ? Number(dayOfMonth)
        : null,
    startDate: parsedStartDate,
  };
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
    notes,
    isRecurring,
    recurrenceRule,
    isInstallment,
    installmentPlan,
    groupId,
  } = payload;

  if (!type) throw new Error('Tipo é obrigatório');
  if (!amount || Number(amount) <= 0) throw new Error('Valor inválido');
  if (!category) throw new Error('Categoria obrigatória');
  if (!transactionDate) throw new Error('Data obrigatória');

  const normalizedAmount = Number(amount);

  const parsedTransactionDate = new Date(transactionDate);

  if (Number.isNaN(parsedTransactionDate.getTime())) {
    throw new Error('Data da transação inválida');
  }

  await validateCategory({ userId, categoryId: category, type });

  if (type === 'expense') {
    if (!paymentMethod) throw new Error('Forma de pagamento obrigatória');

    if (paymentMethod === 'credit') {
      await validateCreditCard({ userId, creditCardId: creditCard });
    } else {
      await validateAccount({ userId, accountId: account });
    }
  }

  const normalizedRecurringRule = await validateRecurringRule({
    userId,
    type,
    category,
    isRecurring: !!isRecurring,
    recurrenceRule,
  });

  return {
    description: description?.trim() || '',
    type,
    amount: normalizedAmount,
    category,
    account: paymentMethod === 'credit' ? null : account || null,
    creditCard: paymentMethod === 'credit' ? creditCard || null : null,
    paymentMethod,
    transactionDate: parsedTransactionDate,
    status: 'confirmed',
    source: isInstallment
      ? 'installment'
      : isRecurring
      ? 'recurrence'
      : 'manual',
    notes: notes || '',
    isRecurring: !!isRecurring,
    isInstallment: !!isInstallment,
    recurrenceRule: isRecurring ? normalizedRecurringRule : null,
    installmentPlan: isInstallment ? installmentPlan : null,
    groupId: groupId || null,
  };
};

/* ================= INSTALLMENTS ================= */

const generateInstallments = async ({
  userId,
  basePayload,
}) => {
  const {
    installmentPlan,
    groupId,
  } = basePayload;

  const {
    totalInstallments,
    currentInstallment,
    installmentAmount,
    purchaseDate,
  } = installmentPlan;

  const transactions = [];

  for (let i = currentInstallment; i <= totalInstallments; i++) {
    const date = new Date(purchaseDate);
    date.setMonth(date.getMonth() + (i - 1));

    transactions.push({
      ...basePayload,
      amount: installmentAmount,
      transactionDate: date,
      installmentIndex: i,
      installmentCount: totalInstallments,
      groupId,
    });
  }

  return transactions;
};

/* ================= CRUD ================= */

export const getAll = async ({ userId, filters = {} }) => {
  const query = { user: userId };

  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.account) query.account = filters.account;
  if (filters.creditCard) query.creditCard = filters.creditCard;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  if (filters.search) {
    query.description = {
      $regex: filters.search,
      $options: 'i',
    };
  }

  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};

    if (filters.startDate) {
      query.transactionDate.$gte = new Date(filters.startDate);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.transactionDate.$lte = end;
    }
  }

  return Transaction.find(query)
    .populate('category')
    .populate('account')
    .populate('creditCard')
    .sort({ transactionDate: -1 });
};

export const create = async ({ userId, payload }) => {
  const basePayload = await buildTransactionPayload({
    userId,
    payload,
  });

  /* ================= INSTALLMENTS ================= */

  if (basePayload.isInstallment) {
    const transactions = await generateInstallments({
      userId,
      basePayload,
    });

    const created = await Transaction.insertMany(
      transactions.map((t) => ({ user: userId, ...t }))
    );

    return created[0];
  }

  /* ================= NORMAL ================= */

  const transaction = await Transaction.create({
    user: userId,
    ...basePayload,
  });

  return transaction;
};

export const update = async ({ userId, transactionId, payload }) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) throw new Error('Transação não encontrada');

  const updatedPayload = await buildTransactionPayload({
    userId,
    payload,
  });

  Object.assign(transaction, updatedPayload);
  await transaction.save();

  return transaction;
};

export const remove = async ({ userId, transactionId }) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction) throw new Error('Transação não encontrada');

  await transaction.deleteOne();

  return { message: 'Transação removida' };
};

export const getSummary = async ({ userId, filters = {} }) => {
  const match = {
    user: new mongoose.Types.ObjectId(userId),
  };

  if (filters.type) match.type = filters.type;

  if (filters.startDate || filters.endDate) {
    match.transactionDate = {};

    if (filters.startDate) {
      match.transactionDate.$gte = new Date(filters.startDate);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      match.transactionDate.$lte = end;
    }
  }

  const summary = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const income = summary.find((i) => i._id === 'income');
  const expense = summary.find((i) => i._id === 'expense');

  return {
    income: income?.total || 0,
    expense: expense?.total || 0,
    incomeCount: income?.count || 0,
    expenseCount: expense?.count || 0,
    balance: (income?.total || 0) - (expense?.total || 0),
  };
};