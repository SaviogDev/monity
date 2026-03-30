import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const buildAccountBalanceMap = async ({ userId, accountIds = [] }) => {
  if (!accountIds.length) {
    return new Map();
  }

  const balances = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        account: {
          $in: accountIds.map((id) => new mongoose.Types.ObjectId(String(id))),
        },
        status: 'confirmed',
        type: { $in: ['income', 'expense'] },
        paymentMethod: { $ne: 'credit' },
      },
    },
    {
      $group: {
        _id: '$account',
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  return new Map(
    balances.map((item) => [
      String(item._id),
      {
        totalIncome: item.totalIncome || 0,
        totalExpense: item.totalExpense || 0,
      },
    ])
  );
};

const enrichAccountsWithBalance = async ({ userId, accounts }) => {
  const accountIds = accounts.map((account) => account._id);
  const balanceMap = await buildAccountBalanceMap({ userId, accountIds });

  return accounts.map((account) => {
    const totals = balanceMap.get(String(account._id)) || {
      totalIncome: 0,
      totalExpense: 0,
    };

    const initialBalance = Number(account.initialBalance || 0);
    const currentBalance =
      initialBalance + Number(totals.totalIncome) - Number(totals.totalExpense);

    return {
      ...account.toObject(),
      totalIncome: Number(totals.totalIncome || 0),
      totalExpense: Number(totals.totalExpense || 0),
      currentBalance,
    };
  });
};

export const getAll = async ({ userId, filters = {} }) => {
  const query = {
    user: userId,
  };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.search) {
    query.name = {
      $regex: filters.search.trim(),
      $options: 'i',
    };
  }

  const accounts = await Account.find(query).sort({ isActive: -1, name: 1 });

  return accounts;
};

export const getAllWithBalance = async ({ userId, filters = {} }) => {
  const query = {
    user: userId,
  };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.search) {
    query.name = {
      $regex: filters.search.trim(),
      $options: 'i',
    };
  }

  const accounts = await Account.find(query).sort({ isActive: -1, name: 1 });

  return enrichAccountsWithBalance({ userId, accounts });
};

export const getById = async ({ userId, accountId }) => {
  if (!isValidObjectId(accountId)) {
    const error = new Error('Conta inválida');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });

  if (!account) {
    const error = new Error('Conta não encontrada');
    error.statusCode = 404;
    throw error;
  }

  return account;
};

export const getByIdWithBalance = async ({ userId, accountId }) => {
  if (!isValidObjectId(accountId)) {
    const error = new Error('Conta inválida');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });

  if (!account) {
    const error = new Error('Conta não encontrada');
    error.statusCode = 404;
    throw error;
  }

  const [enrichedAccount] = await enrichAccountsWithBalance({
    userId,
    accounts: [account],
  });

  return enrichedAccount;
};

export const create = async ({ userId, payload }) => {
  const {
    name,
    type = 'checking',
    bankCode = null,
    color = '#6366f1',
    initialBalance = 0,
    isActive = true,
  } = payload;

  if (!name?.trim()) {
    const error = new Error('Nome da conta é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const numericInitialBalance = Number(initialBalance);

  if (Number.isNaN(numericInitialBalance)) {
    const error = new Error('Saldo inicial inválido');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.create({
    user: userId,
    name: name.trim(),
    type,
    bankCode: bankCode ? String(bankCode).trim().toLowerCase() : null,
    color,
    initialBalance: numericInitialBalance,
    isActive,
  });

  return account;
};

export const update = async ({ userId, accountId, payload }) => {
  if (!isValidObjectId(accountId)) {
    const error = new Error('Conta inválida');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });

  if (!account) {
    const error = new Error('Conta não encontrada');
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    type,
    bankCode,
    color,
    initialBalance,
    isActive,
  } = payload;

  if (name !== undefined) {
    if (!String(name).trim()) {
      const error = new Error('Nome da conta é obrigatório');
      error.statusCode = 400;
      throw error;
    }

    account.name = String(name).trim();
  }

  if (type !== undefined) {
    account.type = type;
  }

  if (bankCode !== undefined) {
    account.bankCode = bankCode ? String(bankCode).trim().toLowerCase() : null;
  }

  if (color !== undefined) {
    account.color = color;
  }

  if (initialBalance !== undefined) {
    const numericInitialBalance = Number(initialBalance);

    if (Number.isNaN(numericInitialBalance)) {
      const error = new Error('Saldo inicial inválido');
      error.statusCode = 400;
      throw error;
    }

    account.initialBalance = numericInitialBalance;
  }

  if (isActive !== undefined) {
    account.isActive = isActive;
  }

  await account.save();

  return account;
};

export const remove = async ({ userId, accountId }) => {
  if (!isValidObjectId(accountId)) {
    const error = new Error('Conta inválida');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });

  if (!account) {
    const error = new Error('Conta não encontrada');
    error.statusCode = 404;
    throw error;
  }

  await account.deleteOne();

  return {
    message: 'Conta excluída com sucesso',
  };
};