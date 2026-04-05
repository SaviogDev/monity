import RecurringRule from '../models/RecurringRule.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import CreditCard from '../models/CreditCard.js';
import Transaction from '../models/Transaction.js'; // Importação do Model de Transação adicionada

function normalizeRecurringRulePayload(payload) {
  return {
    description: String(payload.description || '').trim(),
    type: payload.type,
    amount: Number(payload.amount),
    category: payload.category,
    account: payload.account || null,
    creditCard: payload.creditCard || null,
    paymentMethod: payload.paymentMethod,
    frequency: payload.frequency,
    dayOfMonth:
      payload.dayOfMonth !== undefined && payload.dayOfMonth !== null && payload.dayOfMonth !== ''
        ? Number(payload.dayOfMonth)
        : null,
    dayOfWeek:
      payload.dayOfWeek !== undefined && payload.dayOfWeek !== null && payload.dayOfWeek !== ''
        ? Number(payload.dayOfWeek)
        : null,
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    notes: String(payload.notes || '').trim(),
    autoGenerate: payload.autoGenerate !== undefined ? Boolean(payload.autoGenerate) : true,
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
  };
}

function validateRecurringRulePayload(payload) {
  if (!payload.type || !['income', 'expense'].includes(payload.type)) {
    throw new Error('Tipo da recorrência inválido.');
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('O valor da recorrência deve ser maior que zero.');
  }

  if (!payload.category) {
    throw new Error('Categoria é obrigatória.');
  }

  if (!payload.paymentMethod) {
    throw new Error('Método de pagamento é obrigatório.');
  }

  if (
    !payload.frequency ||
    !['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].includes(payload.frequency)
  ) {
    throw new Error('Frequência inválida.');
  }

  const parsedStartDate = new Date(payload.startDate);
  if (Number.isNaN(parsedStartDate.getTime())) {
    throw new Error('Data inicial inválida.');
  }

  if (payload.endDate) {
    const parsedEndDate = new Date(payload.endDate);
    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new Error('Data final inválida.');
    }

    if (parsedEndDate < parsedStartDate) {
      throw new Error('A data final não pode ser anterior à data inicial.');
    }
  }

  if (['monthly', 'quarterly', 'yearly'].includes(payload.frequency)) {
    if (
      !Number.isInteger(payload.dayOfMonth) ||
      payload.dayOfMonth < 1 ||
      payload.dayOfMonth > 31
    ) {
      throw new Error('Dia do mês inválido para a recorrência.');
    }
  }

  if (['weekly', 'biweekly'].includes(payload.frequency)) {
    if (
      !Number.isInteger(payload.dayOfWeek) ||
      payload.dayOfWeek < 0 ||
      payload.dayOfWeek > 6
    ) {
      throw new Error('Dia da semana inválido para a recorrência.');
    }
  }
}

function addMonthsSafe(date, monthsToAdd, preferredDay = null) {
  const result = new Date(date);
  const originalDay = preferredDay || result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + monthsToAdd);

  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfMonth));
  result.setHours(0, 0, 0, 0);

  return result;
}

function calculateNextExecutionDate({
  frequency,
  startDate,
  dayOfMonth,
  dayOfWeek,
}) {
  const baseDate = new Date(startDate);

  if (Number.isNaN(baseDate.getTime())) {
    throw new Error('Data inicial inválida para cálculo da próxima execução.');
  }

  baseDate.setHours(0, 0, 0, 0);

  if (frequency === 'daily') {
    return baseDate;
  }

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const targetDay = Number(dayOfWeek);
    const currentDay = baseDate.getDay();
    const diff = (targetDay - currentDay + 7) % 7;
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + diff);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  }

  if (frequency === 'monthly') {
    return addMonthsSafe(baseDate, 0, dayOfMonth);
  }

  if (frequency === 'quarterly') {
    return addMonthsSafe(baseDate, 0, dayOfMonth);
  }

  if (frequency === 'yearly') {
    return addMonthsSafe(baseDate, 0, dayOfMonth);
  }

  return baseDate;
}

async function validateRuleReferences(userId, payload) {
  const [category, account, creditCard] = await Promise.all([
    Category.findOne({
      _id: payload.category,
      user: userId,
      type: payload.type,
    }),
    payload.account
      ? Account.findOne({
          _id: payload.account,
          user: userId,
        })
      : null,
    payload.creditCard
      ? CreditCard.findOne({
          _id: payload.creditCard,
          user: userId,
          isActive: true,
        })
      : null,
  ]);

  if (!category) {
    throw new Error('Categoria não encontrada ou incompatível com o tipo informado.');
  }

  if (payload.type === 'income') {
    if (payload.paymentMethod !== 'transfer') {
      payload.paymentMethod = 'transfer';
    }

    payload.account = null;
    payload.creditCard = null;
  }

  if (payload.type === 'expense') {
    if (payload.paymentMethod === 'credit') {
      if (!creditCard) {
        throw new Error('Cartão de crédito não encontrado ou inativo.');
      }

      payload.account = null;
    } else {
      if (!account) {
        throw new Error('Conta não encontrada.');
      }

      payload.creditCard = null;
    }
  }

  return {
    category,
    account,
    creditCard,
  };
}

export async function createRecurringRule(userId, rawPayload) {
  const payload = normalizeRecurringRulePayload(rawPayload);
  validateRecurringRulePayload(payload);
  await validateRuleReferences(userId, payload);

  const nextExecutionDate = calculateNextExecutionDate({
    frequency: payload.frequency,
    startDate: payload.startDate,
    dayOfMonth: payload.dayOfMonth,
    dayOfWeek: payload.dayOfWeek,
  });

  const rule = await RecurringRule.create({
    user: userId,
    description: payload.description,
    type: payload.type,
    amount: payload.amount,
    category: payload.category,
    account: payload.account,
    creditCard: payload.creditCard,
    paymentMethod: payload.paymentMethod,
    frequency: payload.frequency,
    dayOfMonth: payload.dayOfMonth,
    dayOfWeek: payload.dayOfWeek,
    startDate: payload.startDate,
    endDate: payload.endDate,
    notes: payload.notes,
    autoGenerate: payload.autoGenerate,
    isActive: payload.isActive,
    nextExecutionDate,
    lastExecutionDate: null,
  });

  return RecurringRule.findById(rule._id)
    .populate('category', 'name type color icon')
    .populate('account', 'name type bankCode color')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color');
}

export async function getRecurringRules(userId) {
  return RecurringRule.find({ user: userId })
    .populate('category', 'name type color icon')
    .populate('account', 'name type bankCode color')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color')
    .sort({ createdAt: -1 });
}

export async function getRecurringRuleById(userId, ruleId) {
  const rule = await RecurringRule.findOne({
    _id: ruleId,
    user: userId,
  })
    .populate('category', 'name type color icon')
    .populate('account', 'name type bankCode color')
    .populate('creditCard', 'name bankCode limit closingDay dueDay color');

  if (!rule) {
    throw new Error('Regra recorrente não encontrada.');
  }

  return rule;
}

/* ================= MOTOR DE RECORRÊNCIA (O OPERÁRIO) ================= */

/**
 * processPendingRules varre o banco gerando transações automáticas
 * para todas as regras vencidas até a data alvo.
 * @param {Date} targetDate Data limite para processamento (default: hoje)
 */
export async function processPendingRules(targetDate = new Date()) {
  // Ajusta a data limite para o final do dia, garantindo que pegue tudo de hoje
  const limitDate = new Date(targetDate);
  limitDate.setHours(23, 59, 59, 999);

  // Busca todas as regras ativas, com autoGenerate ligado e que estão atrasadas ou vencendo hoje
  const pendingRules = await RecurringRule.find({
    isActive: true,
    autoGenerate: true,
    nextExecutionDate: { $lte: limitDate },
  });

  const results = { processedRules: 0, transactionsCreated: 0, errors: 0, details: [] };

  for (const rule of pendingRules) {
    try {
      let currentExecutionDate = new Date(rule.nextExecutionDate);
      let isRuleActive = rule.isActive;
      let ruleLastExecution = rule.lastExecutionDate;

      // Loop de catch-up: Se o sistema ficou 3 meses offline, ele gera as 3 transações devidas
      while (currentExecutionDate <= limitDate && isRuleActive) {
        
        // 1. Monta e cria a Transação Real
        const transactionPayload = {
          user: rule.user,
          description: rule.description,
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          account: rule.account,
          creditCard: rule.creditCard,
          paymentMethod: rule.paymentMethod,
          transactionDate: new Date(currentExecutionDate), // Fixa a data exata da parcela
          status: 'confirmed', // Lançamentos automáticos já nascem confirmados
          source: 'recurrence',
          notes: `Lançamento automático de recorrência. ${rule.notes || ''}`.trim(),
          isRecurring: true,
          isInstallment: false,
          recurrenceRule: rule._id // Vincula a transação à regra mãe (opcional/útil para rastreio)
        };

        await Transaction.create(transactionPayload);
        results.transactionsCreated += 1;
        ruleLastExecution = new Date(currentExecutionDate);

        // 2. Calcula qual será a PRÓXIMA data de execução
        if (rule.frequency === 'daily') {
          currentExecutionDate.setDate(currentExecutionDate.getDate() + 1);
        } else if (rule.frequency === 'weekly') {
          currentExecutionDate.setDate(currentExecutionDate.getDate() + 7);
        } else if (rule.frequency === 'biweekly') {
          currentExecutionDate.setDate(currentExecutionDate.getDate() + 14);
        } else if (rule.frequency === 'monthly') {
          currentExecutionDate = addMonthsSafe(currentExecutionDate, 1, rule.dayOfMonth);
        } else if (rule.frequency === 'quarterly') {
          currentExecutionDate = addMonthsSafe(currentExecutionDate, 3, rule.dayOfMonth);
        } else if (rule.frequency === 'yearly') {
          currentExecutionDate = addMonthsSafe(currentExecutionDate, 12, rule.dayOfMonth);
        }

        // 3. Verifica se a próxima data ultrapassou a data de término (endDate)
        if (rule.endDate) {
          const endDateLimit = new Date(rule.endDate);
          endDateLimit.setHours(23, 59, 59, 999);
          if (currentExecutionDate > endDateLimit) {
            isRuleActive = false; // A regra encerrou o ciclo de vida
          }
        }
      }

      // 4. Salva as atualizações na Regra (novas datas e status)
      rule.lastExecutionDate = ruleLastExecution;
      rule.nextExecutionDate = currentExecutionDate;
      rule.isActive = isRuleActive;
      await rule.save();

      results.processedRules += 1;
      results.details.push({ ruleId: rule._id, status: 'success' });

    } catch (err) {
      console.error(`Erro no motor ao processar a regra ${rule._id}:`, err);
      results.errors += 1;
      results.details.push({ ruleId: rule._id, status: 'error', message: err.message });
    }
  }

  return results;
}