import Transaction from '../models/Transaction.js';
import CreditCard from '../models/CreditCard.js';

function toMonthKey(dateInput) {
  if (!dateInput) return null;
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
      .populate('creditCard', 'name bankCode color closingDay dueDay limit')
      .sort({ competencyDate: -1, transactionDate: -1 }) // Ordena as mais recentes primeiro
      .lean(),
    CreditCard.find({
      user: userId,
      isActive: true,
    }).lean(),
  ]);

  const invoiceMap = new Map();
  const cardPlannedTotals = new Map(); // Guarda a soma de TUDO que está pendente no cartão

  for (const transaction of transactions) {
    if (!transaction.creditCard?._id) continue;

    const cardId = String(transaction.creditCard._id);

    // Soma TODAS as compras "planejadas" (em aberto) para abater do limite global do cartão
    if (transaction.status === 'planned') {
      const currentPlanned = cardPlannedTotals.get(cardId) || 0;
      cardPlannedTotals.set(cardId, currentPlanned + transaction.amount);
    }

    // Fallback: se não tiver competencyDate (fatura), usa a data da transação
    const dateToUse = transaction.competencyDate || transaction.transactionDate;
    const monthKey = toMonthKey(dateToUse);
    if (!monthKey) continue;

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
      // Cálculo do Status da Fatura mais seguro
      let status = 'open';
      if (invoice.plannedTotal === 0 && invoice.confirmedTotal > 0) {
        status = 'closed'; // Tudo pago
      } else if (invoice.plannedTotal > 0 && invoice.confirmedTotal > 0) {
        status = 'partial'; // Pagou algumas coisas, outras ainda não
      }

      // Calcula o Limite Disponível Real (Limite Total - Tudo que está 'planned' nesse cartão no futuro)
      const card = cards.find((item) => String(item._id) === invoice.cardId);
      const limit = card?.limit || 0;
      const globalPlannedForCard = cardPlannedTotals.get(invoice.cardId) || 0;

      return {
        ...invoice,
        status,
        availableCardLimit: Math.max(0, limit - globalPlannedForCard),
      };
    })
    .sort((a, b) => {
      const monthCompare = new Date(b.competencyDate).getTime() - new Date(a.competencyDate).getTime();
      if (monthCompare !== 0) return monthCompare; // Ordena por data mais recente
      return a.cardName.localeCompare(b.cardName, 'pt-BR'); // Desempata por ordem alfabética do cartão
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