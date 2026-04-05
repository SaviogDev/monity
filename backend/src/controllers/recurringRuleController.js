import * as recurringRuleService from '../services/recurringRuleService.js';

// Cria uma nova regra de recorrência
export const createRule = async (req, res, next) => {
  try {
    const userId = req.user._id; // Assumindo que o middleware de auth coloca o user no req
    const rule = await recurringRuleService.createRecurringRule(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

// Lista todas as regras do usuário
export const getRules = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rules = await recurringRuleService.getRecurringRules(userId);
    
    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

// Busca uma regra específica
export const getRuleById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const rule = await recurringRuleService.getRecurringRuleById(userId, id);
    
    res.status(200).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   A CHAVE DE IGNIÇÃO DO MOTOR DE RECORRÊNCIA
========================================================= */
export const processRecurrences = async (req, res, next) => {
  try {
    // Permite forçar uma data específica pelo body da requisição para testes,
    // ou usa a data de hoje por padrão.
    const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();

    console.log(`[ENGINE] Iniciando processamento de recorrências para a data: ${targetDate.toISOString()}`);
    
    const results = await recurringRuleService.processPendingRules(targetDate);
    
    console.log(`[ENGINE] Processamento concluído: ${results.transactionsCreated} transações geradas.`);

    res.status(200).json({
      success: true,
      message: 'Motor de recorrência executado com sucesso.',
      data: results,
    });
  } catch (error) {
    console.error('[ENGINE] Erro fatal no motor de recorrência:', error);
    next(error);
  }
};