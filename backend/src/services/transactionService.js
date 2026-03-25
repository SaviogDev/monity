import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

/**
 * Monta o filtro de query a partir dos query params da requisição.
 */
const buildFilter = (userId, query) => {
  const filter = { user: userId };

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  // Filtro por período: ?startDate=2024-01-01&endDate=2024-01-31
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  return filter;
};

export const getAll = async (userId, query = {}) => {
  const filter = buildFilter(userId, query);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name type icon color')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return {
    data: transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getById = async (id, userId) => {
  const transaction = await Transaction.findOne({ _id: id, user: userId }).populate(
    'category',
    'name type icon color'
  );
  if (!transaction) {
    const error = new Error('Transação não encontrada');
    error.statusCode = 404;
    throw error;
  }
  return transaction;
};

export const getSummary = async (userId, query = {}) => {
  const filter = buildFilter(userId, query);

  const result = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0, balance: 0 };

  for (const item of result) {
    if (item._id === 'income') {
      summary.income = item.total;
      summary.incomeCount = item.count;
    } else if (item._id === 'expense') {
      summary.expense = item.total;
      summary.expenseCount = item.count;
    }
  }

  summary.balance = summary.income - summary.expense;
  return summary;
};

export const create = async (data, userId) => {
  // Garante que a categoria pertence ao usuário
  const category = await Category.findOne({ _id: data.category, user: userId });
  if (!category) {
    const error = new Error('Categoria não encontrada ou não pertence ao usuário');
    error.statusCode = 404;
    throw error;
  }

  // Garante consistência: tipo da transação = tipo da categoria
  if (category.type !== data.type) {
    const error = new Error(
      `A categoria "${category.name}" é do tipo "${category.type}", mas a transação foi marcada como "${data.type}"`
    );
    error.statusCode = 400;
    throw error;
  }

  return Transaction.create({ ...data, user: userId });
};

export const update = async (id, data, userId) => {
  // Se a categoria for alterada, revalida a consistência
  if (data.category || data.type) {
    const existing = await Transaction.findOne({ _id: id, user: userId });
    if (!existing) {
      const error = new Error('Transação não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const categoryId = data.category || existing.category;
    const type = data.type || existing.type;

    const category = await Category.findOne({ _id: categoryId, user: userId });
    if (!category) {
      const error = new Error('Categoria não encontrada');
      error.statusCode = 404;
      throw error;
    }
    if (category.type !== type) {
      const error = new Error(
        `A categoria "${category.name}" é do tipo "${category.type}", mas a transação foi marcada como "${type}"`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true }
  ).populate('category', 'name type icon color');

  if (!transaction) {
    const error = new Error('Transação não encontrada');
    error.statusCode = 404;
    throw error;
  }
  return transaction;
};

export const remove = async (id, userId) => {
  const transaction = await Transaction.findOneAndDelete({ _id: id, user: userId });
  if (!transaction) {
    const error = new Error('Transação não encontrada');
    error.statusCode = 404;
    throw error;
  }
};
