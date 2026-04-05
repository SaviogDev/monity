import * as transactionService from '../services/transactionService.js';

/**
 * Compatibilidade legada.
 * Mantém /api/import/ofx funcionando, mas delega para a mesma lógica central
 * usada por /api/transactions/import.
 */
export const processOFX = async (req, res, next) => {
  try {
    const result = await transactionService.importFromUpload({
      userId: req.user?._id || req.user?.id,
      file: req.file,
      body: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Importação concluída com sucesso.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};