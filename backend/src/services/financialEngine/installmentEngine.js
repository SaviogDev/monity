import { getCreditCardCompetencyDate } from './creditCardEngine.js';

function roundToCents(value) {
  return Math.round(Number(value) * 100) / 100;
}

function assertValidInstallmentInput({
  userId,
  planId,
  description,
  totalAmount,
  installmentCount,
  category,
  creditCard,
  closingDay,
  transactionDate,
}) {
  if (!userId) throw new Error('userId é obrigatório.');
  if (!planId) throw new Error('planId é obrigatório.');
  if (!description || !String(description).trim()) {
    throw new Error('description é obrigatório.');
  }

  const numericAmount = Number(totalAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('totalAmount deve ser maior que zero.');
  }

  const numericInstallments = Number(installmentCount);
  if (!Number.isInteger(numericInstallments) || numericInstallments <= 0) {
    throw new Error('installmentCount deve ser um inteiro maior que zero.');
  }

  if (!category) throw new Error('category é obrigatório.');
  if (!creditCard) throw new Error('creditCard é obrigatório.');

  const numericClosingDay = Number(closingDay);
  if (
    !Number.isInteger(numericClosingDay) ||
    numericClosingDay < 1 ||
    numericClosingDay > 31
  ) {
    throw new Error('closingDay deve ser um inteiro entre 1 e 31.');
  }

  const parsedDate = new Date(transactionDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('transactionDate inválida.');
  }
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsPreservingDay(dateInput, monthsToAdd) {
  const originalDate = new Date(dateInput);

  if (Number.isNaN(originalDate.getTime())) {
    throw new Error('Data inválida ao somar meses.');
  }

  const originalDay = originalDate.getDate();
  const targetYear = originalDate.getFullYear();
  const targetMonthIndex = originalDate.getMonth() + monthsToAdd;

  const normalizedTarget = new Date(targetYear, targetMonthIndex, 1, 0, 0, 0, 0);
  const lastDayOfTargetMonth = getLastDayOfMonth(
    normalizedTarget.getFullYear(),
    normalizedTarget.getMonth()
  );

  const safeDay = Math.min(originalDay, lastDayOfTargetMonth);

  return new Date(
    normalizedTarget.getFullYear(),
    normalizedTarget.getMonth(),
    safeDay,
    0,
    0,
    0,
    0
  );
}

export function splitInstallmentAmounts(totalAmount, installmentCount) {
  const totalInCents = Math.round(Number(totalAmount) * 100);
  const baseInCents = Math.floor(totalInCents / installmentCount);
  const remainder = totalInCents % installmentCount;

  return Array.from({ length: installmentCount }, (_, index) => {
    const cents = baseInCents + (index < remainder ? 1 : 0);
    return cents / 100;
  });
}

export function buildInstallmentTransactions({
  userId,
  planId,
  description,
  totalAmount,
  installmentCount,
  category,
  creditCard,
  closingDay,
  transactionDate,
  notes = '',
}) {
  assertValidInstallmentInput({
    userId,
    planId,
    description,
    totalAmount,
    installmentCount,
    category,
    creditCard,
    closingDay,
    transactionDate,
  });

  const amounts = splitInstallmentAmounts(totalAmount, installmentCount);

  return amounts.map((amount, index) => {
    const installmentNumber = index + 1;
    const installmentTransactionDate = addMonthsPreservingDay(transactionDate, index);
    const competencyDate = getCreditCardCompetencyDate(
      installmentTransactionDate,
      closingDay
    );

    return {
      user: userId,
      description: `${description} (${installmentNumber}/${installmentCount})`,
      type: 'expense',
      amount: roundToCents(amount),
      category,
      account: null,
      creditCard,
      paymentMethod: 'credit',
      transactionDate: installmentTransactionDate,
      competencyDate,
      status: installmentNumber === 1 ? 'confirmed' : 'planned',
      source: 'installment',
      notes: String(notes || ''),
      installmentPlan: planId,
      installmentIndex: installmentNumber,
      installmentCount,
      recurrenceRule: null,
    };
  });
}