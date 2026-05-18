import mongoose from 'mongoose';

const tituloSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
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
      enum: ['receivable', 'payable'],
      required: [true, 'Tipo do título é obrigatório'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [0.01, 'Valor deve ser maior que zero'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Data de vencimento é obrigatória'],
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'paid', 'overdue', 'cancelled'],
      default: 'open',
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    creditCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditCard',
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['pix', 'debit', 'credit', 'cash', 'transfer', 'boleto'],
      default: null,
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

tituloSchema.index({ user: 1, dueDate: -1 });
tituloSchema.index({ user: 1, status: 1 });
tituloSchema.index({ user: 1, type: 1, dueDate: -1 });

const Titulo =
  mongoose.models.Titulo || mongoose.model('Titulo', tituloSchema);

export default Titulo;
