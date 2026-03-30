import { getFinancialProjection } from '../services/financialService.js';

export async function getProjectionController(req, res, next) {
  try {
    const data = await getFinancialProjection(req.user.id);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}