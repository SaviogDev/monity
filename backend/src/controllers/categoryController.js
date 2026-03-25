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
