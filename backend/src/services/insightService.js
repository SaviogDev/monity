import Transaction from '../models/Transaction.js';
import Financing from '../models/Financing.js';

export async function generateMonthlyInsight(userId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Busca todas as transações do mês
  const transactions = await Transaction.find({
    user: userId,
    transactionDate: { $gte: startDate, $lte: endDate }
  });

  let totalIncome = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      // Se é recorrente (aluguel, internet) ou financiamento, é custo fixo engessado
      if (t.isRecurring || t.source === 'recurrence' || t.description.toLowerCase().includes('financiamento')) {
        fixedExpenses += t.amount;
      } else {
        variableExpenses += t.amount;
      }
    }
  });

  const totalExpenses = fixedExpenses + variableExpenses;
  const freeMargin = totalIncome - totalExpenses;

  // REGRAS DE INTELIGÊNCIA DO MONITY
  let insight = {
    title: "Análise de Caixa",
    message: "Aguardando movimentações para gerar uma análise.",
    status: "neutral" // neutral, success, warning, danger
  };

  if (totalIncome === 0 && totalExpenses === 0) {
    return insight;
  }

  if (totalIncome === 0 && totalExpenses > 0) {
    insight = {
      title: "Alerta de Caixa",
      message: "Você já tem despesas registradas, mas nenhuma receita. Lembre-se de registrar seus ganhos para o cálculo da Margem Livre.",
      status: "warning"
    };
    return insight;
  }

  const fixedCostRatio = (fixedExpenses / totalIncome) * 100;
  
  // 1. Cenário de Ruptura (Gastando mais do que ganha)
  if (freeMargin < 0) {
    insight = {
      title: "Alerta Vermelho: Margem Negativa",
      message: `Seu custo de vida atual ultrapassou sua renda em R$ ${Math.abs(freeMargin).toFixed(2).replace('.', ',')}. Congele imediatamente gastos não essenciais.`,
      status: "danger"
    };
  } 
  // 2. Cenário de Risco Estrutural (Custo fixo altíssimo)
  else if (fixedCostRatio > 75) {
    insight = {
      title: "Custo Fixo Perigoso",
      message: `Seus gastos fixos já engolem ${fixedCostRatio.toFixed(0)}% da sua renda. Sua margem de manobra para imprevistos está muito baixa. Cuidado com novas dívidas.`,
      status: "warning"
    };
  } 
  // 3. Cenário Saudável (Margem boa e controlada)
  else if (freeMargin > (totalIncome * 0.20)) {
    insight = {
      title: "Cenário Ideal: Caixa Forte",
      message: "Suas contas estão sob total controle e sua margem está excelente. Considere investir ou destinar o excedente para metas de longo prazo.",
      status: "success"
    };
  } 
  // 4. Cenário Padrão (No limite, mas positivo)
  else {
    insight = {
      title: "Fluxo Sob Controle",
      message: "Seu caixa está positivo, mas a margem está estreita. Mantenha os gastos variáveis sob vigília até o fim do mês.",
      status: "neutral"
    };
  }

  return insight;
}