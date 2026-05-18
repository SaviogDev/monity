import * as budgetService from '../services/budgetService.js';

export const getBudgets = async (req, res, next) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const data = await budgetService.getAll({
      userId: req.user._id,
      month,
      year,
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createBudget = async (req, res, next) => {
  try {
    const { category, month, year, limit } = req.body;
    const data = await budgetService.create({
      userId: req.user._id,
      category,
      month,
      year,
      limit,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    // Erro de índice único (duplicata)
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'Já existe um orçamento para essa categoria nesse período.' });
    }
    next(err);
  }
};

export const updateBudget = async (req, res, next) => {
  try {
    const data = await budgetService.update({
      userId: req.user._id,
      budgetId: req.params.id,
      limit: req.body.limit,
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteBudget = async (req, res, next) => {
  try {
    await budgetService.remove({ userId: req.user._id, budgetId: req.params.id });
    res.status(200).json({ success: true, message: 'Orçamento excluído.' });
  } catch (err) {
    next(err);
  }
};
