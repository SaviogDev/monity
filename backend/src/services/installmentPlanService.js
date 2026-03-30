import mongoose from 'mongoose';
import InstallmentPlan from '../models/InstallmentPlan.js';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import CreditCard from '../models/CreditCard.js';

function normalizeInstallmentPayload(payload) {
  return {
    groupId: String(payload.groupId || '').trim(),
    description: String(payload.description || '').trim(),
    totalAmount: Number(payload.totalAmount),
    installmentAmount: Number(payload.installmentAmount),
    installmentCount: Number(payload.installmentCount),
    currentInstallment: Number(payload.currentInstallment || 1),
    valueMode: payload.valueMode || 'total',
    category: payload.category,
    creditCard: payload.creditCard,
    purchaseDate: payload.purchaseDate,
    notes: String(payload.notes || '').trim(),
  };
}

function validatePayload(payload) {
  if (!Number.isFinite(payload.totalAmount) || payload.totalAmount <= 0) {
    throw new Error('O valor total deve ser maior que zero.');
  }

  if (!Number.isInteger(payload.installmentCount) || payload.installmentCount <= 1) {
    throw new Error('A quantidade de parcelas deve ser um inteiro maior que 1.');
  }

  if (!Number.isInteger(payload.currentInstallment) || payload.currentInstallment < 1) {
    throw new Error('A parcela atual deve ser um inteiro maior que zero.');
  }

  if (payload.currentInstallment > payload.installmentCount) {
    throw new Error('A parcela atual não pode ser maior que a quantidade total de parcelas.');
  }

  if (!Number.isFinite(payload.installmentAmount) || payload.installmentAmount <= 0) {
    throw new Error('O valor da parcela deve ser maior que zero.');
  }

  if (!payload.category) {
    throw new Error('Categoria é obrigatória.');
  }

  if (!payload.creditCard) {
    throw new Error('Cartão de crédito é obrigatório.');
  }

  if (!['total', 'installment'].includes(payload.valueMode)) {
    throw new Error('Modo de valor inválido.');
  }

  const parsedDate = new Date(payload.purchaseDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Data da compra inválida.');
  }
}

function buildInstallmentTransactions({
  userId,
  groupId,
  description,
  installmentAmount,
  installmentCount,
  currentInstallment,
  category,
  creditCard,
  purchaseDate,
  notes,
}) {
  const transactions = [];

  for (let installmentIndex = currentInstallment; installmentIndex <= installmentCount; installmentIndex += 1) {
    const date = new Date(purchaseDate);
    date.setMonth(date.getMonth() + (installmentIndex - 1));

    transactions.push({
      user: userId,
      description,
      amount: installmentAmount,
      type: 'expense',
      category,
      account: null,
      creditCard,
      paymentMethod: 'credit',
      transactionDate: date,
      status: 'confirmed',
      source: 'installment',
      notes,
      groupId,
      isRecurring: false,
      isInstallment: true,
      installmentPlan: {
        totalInstallments: installmentCount,
        currentInstallment: installmentIndex,
        installmentAmount,
        totalAmount: Number((installmentAmount * installmentCount).toFixed(2)),
        purchaseDate: new Date(purchaseDate),
        description,
        valueMode: 'installment',
      },
      installmentIndex,
      installmentCount,
      recurrenceRule: null,
    });
  }

  return transactions;
}

export async function createInstallmentPlan(userId, rawPayload) {
  const payload = normalizeInstallmentPayload(rawPayload);
  validatePayload(payload);

  const [category, creditCard] = await Promise.all([
    Category.findOne({
      _id: payload.category,
      user: userId,
      type: 'expense',
    }),
    CreditCard.findOne({
      _id: payload.creditCard,
      user: userId,
      isActive: true,
    }),
  ]);

  if (!category) {
    throw new Error('Categoria de despesa não encontrada.');
  }

  if (!creditCard) {
    throw new Error('Cartão de crédito não encontrado ou inativo.');
  }

  const groupId =
    payload.groupId ||
    new mongoose.Types.ObjectId().toString();

  const totalAmount =
    payload.valueMode === 'total'
      ? payload.totalAmount
      : Number((payload.installmentAmount * payload.installmentCount).toFixed(2));

  const installmentAmount =
    payload.valueMode === 'total'
      ? Number((payload.totalAmount / payload.installmentCount).toFixed(2))
      : payload.installmentAmount;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [plan] = await InstallmentPlan.create(
      [
        {
          user: userId,
          groupId,
          description: payload.description,
          totalAmount,
          installmentAmount,
          installmentCount: payload.installmentCount,
          currentInstallment: payload.currentInstallment,
          valueMode: payload.valueMode,
          category: category._id,
          creditCard: creditCard._id,
          purchaseDate: payload.purchaseDate,
          notes: payload.notes,
          status: 'active',
        },
      ],
      { session }
    );

    const transactionsData = buildInstallmentTransactions({
      userId,
      groupId,
      description: payload.description,
      installmentAmount,
      installmentCount: payload.installmentCount,
      currentInstallment: payload.currentInstallment,
      category: category._id,
      creditCard: creditCard._id,
      purchaseDate: payload.purchaseDate,
      notes: payload.notes,
    });

    await Transaction.insertMany(transactionsData, { session });

    await session.commitTransaction();

    const createdPlan = await InstallmentPlan.findById(plan._id)
      .populate('category', 'name type color icon')
      .populate('creditCard', 'name bankCode limit closingDay dueDay color');

    const transactions = await Transaction.find({
      user: userId,
      groupId,
    })
      .populate('category', 'name type color icon')
      .populate('creditCard', 'name bankCode limit closingDay dueDay color')
      .sort({ installmentIndex: 1, transactionDate: 1 });

    return {
      ...createdPlan.toObject(),
      transactions,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getInstallmentPlans(userId) {
  return InstallmentPlan.find({ user: userId })
    .populate('category', 'name type color icon')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color')
    .sort({ createdAt: -1 });
}

export async function getInstallmentPlanById(userId, planId) {
  const plan = await InstallmentPlan.findOne({
    _id: planId,
    user: userId,
  })
    .populate('category', 'name type color icon')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color');

  if (!plan) {
    throw new Error('Plano de parcelamento não encontrado.');
  }

  const transactions = await Transaction.find({
    user: userId,
    groupId: plan.groupId,
  })
    .populate('category', 'name type color icon')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color')
    .sort({ installmentIndex: 1, transactionDate: 1 });

  return {
    ...plan.toObject(),
    transactions,
  };
}