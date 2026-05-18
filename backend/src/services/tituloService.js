import mongoose from 'mongoose';
import Titulo from '../models/Titulo.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const POPULATE_FIELDS = [
  { path: 'transaction' },
  { path: 'category' },
  { path: 'account' },
  { path: 'creditCard' },
];

/**
 * Cria um título financeiro automaticamente a partir de uma transação aprovada (confirmed).
 * Chamado pelo transactionService.update quando o status muda para 'confirmed'.
 */
export const createFromTransaction = async (transaction) => {
  // Verifica se já existe título para essa transação (evita duplicatas)
  const existing = await Titulo.findOne({
    transaction: transaction._id,
    user: transaction.user,
  });

  if (existing) {
    return existing;
  }

  const tituloType = transaction.type === 'income' ? 'receivable' : 'payable';

  const titulo = await Titulo.create({
    user: transaction.user,
    transaction: transaction._id,
    description: transaction.description || 'Título gerado automaticamente',
    type: tituloType,
    amount: transaction.amount,
    dueDate: transaction.transactionDate,
    status: 'open',
    category: transaction.category?._id || transaction.category || null,
    account: transaction.account?._id || transaction.account || null,
    creditCard: transaction.creditCard?._id || transaction.creditCard || null,
    paymentMethod: transaction.paymentMethod || null,
    notes: `Título gerado automaticamente a partir do lançamento aprovado.`,
  });

  return titulo;
};

/**
 * Lista todos os títulos do usuário com filtros opcionais.
 */
export const getAll = async ({ userId, filters = {} }) => {
  const query = { user: userId };

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.dueDate = {};
    if (filters.startDate) {
      query.dueDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.dueDate.$lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    query.description = { $regex: filters.search, $options: 'i' };
  }

  return Titulo.find(query)
    .populate(POPULATE_FIELDS)
    .sort({ dueDate: -1, createdAt: -1 });
};

/**
 * Busca um título por ID.
 */
export const getById = async ({ userId, tituloId }) => {
  if (!isValidObjectId(tituloId)) {
    throw new Error('ID de título inválido');
  }

  const titulo = await Titulo.findOne({
    _id: tituloId,
    user: userId,
  }).populate(POPULATE_FIELDS);

  if (!titulo) {
    throw new Error('Título não encontrado');
  }

  return titulo;
};

/**
 * Atualiza o status de um título.
 */
export const updateStatus = async ({ userId, tituloId, status }) => {
  if (!isValidObjectId(tituloId)) {
    throw new Error('ID de título inválido');
  }

  const validStatuses = ['open', 'paid', 'overdue', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Status inválido para título');
  }

  const titulo = await Titulo.findOne({
    _id: tituloId,
    user: userId,
  });

  if (!titulo) {
    throw new Error('Título não encontrado');
  }

  titulo.status = status;
  await titulo.save();

  return Titulo.findById(titulo._id).populate(POPULATE_FIELDS);
};

/**
 * Remove um título.
 */
export const remove = async ({ userId, tituloId }) => {
  if (!isValidObjectId(tituloId)) {
    throw new Error('ID de título inválido');
  }

  const titulo = await Titulo.findOneAndDelete({
    _id: tituloId,
    user: userId,
  });

  if (!titulo) {
    throw new Error('Título não encontrado');
  }

  return titulo;
};
