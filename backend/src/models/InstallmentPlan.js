import mongoose from 'mongoose';

const installmentPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    groupId: {
      type: String,
      required: [true, 'Identificador do grupo é obrigatório'],
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Descrição não pode ter mais de 200 caracteres'],
      default: '',
    },

    totalAmount: {
      type: Number,
      required: [true, 'Valor total é obrigatório'],
      min: [0.01, 'Valor total deve ser maior que zero'],
    },

    installmentAmount: {
      type: Number,
      required: [true, 'Valor da parcela é obrigatório'],
      min: [0.01, 'Valor da parcela deve ser maior que zero'],
    },

    installmentCount: {
      type: Number,
      required: [true, 'Quantidade de parcelas é obrigatória'],
      min: [2, 'Parcelamento deve ter pelo menos 2 parcelas'],
    },

    currentInstallment: {
      type: Number,
      required: [true, 'Parcela atual é obrigatória'],
      min: [1, 'Parcela atual inválida'],
      default: 1,
    },

    valueMode: {
      type: String,
      enum: ['total', 'installment'],
      default: 'total',
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Categoria é obrigatória'],
      index: true,
    },

    creditCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditCard',
      required: [true, 'Cartão de crédito é obrigatório'],
      index: true,
    },

    purchaseDate: {
      type: Date,
      required: [true, 'Data da compra é obrigatória'],
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Observações não podem ter mais de 500 caracteres'],
      default: '',
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

installmentPlanSchema.index({ user: 1, groupId: 1 });
installmentPlanSchema.index({ user: 1, creditCard: 1, purchaseDate: -1 });

installmentPlanSchema.pre('validate', function (next) {
  if (this.currentInstallment > this.installmentCount) {
    return next(
      new Error('A parcela atual não pode ser maior que a quantidade total de parcelas')
    );
  }

  const calculatedTotal = Number(this.installmentAmount) * Number(this.installmentCount);

  if (!this.totalAmount || this.totalAmount <= 0) {
    this.totalAmount = calculatedTotal;
  }

  next();
});

const InstallmentPlan =
  mongoose.models.InstallmentPlan ||
  mongoose.model('InstallmentPlan', installmentPlanSchema);

export default InstallmentPlan;