import { getInvoices, getInvoiceByCardAndMonth } from '../services/invoiceService.js';

export async function getInvoicesController(req, res, next) {
  try {
    // Opcional chaining (?.) garante que o Node não vai crashar se req.user vier vazio
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acesso negado. Usuário não identificado pelo token.' 
      });
    }

    const data = await getInvoices(userId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceByCardAndMonthController(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acesso negado. Usuário não identificado pelo token.' 
      });
    }

    const data = await getInvoiceByCardAndMonth(
      userId,
      req.params.cardId,
      req.params.monthKey
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}