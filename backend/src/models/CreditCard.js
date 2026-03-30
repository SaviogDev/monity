import mongoose from 'mongoose';

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
      lowercase: true,
      default: null,
    },
    limit: {
      type: Number,
      default: null,
      min: [0, 'O limite não pode ser negativo'],
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
      default: '#111827',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

creditCardSchema.index({ user: 1, name: 1 });

const CreditCard =
  mongoose.models.CreditCard || mongoose.model('CreditCard', creditCardSchema);

export default CreditCard;