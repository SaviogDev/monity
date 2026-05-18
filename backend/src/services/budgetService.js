import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

/**
 * Lista todos os orçamentos de um mês/ano, já com o gasto real calculado.
 */
export const getAll = async ({ userId, month, year }) => {
  const budgets = await Budget.find({ user: userId, month, year })
    .populate('category')
    .sort({ createdAt: 1 })
    .lean();

  // Busca transações do período para calcular gasto real por categoria
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const transactions = await Transaction.find({
    user: userId,
    type: 'expense',
    transactionDate: { $gte: startDate, $lte: endDate },
    status: 'confirmed',
  }).lean();

  // Agrupa gastos por categoria
  const spentMap = {};
  for (const tx of transactions) {
    const catId = String(tx.category);
    spentMap[catId] = (spentMap[catId] || 0) + tx.amount;
  }

  return budgets.map((budget) => ({
    ...budget,
    spent: spentMap[String(budget.category._id || budget.category)] || 0,
  }));
};

/**
 * Cria um orçamento.
 */
export const create = async ({ userId, category, month, year, limit }) => {
  const budget = await Budget.create({
    user: userId,
    category,
    month,
    year,
    limit,
  });

  return Budget.findById(budget._id).populate('category');
};

/**
 * Atualiza o limite de um orçamento.
 */
export const update = async ({ userId, budgetId, limit }) => {
  if (!isValidObjectId(budgetId)) throw new Error('ID inválido');

  const budget = await Budget.findOneAndUpdate(
    { _id: budgetId, user: userId },
    { limit },
    { new: true }
  ).populate('category');

  if (!budget) throw new Error('Orçamento não encontrado');
  return budget;
};

/**
 * Remove um orçamento.
 */
export const remove = async ({ userId, budgetId }) => {
  if (!isValidObjectId(budgetId)) throw new Error('ID inválido');

  const budget = await Budget.findOneAndDelete({ _id: budgetId, user: userId });
  if (!budget) throw new Error('Orçamento não encontrado');
  return budget;
};
