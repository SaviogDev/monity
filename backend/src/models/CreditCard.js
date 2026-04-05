import mongoose from 'mongoose';

const DEFAULT_CARD_COLOR = '#2563EB';

const creditCardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome do cartão é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome do cartão não pode ter mais de 100 caracteres'],
    },
    bankCode: {
      type: String,
      trim: true,
      default: null,
    },
    limit: {
      type: Number,
      default: 0,
      min: [0, 'O limite não pode ser negativo'],
    },
    availableLimit: {
      type: Number,
      default: 0,
      min: [0, 'O limite disponível não pode ser negativo'],
      validate: {
        validator(value) {
          const totalLimit = Number.isFinite(this.limit) ? this.limit : 0;
          return value <= totalLimit + 0.000001;
        },
        message: 'O limite disponível não pode ser maior que o limite total',
      },
    },
    linkedAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    closingDay: {
      type: Number,
      required: [true, 'Dia de fechamento é obrigatório'],
      min: [1, 'Dia de fechamento inválido'],
      max: [31, 'Dia de fechamento inválido'],
    },
    dueDay: {
      type: Number,
      required: [true, 'Dia de vencimento é obrigatório'],
      min: [1, 'Dia de vencimento inválido'],
      max: [31, 'Dia de vencimento inválido'],
    },
    color: {
      type: String,
      trim: true,
      default: DEFAULT_CARD_COLOR,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

creditCardSchema.index({ user: 1, name: 1 });

creditCardSchema.pre('validate', function (next) {
  const normalizedLimit = Number.isFinite(this.limit) ? this.limit : 0;

  if (this.isNew && (this.availableLimit === undefined || this.availableLimit === null || this.availableLimit === 0)) {
    this.availableLimit = normalizedLimit;
  }

  if (!Number.isFinite(this.availableLimit)) {
    this.availableLimit = 0;
  }

  next();
});

const CreditCard = mongoose.models.CreditCard || mongoose.model('CreditCard', creditCardSchema);

export default CreditCard;