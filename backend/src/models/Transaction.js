import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
      maxlength: [200, 'Descrição não pode ter mais de 200 caracteres'],
    },
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [0.01, 'Valor deve ser maior que zero'],
    },
    type: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: {
        values: ['income', 'expense'],
        message: 'Tipo deve ser "income" (receita) ou "expense" (despesa)',
      },
    },
    date: {
      type: Date,
      required: [true, 'Data é obrigatória'],
      default: Date.now,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Categoria é obrigatória'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Observações não podem ter mais de 500 caracteres'],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para otimizar as queries mais comuns
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
