import * as tituloService from '../services/tituloService.js';

export const getTitulos = async (req, res, next) => {
  try {
    const titulos = await tituloService.getAll({
      userId: req.user._id,
      filters: req.query,
    });

    res.status(200).json({ success: true, data: titulos });
  } catch (err) {
    next(err);
  }
};

export const getTituloById = async (req, res, next) => {
  try {
    const titulo = await tituloService.getById({
      userId: req.user._id,
      tituloId: req.params.id,
    });

    res.status(200).json({ success: true, data: titulo });
  } catch (err) {
    next(err);
  }
};

export const updateTituloStatus = async (req, res, next) => {
  try {
    const titulo = await tituloService.updateStatus({
      userId: req.user._id,
      tituloId: req.params.id,
      status: req.body.status,
    });

    res.status(200).json({
      success: true,
      message: 'Status do título atualizado com sucesso',
      data: titulo,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTitulo = async (req, res, next) => {
  try {
    const result = await tituloService.remove({
      userId: req.user._id,
      tituloId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: 'Título excluído com sucesso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
