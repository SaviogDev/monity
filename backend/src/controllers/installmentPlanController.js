import {
  createInstallmentPlan,
  getInstallmentPlanById,
  getInstallmentPlans,
} from '../services/installmentPlanService.js';

export async function createInstallmentPlanController(req, res, next) {
  try {
    const result = await createInstallmentPlan(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Plano de parcelamento criado com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstallmentPlansController(req, res, next) {
  try {
    const result = await getInstallmentPlans(req.user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstallmentPlanByIdController(req, res, next) {
  try {
    const result = await getInstallmentPlanById(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}