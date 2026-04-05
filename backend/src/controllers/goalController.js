import Goal from '../models/Goal.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js'; // O Salvador da Pátria!

export const getGoals = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const goalData = { ...req.body, user: userId };
    const goal = await Goal.create(goalData);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

export const updateGoalAmount = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const { amountToAdd, accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Você precisa selecionar uma conta bancária.' });
    }

    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Conta bancária não encontrada.' });
    }

    const goal = await Goal.findOne({ _id: id, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada.' });
    }

    const amount = Number(amountToAdd);
    
    // 1. Atualiza a Caixinha
    goal.currentAmount += amount;
    if (goal.currentAmount < 0) goal.currentAmount = 0;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    } else {
      goal.status = 'active';
    }
    await goal.save();

    // 2. Atualiza o Saldo da Conta Bancária
    account.currentBalance -= amount;
    await account.save();

    // 3. Define a Categoria Inteligente (Busca ou Cria na hora)
    const transactionType = amount > 0 ? 'expense' : 'income';
    let category = await Category.findOne({ user: userId, name: 'Metas e Investimentos', type: transactionType });
    
    if (!category) {
      category = await Category.create({
        user: userId,
        name: 'Metas e Investimentos',
        type: transactionType, 
        color: '#1ABC9C',
        icon: 'Target'
      });
    }

    // 4. Registra no Extrato com a Categoria amarrada!
    const description = amount > 0 ? `Aplicação: ${goal.name}` : `Resgate: ${goal.name}`;

    await Transaction.create({
      user: userId,
      account: account._id,
      category: category._id, // <--- Aqui está a mágica que evita o erro vermelho!
      description: description,
      amount: Math.abs(amount),
      type: transactionType,
      transactionDate: new Date(),
      status: 'confirmed',
      paymentMethod: 'transfer', 
    });

    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const goal = await Goal.findOneAndDelete({ _id: id, user: userId });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};