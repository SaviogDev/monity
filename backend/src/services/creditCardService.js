import CreditCard from '../models/CreditCard.js';

export const getAll = async ({ userId, filters = {} }) => {
  const query = {
    user: userId,
  };

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.search) {
    query.name = {
      $regex: String(filters.search).trim(),
      $options: 'i',
    };
  }

  return CreditCard.find(query).sort({ isActive: -1, name: 1 });
};

export const getById = async ({ userId, creditCardId }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!creditCard) {
    const error = new Error('Cartão não encontrado');
    error.statusCode = 404;
    throw error;
  }

  return creditCard;
};

export const create = async ({ userId, payload }) => {
  const {
    name,
    bankCode = null,
    limit = null,
    closingDay,
    dueDay,
    color = '#111827',
    isActive = true,
  } = payload;

  if (!name?.trim()) {
    const error = new Error('Nome do cartão é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  if (!closingDay) {
    const error = new Error('Dia de fechamento é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  if (!dueDay) {
    const error = new Error('Dia de vencimento é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const creditCard = await CreditCard.create({
    user: userId,
    name: name.trim(),
    bankCode: bankCode ? String(bankCode).trim().toLowerCase() : null,
    limit,
    closingDay,
    dueDay,
    color,
    isActive,
  });

  return creditCard;
};

export const update = async ({ userId, creditCardId, payload }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!creditCard) {
    const error = new Error('Cartão não encontrado');
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    bankCode,
    limit,
    closingDay,
    dueDay,
    color,
    isActive,
  } = payload;

  if (name !== undefined) {
    if (!String(name).trim()) {
      const error = new Error('Nome do cartão é obrigatório');
      error.statusCode = 400;
      throw error;
    }

    creditCard.name = String(name).trim();
  }

  if (bankCode !== undefined) {
    creditCard.bankCode = bankCode ? String(bankCode).trim().toLowerCase() : null;
  }

  if (limit !== undefined) {
    creditCard.limit = limit;
  }

  if (closingDay !== undefined) {
    creditCard.closingDay = closingDay;
  }

  if (dueDay !== undefined) {
    creditCard.dueDay = dueDay;
  }

  if (color !== undefined) {
    creditCard.color = color;
  }

  if (isActive !== undefined) {
    creditCard.isActive = isActive;
  }

  await creditCard.save();

  return creditCard;
};

export const remove = async ({ userId, creditCardId }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!creditCard) {
    const error = new Error('Cartão não encontrado');
    error.statusCode = 404;
    throw error;
  }

  await creditCard.deleteOne();

  return {
    message: 'Cartão excluído com sucesso',
  };
};