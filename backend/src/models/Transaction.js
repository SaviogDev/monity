import mongoose from 'mongoose';

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
    },
    endDate: {
      type: Date,
      default: null,
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
    },
    totalAmount: {
      type: Number,
      default: null,
      min: [0.01, 'Valor total deve ser maior que zero'],
    },
    purchaseDate: {
      type: Date,
      required: true,
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
      enum: ['pix', 'debit', 'credit', 'cash', 'transfer'],
      required: [true, 'Método de pagamento é obrigatório'],
      index: true,
    },

    transactionDate: {
      type: Date,
      required: [true, 'Data da transação é obrigatória'],
      index: true,
    },

    status: {
      type: String,
      enum: ['confirmed', 'planned'],
      default: 'confirmed',
      index: true,
    },

    source: {
      type: String,
      enum: ['manual', 'installment', 'recurrence', 'salary', 'carryover', 'financing'],
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
transactionSchema.index({ user: 1, type: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, category: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, creditCard: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, groupId: 1 });

transactionSchema.pre('validate', function (next) {
  if (this.type === 'income') {
    this.account = null;
    this.creditCard = null;
    this.isInstallment = false;

    if (this.paymentMethod !== 'transfer') {
      this.paymentMethod = 'transfer';
    }
  }

  if (this.type === 'expense') {
    if (this.paymentMethod === 'credit') {
      if (!this.creditCard) {
        return next(new Error('Transações no crédito exigem um cartão de crédito'));
      }

      this.account = null;
    }

    if (this.paymentMethod !== 'credit' && this.creditCard) {
      return next(new Error('Apenas transações no crédito podem ter cartão vinculado'));
    }

    if (this.paymentMethod !== 'credit' && !this.account) {
      return next(new Error('Transações de despesa fora do crédito exigem uma conta'));
    }
  }

  if (this.isRecurring) {
    if (!this.recurrenceRule) {
      return next(new Error('Transações recorrentes exigem uma regra de recorrência'));
    }

    if (this.recurrenceRule.type !== this.type) {
      return next(new Error('O tipo da regra recorrente deve ser igual ao tipo da transação'));
    }
  } else {
    this.recurrenceRule = null;
  }

  if (this.isInstallment) {
    if (this.type !== 'expense') {
      return next(new Error('Apenas despesas podem ser parceladas'));
    }

    if (this.paymentMethod !== 'credit') {
      return next(new Error('Parcelamentos exigem pagamento no cartão de crédito'));
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
      return next(new Error('Número da parcela não pode ser maior que a quantidade de parcelas'));
    }
  } else {
    this.installmentPlan = null;
    this.installmentIndex = null;
    this.installmentCount = null;
  }

  next();
});

const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;