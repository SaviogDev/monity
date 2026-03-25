import Category from '../models/Category.js';

export const getAll = async (userId) => {
  return Category.find({ user: userId }).sort({ type: 1, name: 1 });
};

export const getById = async (id, userId) => {
  const category = await Category.findOne({ _id: id, user: userId });
  if (!category) {
    const error = new Error('Categoria não encontrada');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

export const create = async (data, userId) => {
  try {
    return await Category.create({ ...data, user: userId });
  } catch (err) {
    // Trata violação do índice único (nome + tipo + usuário)
    if (err.code === 11000) {
      const error = new Error(`Você já possui uma categoria "${data.name}" do tipo "${data.type}"`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

export const update = async (id, data, userId) => {
  const category = await Category.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true }
  );
  if (!category) {
    const error = new Error('Categoria não encontrada');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

export const remove = async (id, userId) => {
  const category = await Category.findOneAndDelete({ _id: id, user: userId });
  if (!category) {
    const error = new Error('Categoria não encontrada');
    error.statusCode = 404;
    throw error;
  }
};
