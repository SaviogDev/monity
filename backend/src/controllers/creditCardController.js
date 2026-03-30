import * as creditCardService from '../services/creditCardService.js';

export const getCreditCards = async (req, res, next) => {
  try {
    const creditCards = await creditCardService.getAll({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({
      success: true,
      data: creditCards,
    });
  } catch (err) {
    next(err);
  }
};

export const getCreditCardById = async (req, res, next) => {
  try {
    const creditCard = await creditCardService.getById({
      userId: req.user._id,
      creditCardId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: creditCard,
    });
  } catch (err) {
    next(err);
  }
};

export const createCreditCard = async (req, res, next) => {
  try {
    const creditCard = await creditCardService.create({
      userId: req.user._id,
      payload: req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Cartão criado com sucesso',
      data: creditCard,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCreditCard = async (req, res, next) => {
  try {
    const creditCard = await creditCardService.update({
      userId: req.user._id,
      creditCardId: req.params.id,
      payload: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Cartão atualizado com sucesso',
      data: creditCard,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCreditCard = async (req, res, next) => {
  try {
    const result = await creditCardService.remove({
      userId: req.user._id,
      creditCardId: req.params.id,
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