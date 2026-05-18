import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Goal from '../models/Goal.js';

/* ─────────────────────────────────────────────
   Helper — datas relativas ao mês corrente
───────────────────────────────────────────── */
function daysBack(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysForward(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/* ─────────────────────────────────────────────
   POST /api/demo/seed
───────────────────────────────────────────── */
export async function seedDemo(req, res) {
  const userId = req.user.id;

  try {
    // Evitar duplo seed
    const already = await Account.findOne({ user: userId, isDemo: true });
    if (already) {
      return res.status(409).json({ message: 'Dados de demonstração já foram carregados.' });
    }

    /* ── 1. Categorias ── */
    const catDefs = [
      { name: 'Salário', type: 'income', color: '#2ECC71' },
      { name: 'Alimentação', type: 'expense', color: '#E74C3C' },
      { name: 'Transporte', type: 'expense', color: '#F1C40F' },
      { name: 'Lazer', type: 'expense', color: '#E67E22' },
      { name: 'Saúde', type: 'expense', color: '#1ABC9C' },
    ];

    const createdCats = await Category.insertMany(
      catDefs.map((c) => ({ ...c, user: userId, isDemo: true })),
    );

    const catByName = Object.fromEntries(createdCats.map((c) => [c.name, c._id]));

    /* ── 2. Contas ── */
    const accountDefs = [
      { name: 'Conta Corrente Demo', type: 'checking', balance: 4200, bankCode: '341' },
      { name: 'Poupança Demo', type: 'savings', balance: 12000, bankCode: '001' },
      { name: 'Investimentos Demo', type: 'investment', balance: 8500, bankCode: '237' },
    ];

    const createdAccounts = await Account.insertMany(
      accountDefs.map((a) => ({ ...a, user: userId, isDemo: true, isActive: true })),
    );

    const mainAccountId = createdAccounts[0]._id;

    /* ── 3. Transações ── */
    const txDefs = [
      { description: 'Salário Mensal', type: 'income', amount: 6500, paymentMethod: 'transfer', category: catByName['Salário'], transactionDate: daysBack(1) },
      { description: 'Supermercado Extra', type: 'expense', amount: 320.5, paymentMethod: 'debit', category: catByName['Alimentação'], transactionDate: daysBack(3) },
      { description: 'Ifood — Jantar', type: 'expense', amount: 58, paymentMethod: 'pix', category: catByName['Alimentação'], transactionDate: daysBack(4) },
      { description: 'Uber', type: 'expense', amount: 38.9, paymentMethod: 'credit', category: catByName['Transporte'], transactionDate: daysBack(5) },
      { description: 'Posto de combustível', type: 'expense', amount: 180, paymentMethod: 'debit', category: catByName['Transporte'], transactionDate: daysBack(6) },
      { description: 'Cinema', type: 'expense', amount: 72, paymentMethod: 'credit', category: catByName['Lazer'], transactionDate: daysBack(8) },
      { description: 'Academia', type: 'expense', amount: 99, paymentMethod: 'debit', category: catByName['Saúde'], transactionDate: daysBack(9) },
      { description: 'Farmácia São Paulo', type: 'expense', amount: 45.3, paymentMethod: 'pix', category: catByName['Saúde'], transactionDate: daysBack(11) },
      { description: 'Restaurante Sábado', type: 'expense', amount: 130, paymentMethod: 'credit', category: catByName['Alimentação'], transactionDate: daysBack(13) },
      { description: 'Spotify', type: 'expense', amount: 21.9, paymentMethod: 'credit', category: catByName['Lazer'], transactionDate: daysBack(15) },
      { description: 'Freelance Design', type: 'income', amount: 1200, paymentMethod: 'pix', category: catByName['Salário'], transactionDate: daysBack(17) },
      { description: 'Bar com amigos', type: 'expense', amount: 96, paymentMethod: 'pix', category: catByName['Lazer'], transactionDate: daysBack(19) },
      { description: 'Farmácia Online', type: 'expense', amount: 67.5, paymentMethod: 'credit', category: catByName['Saúde'], transactionDate: daysBack(21) },
      { description: 'Padaria', type: 'expense', amount: 28, paymentMethod: 'cash', category: catByName['Alimentação'], transactionDate: daysBack(23) },
      { description: 'Divisão conta jantar', type: 'income', amount: 55, paymentMethod: 'pix', category: catByName['Salário'], transactionDate: daysBack(25) },
    ];

    await Transaction.insertMany(
      txDefs.map((t) => ({
        ...t,
        account: mainAccountId,
        user: userId,
        status: 'confirmed',
        source: 'manual',
        isDemo: true,
        purchaseDate: t.transactionDate,
      })),
    );

    /* ── 4. Metas ── */
    const goalDefs = [
      { name: 'Reserva de Emergência', targetAmount: 20000, currentAmount: 12000, deadline: daysForward(180), color: '#3498DB' },
      { name: 'Viagem Europa', targetAmount: 15000, currentAmount: 3200, deadline: daysForward(365), color: '#9B59B6' },
    ];

    await Goal.insertMany(
      goalDefs.map((g) => ({ ...g, user: userId, isDemo: true })),
    );

    return res.status(201).json({
      message: 'Dados de demonstração carregados com sucesso!',
      data: {
        accounts: createdAccounts.length,
        categories: createdCats.length,
        transactions: txDefs.length,
        goals: goalDefs.length,
      },
    });
  } catch (error) {
    console.error('[demoController] seedDemo error:', error);
    return res.status(500).json({ message: 'Erro ao criar dados de demonstração.' });
  }
}

/* ─────────────────────────────────────────────
   DELETE /api/demo/clear
───────────────────────────────────────────── */
export async function clearDemo(req, res) {
  const userId = req.user.id;

  try {
    const [txResult, accResult, catResult, goalResult] = await Promise.all([
      Transaction.deleteMany({ user: userId, isDemo: true }),
      Account.deleteMany({ user: userId, isDemo: true }),
      Category.deleteMany({ user: userId, isDemo: true }),
      Goal.deleteMany({ user: userId, isDemo: true }),
    ]);

    return res.status(200).json({
      message: 'Dados de demonstração removidos com sucesso.',
      data: {
        transactions: txResult.deletedCount,
        accounts: accResult.deletedCount,
        categories: catResult.deletedCount,
        goals: goalResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('[demoController] clearDemo error:', error);
    return res.status(500).json({ message: 'Erro ao remover dados de demonstração.' });
  }
}

/* ─────────────────────────────────────────────
   GET /api/demo/status
───────────────────────────────────────────── */
export async function demoStatus(req, res) {
  const userId = req.user.id;

  try {
    const count = await Transaction.countDocuments({ user: userId, isDemo: true });
    return res.status(200).json({ hasDemo: count > 0 });
  } catch (error) {
    console.error('[demoController] demoStatus error:', error);
    return res.status(500).json({ message: 'Erro ao verificar status de demonstração.' });
  }
}
