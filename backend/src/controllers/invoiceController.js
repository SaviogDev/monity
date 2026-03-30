import { getInvoices, getInvoiceByCardAndMonth } from '../services/invoiceService.js';

export async function getInvoicesController(req, res, next) {
  try {
    const data = await getInvoices(req.user.id);

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
    const data = await getInvoiceByCardAndMonth(
      req.user.id,
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