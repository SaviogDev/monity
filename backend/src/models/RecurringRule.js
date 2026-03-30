import mongoose from 'mongoose';

const recurringRuleSchema = new mongoose.Schema(
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
      required: [true, 'Tipo da recorrência é obrigatório'],
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

    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      required: [true, 'Frequência é obrigatória'],
      index: true,
    },

    dayOfMonth: {
      type: Number,
      min: [1, 'Dia do mês inválido'],
      max: [31, 'Dia do mês inválido'],
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
      required: [true, 'Data inicial é obrigatória'],
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
      index: true,
    },

    lastExecutionDate: {
      type: Date,
      default: null,
      index: true,
    },

    nextExecutionDate: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    autoGenerate: {
      type: Boolean,
      default: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Observações não podem ter mais de 500 caracteres'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

recurringRuleSchema.index({ user: 1, isActive: 1, nextExecutionDate: 1 });
recurringRuleSchema.index({ user: 1, type: 1, frequency: 1 });

recurringRuleSchema.pre('validate', function (next) {
  if (this.type === 'income') {
    this.account = null;
    this.creditCard = null;

    if (this.paymentMethod !== 'transfer') {
      this.paymentMethod = 'transfer';
    }
  }

  if (this.type === 'expense') {
    if (this.paymentMethod === 'credit') {
      if (!this.creditCard) {
        return next(new Error('Recorrências no crédito exigem um cartão de crédito'));
      }

      this.account = null;
    }

    if (this.paymentMethod !== 'credit' && this.creditCard) {
      return next(new Error('Apenas recorrências no crédito podem ter cartão vinculado'));
    }

    if (this.paymentMethod !== 'credit' && !this.account) {
      return next(new Error('Recorrências de despesa fora do crédito exigem uma conta'));
    }
  }

  if (['monthly', 'quarterly', 'yearly'].includes(this.frequency)) {
    if (!this.dayOfMonth) {
      return next(new Error('Dia do mês é obrigatório para essa frequência'));
    }
  }

  if (['weekly', 'biweekly'].includes(this.frequency)) {
    if (this.dayOfWeek === null || this.dayOfWeek === undefined) {
      return next(new Error('Dia da semana é obrigatório para essa frequência'));
    }
  }

  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error('A data final não pode ser anterior à data inicial'));
  }

  next();
});

const RecurringRule =
  mongoose.models.RecurringRule ||
  mongoose.model('RecurringRule', recurringRuleSchema);

export default RecurringRule;