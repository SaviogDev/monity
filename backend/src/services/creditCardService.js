import mongoose from 'mongoose';
import CreditCard from '../models/CreditCard.js';

const DEFAULT_CARD_COLOR = '#2563EB';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeRequiredString(value, fieldLabel) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    throw createHttpError(`${fieldLabel} é obrigatório`);
  }

  return normalized;
}

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = typeof value === 'string' ? value.trim() : String(value).trim();

  return normalized || null;
}

function normalizeBooleanFilter(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function normalizeBooleanValue(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  return Boolean(value);
}

function normalizeDay(value, fieldLabel) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 31) {
    throw createHttpError(`${fieldLabel} deve ser um número inteiro entre 1 e 31`);
  }

  return numericValue;
}

function normalizeLimit(value, { defaultValue = 0 } = {}) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(',', '.'))
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    throw createHttpError('O limite do cartão é inválido');
  }

  if (numericValue < 0) {
    throw createHttpError('O limite do cartão não pode ser negativo');
  }

  return Number(numericValue.toFixed(2));
}

function normalizeColor(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || DEFAULT_CARD_COLOR;
}

function normalizeObjectId(value, fieldLabel) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(`${fieldLabel} inválida`);
  }

  return value;
}

function buildSearchRegex(term) {
  const normalized = typeof term === 'string' ? term.trim() : '';

  if (!normalized) return null;

  return new RegExp(escapeRegex(normalized), 'i');
}

function mapLimitChange({ previousLimit, previousAvailableLimit, nextLimit }) {
  const usedAmount = Math.max(previousLimit - previousAvailableLimit, 0);
  const nextAvailableLimit = Math.max(nextLimit - usedAmount, 0);

  return Number(nextAvailableLimit.toFixed(2));
}

export const getAll = async ({ userId, filters = {} }) => {
  const query = {
    user: userId,
  };

  const isActive = normalizeBooleanFilter(filters.isActive);
  const searchRegex = buildSearchRegex(filters.search);

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (searchRegex) {
    query.$or = [{ name: searchRegex }, { bankCode: searchRegex }];
  }

  return CreditCard.find(query)
    .populate('linkedAccount', '_id name type color currentBalance isActive')
    .sort({ isActive: -1, name: 1, createdAt: -1 });
};

export const getById = async ({ userId, creditCardId }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  }).populate('linkedAccount', '_id name type color currentBalance isActive');

  if (!creditCard) {
    throw createHttpError('Cartão não encontrado', 404);
  }

  return creditCard;
};

export const create = async ({ userId, payload }) => {
  const name = normalizeRequiredString(payload.name, 'Nome do cartão');
  const bankCode = normalizeOptionalString(payload.bankCode);
  const limit = normalizeLimit(payload.limit, { defaultValue: 0 });
  const closingDay = normalizeDay(payload.closingDay, 'Dia de fechamento');
  const dueDay = normalizeDay(payload.dueDay, 'Dia de vencimento');
  const color = normalizeColor(payload.color);
  const isActive = normalizeBooleanValue(payload.isActive, true);
  const linkedAccount = normalizeObjectId(payload.linkedAccount, 'Conta vinculada');

  const creditCard = await CreditCard.create({
    user: userId,
    name,
    bankCode,
    limit,
    availableLimit: limit,
    linkedAccount,
    closingDay,
    dueDay,
    color,
    isActive,
  });

  return CreditCard.findById(creditCard._id).populate(
    'linkedAccount',
    '_id name type color currentBalance isActive'
  );
};

export const update = async ({ userId, creditCardId, payload }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!creditCard) {
    throw createHttpError('Cartão não encontrado', 404);
  }

  if (payload.name !== undefined) {
    creditCard.name = normalizeRequiredString(payload.name, 'Nome do cartão');
  }

  if (payload.bankCode !== undefined) {
    creditCard.bankCode = normalizeOptionalString(payload.bankCode);
  }

  if (payload.limit !== undefined) {
    const previousLimit = Number(creditCard.limit || 0);
    const previousAvailableLimit = Number(
      creditCard.availableLimit ?? creditCard.limit ?? 0
    );
    const nextLimit = normalizeLimit(payload.limit, { defaultValue: 0 });

    creditCard.limit = nextLimit;
    creditCard.availableLimit = mapLimitChange({
      previousLimit,
      previousAvailableLimit,
      nextLimit,
    });
  }

  if (payload.linkedAccount !== undefined) {
    creditCard.linkedAccount = normalizeObjectId(payload.linkedAccount, 'Conta vinculada');
  }

  if (payload.closingDay !== undefined) {
    creditCard.closingDay = normalizeDay(payload.closingDay, 'Dia de fechamento');
  }

  if (payload.dueDay !== undefined) {
    creditCard.dueDay = normalizeDay(payload.dueDay, 'Dia de vencimento');
  }

  if (payload.color !== undefined) {
    creditCard.color = normalizeColor(payload.color);
  }

  if (payload.isActive !== undefined) {
    creditCard.isActive = Boolean(payload.isActive);
  }

  await creditCard.save();

  return CreditCard.findById(creditCard._id).populate(
    'linkedAccount',
    '_id name type color currentBalance isActive'
  );
};

export const remove = async ({ userId, creditCardId }) => {
  const creditCard = await CreditCard.findOne({
    _id: creditCardId,
    user: userId,
  });

  if (!creditCard) {
    throw createHttpError('Cartão não encontrado', 404);
  }

  await creditCard.deleteOne();

  return {
    message: 'Cartão excluído com sucesso',
  };
};