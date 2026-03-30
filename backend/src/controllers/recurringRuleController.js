import {
  createRecurringRule,
  getRecurringRuleById,
  getRecurringRules,
} from '../services/recurringRuleService.js';

export async function createRecurringRuleController(req, res, next) {
  try {
    const result = await createRecurringRule(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Regra recorrente criada com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecurringRulesController(req, res, next) {
  try {
    const result = await getRecurringRules(req.user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecurringRuleByIdController(req, res, next) {
  try {
    const result = await getRecurringRuleById(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}