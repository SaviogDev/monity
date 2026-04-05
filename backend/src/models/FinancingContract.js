import mongoose from 'mongoose';

const roundMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const financingContractSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    description: { type: String, required: true },

    assetValue: {
      type: Number,
      required: true,
      set: roundMoney,
    },

    downPayment: {
      type: Number,
      default: 0,
      set: roundMoney,
    },

    financedAmount: {
      type: Number,
      required: true,
      set: roundMoney,
    },

    interestRateMonthly: {
      type: Number,
      required: true, // ex: 0.01 = 1%
    },

    termMonths: {
      type: Number,
      required: true,
    },

    system: {
      type: String,
      enum: ['price', 'sac'],
      required: true,
    },

    firstDueDate: {
      type: Date,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },

    status: {
      type: String,
      enum: ['draft', 'active', 'settled'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

export default mongoose.model('FinancingContract', financingContractSchema);