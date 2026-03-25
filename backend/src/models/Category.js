import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome da categoria é obrigatório'],
      trim: true,
      maxlength: [50, 'Nome não pode ter mais de 50 caracteres'],
    },
    type: {
      type: String,
      required: [true, 'Tipo da categoria é obrigatório'],
      enum: {
        values: ['income', 'expense'],
        message: 'Tipo deve ser "income" (receita) ou "expense" (despesa)',
      },
    },
    icon: {
      type: String,
      trim: true,
      default: '💰',
    },
    color: {
      type: String,
      trim: true,
      default: '#6366f1',
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Cor deve ser um hex válido (ex: #FF5733)'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Um usuário não pode ter duas categorias com o mesmo nome e tipo
categorySchema.index({ name: 1, type: 1, user: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
