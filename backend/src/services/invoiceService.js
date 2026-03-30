import Transaction from '../models/Transaction.js';
import CreditCard from '../models/CreditCard.js';

function toMonthKey(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthDateFromKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function getInvoiceTiming(monthKey) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (monthKey === currentMonthKey) return 'current';
  if (monthKey > currentMonthKey) return 'future';
  return 'past';
}

export async function getInvoices(userId) {
  const [transactions, cards] = await Promise.all([
    Transaction.find({
      user: userId,
      paymentMethod: 'credit',
      type: 'expense',
    })
      .populate('category', 'name type color icon')
      .populate('creditCard', 'name bankCode color closingDay dueDay')
      .sort({ competencyDate: -1, transactionDate: 1 })
      .lean(),
    CreditCard.find({
      user: userId,
      isActive: true,
    }).lean(),
  ]);

  const invoiceMap = new Map();

  for (const transaction of transactions) {
    if (!transaction.creditCard?._id) continue;

    const monthKey = toMonthKey(transaction.competencyDate);
    if (!monthKey) continue;

    const cardId = String(transaction.creditCard._id);
    const invoiceKey = `${cardId}::${monthKey}`;

    if (!invoiceMap.has(invoiceKey)) {
      invoiceMap.set(invoiceKey, {
        cardId,
        cardName: transaction.creditCard.name,
        bankCode: transaction.creditCard.bankCode || null,
        color: transaction.creditCard.color || null,
        closingDay: transaction.creditCard.closingDay,
        dueDay: transaction.creditCard.dueDay,
        monthKey,
        competencyDate: getMonthDateFromKey(monthKey),
        timing: getInvoiceTiming(monthKey),
        total: 0,
        confirmedTotal: 0,
        plannedTotal: 0,
        transactionCount: 0,
        transactions: [],
      });
    }

    const invoice = invoiceMap.get(invoiceKey);

    invoice.total += transaction.amount;
    invoice.transactionCount += 1;
    invoice.transactions.push(transaction);

    if (transaction.status === 'confirmed') {
      invoice.confirmedTotal += transaction.amount;
    } else if (transaction.status === 'planned') {
      invoice.plannedTotal += transaction.amount;
    }
  }

  const invoices = Array.from(invoiceMap.values())
    .map((invoice) => {
      const status =
        invoice.plannedTotal > 0 && invoice.confirmedTotal > 0
          ? 'partial'
          : invoice.plannedTotal > 0
          ? 'open'
          : 'closed';

      return {
        ...invoice,
        availableCardLimit: (() => {
          const card = cards.find((item) => String(item._id) === invoice.cardId);
          const limit = card?.limit || 0;
          return limit - invoice.plannedTotal;
        })(),
      };
    })
    .sort((a, b) => {
      const monthCompare = new Date(b.competencyDate).getTime() - new Date(a.competencyDate).getTime();
      if (monthCompare !== 0) return monthCompare;
      return a.cardName.localeCompare(b.cardName, 'pt-BR');
    });

  return invoices;
}

export async function getInvoiceByCardAndMonth(userId, cardId, monthKey) {
  const invoices = await getInvoices(userId);

  const invoice = invoices.find(
    (item) => item.cardId === String(cardId) && item.monthKey === monthKey
  );

  if (!invoice) {
    const error = new Error('Fatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return invoice;
}