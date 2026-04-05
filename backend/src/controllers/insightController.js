import * as insightService from '../services/insightService.js';

export const getMonthlyInsight = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Pega o mês e ano da query (ex: ?month=4&year=2026), se não tiver, usa o atual
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const insight = await insightService.generateMonthlyInsight(userId, month, year);
    
    res.status(200).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    next(error);
  }
};