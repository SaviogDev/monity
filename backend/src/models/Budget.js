import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    /** Mês 1-12 */
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    /** Ano ex: 2025 */
    year: {
      type: Number,
      required: true,
    },
    /** Limite definido pelo usuário */
    limit: {
      type: Number,
      required: true,
      min: [0.01, 'Limite deve ser maior que zero'],
    },
  },
  {
    timestamps: true,
  }
);

// Um orçamento por categoria/mês/ano por usuário
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ user: 1, month: 1, year: 1 });

const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);

export default Budget;
