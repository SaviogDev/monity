import * as financingService from '../services/financingService.js';
import * as financingEngine from '../services/financingEngine.js';

export const createFinancing = async (req, res, next) => {
  try {
    const financing = await financingService.createFinancing(
      req.user._id,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Financiamento criado com sucesso',
      data: financing,
    });
  } catch (err) {
    next(err);
  }
};

export const getFinancings = async (req, res, next) => {
  try {
    const data = await financingService.getAllFinancings(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFinancingSummary = async (req, res, next) => {
  try {
    const data = await financingService.getFinancingSummary(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateFinancing = async (req, res, next) => {
  try {
    const data = await financingService.updateFinancing(
      req.user._id,
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Financiamento atualizado',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteFinancing = async (req, res, next) => {
  try {
    const result = await financingService.deleteFinancing(
      req.user._id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const simulateFinancing = async (req, res, next) => {
  try {
    const result = financingEngine.simulate(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};