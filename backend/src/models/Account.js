import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome da conta é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome da conta não pode ter mais de 100 caracteres'],
    },
    type: {
      type: String,
      enum: ['checking', 'wallet', 'cash', 'savings'],
      required: [true, 'Tipo da conta é obrigatório'],
      default: 'checking',
    },
    bankCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    color: {
      type: String,
      trim: true,
      default: '#6366f1',
    },
    initialBalance: {
      type: Number,
      default: 0,
      min: [0, 'Saldo inicial não pode ser negativo'],
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

accountSchema.index({ user: 1, name: 1 });

const Account =
  mongoose.models.Account || mongoose.model('Account', accountSchema);

export default Account;