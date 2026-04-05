import mongoose from 'mongoose';

const financingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    financedAmount: {
      type: Number,
      required: true,
    },
    downPayment: {
      type: Number,
      default: 0,
    },
    installmentValue: {
      type: Number,
      required: true,
    },
    totalInstallments: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account', // De onde vai sair o dinheiro todo mês
      required: true,
    },
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringRule', // O elo com o nosso Motor!
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Financing', financingSchema);