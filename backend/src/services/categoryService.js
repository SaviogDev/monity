import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js'; // Necessário para calcular o uso do orçamento

export const getAll = async (userId) => {
  return Category.find({ user: userId })
    .populate('parent', 'name icon color')
    .sort({ type: 1, name: 1 });
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
  // Nullify parent reference in subcategories
  await Category.updateMany({ parent: id, user: userId }, { parent: null });
  
  const category = await Category.findOneAndDelete({ _id: id, user: userId });
  if (!category) {
    const error = new Error('Categoria não encontrada');
    error.statusCode = 404;
    throw error;
  }
};

export const getBudgetSummary = async (userId, month, year) => {
  // 1. Define o primeiro e último milissegundo do mês escolhido (Cuidado com Timezones)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 2. Busca apenas as categorias de DESPESA que tenham um limite definido (> 0)
  const budgetCategories = await Category.find({
    user: userId,
    type: 'expense',
    monthlyLimit: { $gt: 0 }
  });

  if (!budgetCategories.length) return []; // Se não tem limites configurados, retorna array vazio

  const categoryIds = budgetCategories.map(cat => cat._id);

  // 3. O "Motor V8": Agrega (soma) todas as transações destas categorias no banco de uma vez
  const spentData = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        category: { $in: categoryIds },
        date: { $gte: startDate, $lte: endDate },
        type: 'expense'
      }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' }
      }
    }
  ]);

  // 4. Junta as informações da Categoria com o Total Gasto
  const summary = budgetCategories.map(category => {
    // Procura se essa categoria teve algum gasto no array devolvido pelo Aggregate
    const spentMatch = spentData.find(s => s._id.toString() === category._id.toString());
    const spent = spentMatch ? spentMatch.totalSpent : 0;
    
    // Calcula a porcentagem gasta
    const percentage = (spent / category.monthlyLimit) * 100;

    return {
      categoryId: category._id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      limit: category.monthlyLimit,
      spent: spent,
      percentage: percentage,
      isOverBudget: percentage >= 100
    };
  });

  // Retorna os orçamentos ordenados pela porcentagem de uso (os estourados primeiro)
  return summary.sort((a, b) => b.percentage - a.percentage);
};