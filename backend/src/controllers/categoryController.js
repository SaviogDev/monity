import * as categoryService from '../services/categoryService.js';

export const getAll = async (req, res, next) => {
  try {
    const categories = await categoryService.getAll(req.user._id);
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const category = await categoryService.getById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;
    const category = await categoryService.create({ name, type, icon, color }, req.user._id);
    res.status(201).json({ success: true, message: 'Categoria criada com sucesso', data: category });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;
    const category = await categoryService.update(req.params.id, { name, type, icon, color }, req.user._id);
    res.status(200).json({ success: true, message: 'Categoria atualizada com sucesso', data: category });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await categoryService.remove(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Categoria removida com sucesso' });
  } catch (err) {
    next(err);
  }
};

export const seedDefaults = async (req, res, next) => {
  try {
    const defaultCategories = [
      { name: 'Salário', type: 'income', color: '#2ECC71' },
      { name: 'Investimentos', type: 'income', color: '#3498DB' },
      { name: 'Vendas', type: 'income', color: '#9B59B6' },
      { name: 'Moradia', type: 'expense', color: '#34495E' },
      { name: 'Alimentação', type: 'expense', color: '#E74C3C' },
      { name: 'Transporte', type: 'expense', color: '#F1C40F' },
      { name: 'Saúde', type: 'expense', color: '#1ABC9C' },
      { name: 'Educação', type: 'expense', color: '#2980B9' },
      { name: 'Lazer', type: 'expense', color: '#E67E22' },
      { name: 'Assinaturas', type: 'expense', color: '#8E44AD' },
      { name: 'Cartão de Crédito', type: 'expense', color: '#D35400' }
    ];

    const createdCategories = await Promise.all(
      defaultCategories.map(cat => categoryService.create(cat, req.user._id))
    );

    res.status(201).json({ 
      success: true, 
      message: 'Categorias essenciais criadas com sucesso', 
      data: createdCategories 
    });
  } catch (err) {
    next(err);
  }
};