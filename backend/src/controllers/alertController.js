import { getFinancialAlerts } from '../services/alertService.js';

export async function getAlertsController(req, res, next) {
  try {
    const data = await getFinancialAlerts(req.user.id);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}