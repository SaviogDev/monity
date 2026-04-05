import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'O nome da meta é obrigatório'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'O valor alvo é obrigatório'],
      min: [1, 'O valor alvo deve ser maior que zero'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      // Data limite para alcançar a meta (opcional)
    },
    color: {
      type: String,
      default: '#3498DB',
    },
    icon: {
      type: String,
      default: 'Target',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    }
  },
  { timestamps: true }
);

export default mongoose.model('Goal', goalSchema);