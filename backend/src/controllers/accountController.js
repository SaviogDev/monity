import * as accountService from '../services/accountService.js';

export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.getAll({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountsWithBalance = async (req, res, next) => {
  try {
    const accounts = await accountService.getAllWithBalance({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req, res, next) => {
  try {
    const account = await accountService.getById({
      userId: req.user._id,
      accountId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountByIdWithBalance = async (req, res, next) => {
  try {
    const account = await accountService.getByIdWithBalance({
      userId: req.user._id,
      accountId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const account = await accountService.create({
      userId: req.user._id,
      payload: req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const account = await accountService.update({
      userId: req.user._id,
      accountId: req.params.id,
      payload: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Conta atualizada com sucesso',
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await accountService.remove({
      userId: req.user._id,
      accountId: req.params.id,
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