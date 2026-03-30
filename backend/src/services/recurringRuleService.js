import RecurringRule from '../models/RecurringRule.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import CreditCard from '../models/CreditCard.js';

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