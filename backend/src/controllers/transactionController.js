import * as transactionService from '../services/transactionService.js';

export const getAll = async (req, res, next) => {
  try {
    const result = await transactionService.getAll(req.user._id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const summary = await transactionService.getSummary(req.user._id, req.query);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { description, amount, type, date, category, notes } = req.body;
    const transaction = await transactionService.create(
      { description, amount, type, date, category, notes },
      req.user._id
    );
    res.status(201).json({ success: true, message: 'Transação criada com sucesso', data: transaction });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { description, amount, type, date, category, notes } = req.body;
    const transaction = await transactionService.update(
      req.params.id,
      { description, amount, type, date, category, notes },
      req.user._id
    );
    res.status(200).json({ success: true, message: 'Transação atualizada com sucesso', data: transaction });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await transactionService.remove(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Transação removida com sucesso' });
  } catch (err) {
    next(err);
  }
};
