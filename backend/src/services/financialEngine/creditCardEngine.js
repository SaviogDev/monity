function normalizeDate(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data inválida para cálculo de competência do cartão.');
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function getCreditCardCompetencyDate(transactionDate, closingDay) {
  const normalizedDate = normalizeDate(transactionDate);

  const numericClosingDay = Number(closingDay);

  if (!Number.isInteger(numericClosingDay) || numericClosingDay < 1 || numericClosingDay > 31) {
    throw new Error('closingDay inválido para cálculo de competência.');
  }

  const year = normalizedDate.getFullYear();
  const month = normalizedDate.getMonth();
  const day = normalizedDate.getDate();

  if (day <= numericClosingDay) {
    return new Date(year, month, 1, 0, 0, 0, 0);
  }

  return new Date(year, month + 1, 1, 0, 0, 0, 0);
}