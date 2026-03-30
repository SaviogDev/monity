import Transaction from '../models/Transaction.js';
import CreditCard from '../models/CreditCard.js';

export async function getFinancialProjection(userId) {
  const transactions = await Transaction.find({ user: userId }).lean();

  let currentBalance = 0;
  let futureBalance = 0;

  const cardCommitmentMap = {};

  for (const t of transactions) {
    const value = t.type === 'income' ? t.amount : -t.amount;

    // saldo atual (só confirmadas)
    if (t.status === 'confirmed') {
      currentBalance += value;
    }

    // saldo futuro (tudo)
    futureBalance += value;

    // comprometimento de cartão (somente despesas no crédito)
    if (t.paymentMethod === 'credit' && t.creditCard && t.type === 'expense') {
      const cardId = String(t.creditCard);

      if (!cardCommitmentMap[cardId]) {
        cardCommitmentMap[cardId] = 0;
      }

      // aqui está o pulo do gato:
      // só conta o que ainda vai impactar a fatura
      if (t.status === 'planned') {
        cardCommitmentMap[cardId] += t.amount;
      }
    }
  }

  const cards = await CreditCard.find({
    user: userId,
    isActive: true,
  }).lean();

  const cardsProjection = cards.map((card) => {
    const committed = cardCommitmentMap[String(card._id)] || 0;
    const limit = card.limit || 0;

    return {
      _id: card._id,
      name: card.name,
      limit,
      committed,
      available: limit - committed,
      usagePercent: limit > 0 ? (committed / limit) * 100 : 0,
    };
  });

  return {
    currentBalance,
    futureBalance,
    cards: cardsProjection,
  };
}