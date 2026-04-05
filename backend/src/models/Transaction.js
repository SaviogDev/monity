import mongoose from 'mongoose';

const roundMoney = (value) => {
  if (value === null || value === undefined || value === '') return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const normalizeDateToUTCNoon = (value) => {
  if (!value) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
      0,
      0,
      0
    )
  );
};

const uniqueStringIds = (values = []) => {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
};

const embeddedRecurringRuleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0.01, 'Valor da recorrência deve ser maior que zero'],
      set: roundMoney,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    dayOfMonth: {
      type: Number,
      min: [1, 'Dia de recorrência inválido'],
      max: [31, 'Dia de recorrência inválido'],
      default: null,
    },
    dayOfWeek: {
      type: Number,
      min: [0, 'Dia da semana inválido'],
      max: [6, 'Dia da semana inválido'],
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
      set: normalizeDateToUTCNoon,
    },
    endDate: {
      type: Date,
      default: null,
      set: normalizeDateToUTCNoon,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const embeddedInstallmentPlanSchema = new mongoose.Schema(
  {
    totalInstallments: {
      type: Number,
      required: true,
      min: [2, 'Total de parcelas deve ser no mínimo 2'],
    },
    currentInstallment: {
      type: Number,
      required: true,
      min: [1, 'Parcela atual inválida'],
    },
    installmentAmount: {
      type: Number,
      required: true,
      min: [0.01, 'Valor da parcela deve ser maior que zero'],
      set: roundMoney,
    },
    totalAmount: {
      type: Number,
      default: null,
      min: [0.01, 'Valor total deve ser maior que zero'],
      set: roundMoney,
    },
    purchaseDate: {
      type: Date,
      required: true,
      set: normalizeDateToUTCNoon,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Descrição do parcelamento não pode ter mais de 200 caracteres'],
      default: '',
    },
    valueMode: {
      type: String,
      enum: ['total', 'installment'],
      default: 'total',
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Descrição não pode ter mais de 200 caracteres'],
      default: '',
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Tipo da transação é obrigatório'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [0.01, 'Valor deve ser maior que zero'],
      set: roundMoney,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Categoria é obrigatória'],
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    creditCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditCard',
      default: null,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['pix', 'debit', 'credit', 'cash', 'transfer', 'boleto'],
      required: [true, 'Método de pagamento é obrigatório'],
      index: true,
    },
    transactionDate: {
      type: Date,
      required: [true, 'Data da transação é obrigatória'],
      index: true,
      set: normalizeDateToUTCNoon,
    },
    purchaseDate: {
      type: Date,
      default: null,
      index: true,
      set: normalizeDateToUTCNoon,
    },
    status: {
      type: String,
      enum: ['confirmed', 'planned'],
      default: 'confirmed',
      index: true,
    },
    source: {
      type: String,
      enum: [
        'manual',
        'import',
        'installment',
        'recurrence',
        'salary',
        'carryover',
        'financing',
      ],
      default: 'manual',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Observações não podem ter mais de 500 caracteres'],
      default: '',
    },
    groupId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    isInstallment: {
      type: Boolean,
      default: false,
      index: true,
    },
    installmentPlan: {
      type: embeddedInstallmentPlanSchema,
      default: null,
    },
    installmentIndex: {
      type: Number,
      default: null,
      min: [1, 'Número da parcela inválido'],
    },
    installmentCount: {
      type: Number,
      default: null,
      min: [1, 'Quantidade de parcelas inválida'],
    },
    recurrenceRule: {
      type: embeddedRecurringRuleSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, purchaseDate: -1 });
transactionSchema.index({ user: 1, type: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, category: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, account: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, creditCard: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, paymentMethod: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, groupId: 1 });

transactionSchema.pre('validate', function (next) {
  if (this.transactionDate) {
    this.transactionDate = normalizeDateToUTCNoon(this.transactionDate);
  }

  if (this.purchaseDate) {
    this.purchaseDate = normalizeDateToUTCNoon(this.purchaseDate);
  }

  if (this.installmentPlan?.purchaseDate) {
    this.installmentPlan.purchaseDate = normalizeDateToUTCNoon(
      this.installmentPlan.purchaseDate
    );
  }

  if (this.recurrenceRule?.startDate) {
    this.recurrenceRule.startDate = normalizeDateToUTCNoon(
      this.recurrenceRule.startDate
    );
  }

  if (this.recurrenceRule?.endDate) {
    this.recurrenceRule.endDate = normalizeDateToUTCNoon(
      this.recurrenceRule.endDate
    );
  }

  this.amount = roundMoney(this.amount);

  if (this.installmentPlan?.installmentAmount !== undefined) {
    this.installmentPlan.installmentAmount = roundMoney(
      this.installmentPlan.installmentAmount
    );
  }

  if (
    this.installmentPlan?.totalAmount !== undefined &&
    this.installmentPlan.totalAmount !== null
  ) {
    this.installmentPlan.totalAmount = roundMoney(this.installmentPlan.totalAmount);
  }

  if (this.recurrenceRule?.value !== undefined) {
    this.recurrenceRule.value = roundMoney(this.recurrenceRule.value);
  }

  if (this.isRecurring && this.isInstallment) {
    return next(
      new Error('Uma transação não pode ser recorrente e parcelada ao mesmo tempo')
    );
  }

  if (this.type === 'income') {
    this.creditCard = null;
    this.isInstallment = false;

    if (!this.account) {
      return next(new Error('Transações de receita exigem uma conta de destino'));
    }

    if (this.transactionDate) {
      this.purchaseDate = this.transactionDate;
    }

    const allowedIncomeMethods = ['transfer', 'pix', 'boleto'];
    if (!allowedIncomeMethods.includes(this.paymentMethod)) {
      this.paymentMethod = 'transfer';
    }
  }

  if (this.type === 'expense') {
    if (this.paymentMethod === 'credit') {
      if (!this.creditCard) {
        return next(new Error('Transações no crédito exigem um cartão de crédito'));
      }

      this.account = null;

      if (!this.purchaseDate && this.installmentPlan?.purchaseDate) {
        this.purchaseDate = this.installmentPlan.purchaseDate;
      }

      if (!this.purchaseDate) {
        return next(new Error('Transações no crédito exigem a data da compra (purchaseDate)'));
      }
    } else {
      if (!this.account) {
        return next(new Error('Transações de despesa fora do crédito exigem uma conta'));
      }

      this.creditCard = null;

      if (this.transactionDate) {
        this.purchaseDate = this.transactionDate;
      }
    }
  }

  if (this.isRecurring) {
    if (!this.recurrenceRule) {
      return next(new Error('Transações recorrentes exigem uma regra de recorrência'));
    }
    if (this.recurrenceRule.type !== this.type) {
      return next(
        new Error('O tipo da regra recorrente deve ser igual ao tipo da transação')
      );
    }
  } else {
    this.recurrenceRule = null;
  }

  if (this.isInstallment) {
    if (this.type !== 'expense') {
      return next(new Error('Apenas despesas podem ser parceladas ou financiadas'));
    }

    const allowedInstallmentMethods = ['credit', 'boleto', 'pix', 'transfer', 'debit'];
    if (!allowedInstallmentMethods.includes(this.paymentMethod)) {
      return next(new Error('Método de pagamento inválido para parcelamentos/financiamentos'));
    }

    if (!this.installmentPlan) {
      return next(new Error('Transações parceladas exigem os dados do parcelamento'));
    }

    if (!this.groupId) {
      return next(new Error('Transações parceladas exigem um identificador de grupo'));
    }

    this.installmentIndex = this.installmentPlan.currentInstallment;
    this.installmentCount = this.installmentPlan.totalInstallments;

    if (this.installmentIndex > this.installmentCount) {
      return next(
        new Error('Número da parcela não pode ser maior que a quantidade total')
      );
    }

    if (!this.installmentPlan.totalAmount) {
      this.installmentPlan.totalAmount = roundMoney(
        Number(this.installmentPlan.installmentAmount) *
          Number(this.installmentPlan.totalInstallments)
      );
    }

    if (!this.purchaseDate && this.installmentPlan.purchaseDate) {
      this.purchaseDate = this.installmentPlan.purchaseDate;
    }
  } else {
    this.installmentPlan = null;
    this.installmentIndex = null;
    this.installmentCount = null;
  }

  next();
});

transactionSchema.statics.updateAccountBalance = async function (accountId) {
  if (!accountId) return;

  try {
    const Account = mongoose.model('Account');
    const account = await Account.findById(accountId);

    if (!account) return;

    const stats = await this.aggregate([
      {
        $match: {
          account: new mongoose.Types.ObjectId(accountId),
          status: 'confirmed',
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let incomeTotal = 0;
    let expenseTotal = 0;

    stats.forEach((stat) => {
      if (stat._id === 'income') incomeTotal = stat.total;
      if (stat._id === 'expense') expenseTotal = stat.total;
    });

    account.currentBalance =
      roundMoney(account.initialBalance || 0) +
      roundMoney(incomeTotal) -
      roundMoney(expenseTotal);

    await account.save();
  } catch (error) {
    console.error('Erro ao processar Motor de Saldo:', error);
  }
};

transactionSchema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.isModified('account')) {
      const previousDoc = await this.constructor.findById(this._id).select('account');
      this._previousAccountId = previousDoc?.account
        ? String(previousDoc.account)
        : null;
    } else {
      this._previousAccountId = null;
    }

    next();
  } catch (error) {
    next(error);
  }
});

transactionSchema.post('save', async function () {
  const affectedAccountIds = uniqueStringIds([this.account, this._previousAccountId]);

  await Promise.all(
    affectedAccountIds.map((accountId) =>
      this.constructor.updateAccountBalance(accountId)
    )
  );
});

transactionSchema.pre('findOneAndUpdate', async function () {
  const previousDoc = await this.model.findOne(this.getQuery()).select('account');
  this._previousAccountId = previousDoc?.account ? String(previousDoc.account) : null;
});

transactionSchema.post('findOneAndUpdate', async function (doc) {
  const affectedAccountIds = uniqueStringIds([this._previousAccountId, doc?.account]);

  await Promise.all(
    affectedAccountIds.map((accountId) => this.model.updateAccountBalance(accountId))
  );
});

transactionSchema.post('findOneAndDelete', async function (doc) {
  const affectedAccountIds = uniqueStringIds([doc?.account]);

  await Promise.all(
    affectedAccountIds.map((accountId) => this.model.updateAccountBalance(accountId))
  );
});

transactionSchema.pre('deleteMany', async function () {
  const docs = await this.model.find(this.getFilter()).select('account');
  this._affectedAccountIds = uniqueStringIds(docs.map((doc) => doc.account));
});

transactionSchema.post('deleteMany', async function () {
  const affectedAccountIds = uniqueStringIds(this._affectedAccountIds || []);

  await Promise.all(
    affectedAccountIds.map((accountId) => this.model.updateAccountBalance(accountId))
  );
});

const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;
