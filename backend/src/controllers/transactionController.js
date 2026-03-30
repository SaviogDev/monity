import * as transactionService from '../services/transactionService.js';

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await transactionService.getAll({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getById({
      userId: req.user._id,
      transactionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.create({
      userId: req.user._id,
      payload: req.body,
    });

    const isRecurring = Boolean(req.body?.isRecurring);
    const isInstallment = Boolean(req.body?.isInstallment);

    let message = 'Transação criada com sucesso';

    if (isRecurring) {
      message = 'Transação recorrente criada com sucesso';
    } else if (isInstallment) {
      message = 'Transação parcelada criada com sucesso';
    }

    res.status(201).json({
      success: true,
      message,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.update({
      userId: req.user._id,
      transactionId: req.params.id,
      payload: req.body,
    });

    const isRecurring = Boolean(req.body?.isRecurring);
    const isInstallment = Boolean(req.body?.isInstallment);

    let message = 'Transação atualizada com sucesso';

    if (isRecurring) {
      message = 'Transação recorrente atualizada com sucesso';
    } else if (isInstallment) {
      message = 'Transação parcelada atualizada com sucesso';
    }

    res.status(200).json({
      success: true,
      message,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const result = await transactionService.remove({
      userId: req.user._id,
      transactionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionSummary = async (req, res, next) => {
  try {
    const summary = await transactionService.getSummary({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};