import Transaction from '../models/Transaction.js';
import CreditCard from '../models/CreditCard.js';

function toMonthKey(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getFinancialAlerts(userId) {
  const [transactions, cards] = await Promise.all([
    Transaction.find({ user: userId }).lean(),
    CreditCard.find({ user: userId, isActive: true }).lean(),
  ]);

  const alerts = [];

  let currentBalance = 0;
  let futureBalance = 0;
  let plannedInstallmentsCount = 0;

  const cardCommitmentMap = {};
  const invoiceMap = {};

  for (const transaction of transactions) {
    const value = transaction.type === 'income' ? transaction.amount : -transaction.amount;

    if (transaction.status === 'confirmed') {
      currentBalance += value;
    }

    futureBalance += value;

    if (transaction.source === 'installment' && transaction.status === 'planned') {
      plannedInstallmentsCount += 1;
    }

    if (
      transaction.paymentMethod === 'credit' &&
      transaction.creditCard &&
      transaction.type === 'expense'
    ) {
      const cardId = String(transaction.creditCard);

      if (!cardCommitmentMap[cardId]) {
        cardCommitmentMap[cardId] = 0;
      }

      if (transaction.status === 'planned') {
        cardCommitmentMap[cardId] += transaction.amount;
      }

      const monthKey = toMonthKey(transaction.competencyDate);
      if (monthKey) {
        const invoiceKey = `${cardId}::${monthKey}`;
        if (!invoiceMap[invoiceKey]) {
          invoiceMap[invoiceKey] = {
            cardId,
            monthKey,
            total: 0,
            plannedTotal: 0,
          };
        }

        invoiceMap[invoiceKey].total += transaction.amount;

        if (transaction.status === 'planned') {
          invoiceMap[invoiceKey].plannedTotal += transaction.amount;
        }
      }
    }
  }

  if (futureBalance < 0) {
    alerts.push({
      type: 'negative_future_balance',
      severity: 'high',
      title: 'Saldo futuro negativo',
      message: `Seu saldo projetado está em ${futureBalance.toFixed(2)}.`,
      meta: {
        currentBalance,
        futureBalance,
      },
    });
  }

  if (plannedInstallmentsCount >= 6) {
    alerts.push({
      type: 'many_future_installments',
      severity: 'medium',
      title: 'Muitas parcelas futuras',
      message: `Você tem ${plannedInstallmentsCount} parcelas planejadas impactando meses futuros.`,
      meta: {
        plannedInstallmentsCount,
      },
    });
  }

  for (const card of cards) {
    const cardId = String(card._id);
    const committed = cardCommitmentMap[cardId] || 0;
    const limit = card.limit || 0;
    const usagePercent = limit > 0 ? (committed / limit) * 100 : 0;

    if (limit > 0 && usagePercent >= 85) {
      alerts.push({
        type: 'card_limit_high_usage',
        severity: 'high',
        title: `Limite alto comprometido no cartão ${card.name}`,
        message: `${usagePercent.toFixed(0)}% do limite já está comprometido em compras futuras.`,
        meta: {
          cardId,
          cardName: card.name,
          limit,
          committed,
          usagePercent,
        },
      });
    } else if (limit > 0 && usagePercent >= 60) {
      alerts.push({
        type: 'card_limit_attention',
        severity: 'medium',
        title: `Atenção ao cartão ${card.name}`,
        message: `${usagePercent.toFixed(0)}% do limite está comprometido.`,
        meta: {
          cardId,
          cardName: card.name,
          limit,
          committed,
          usagePercent,
        },
      });
    }
  }

  const highInvoices = Object.values(invoiceMap)
    .filter((invoice) => invoice.plannedTotal > 1000)
    .sort((a, b) => b.plannedTotal - a.plannedTotal);

  for (const invoice of highInvoices.slice(0, 3)) {
    const card = cards.find((item) => String(item._id) === invoice.cardId);

    alerts.push({
      type: 'high_open_invoice',
      severity: 'medium',
      title: `Fatura futura relevante em ${card?.name || 'cartão'}`,
      message: `A competência ${invoice.monthKey} já tem ${invoice.plannedTotal.toFixed(
        2
      )} em valores planejados.`,
      meta: {
        cardId: invoice.cardId,
        cardName: card?.name || null,
        monthKey: invoice.monthKey,
        plannedTotal: invoice.plannedTotal,
      },
    });
  }

  const severityOrder = {
    high: 0,
    medium: 1,
    low: 2,
  };

  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    alerts,
    summary: {
      total: alerts.length,
      high: alerts.filter((item) => item.severity === 'high').length,
      medium: alerts.filter((item) => item.severity === 'medium').length,
      low: alerts.filter((item) => item.severity === 'low').length,
    },
  };
}