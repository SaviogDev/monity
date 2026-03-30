import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditCard",
    },

    month: Number,
    year: Number,

    total: {
      type: Number,
      default: 0,
    },

    closingDate: Date,
    dueDate: Date,

    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "PAID"],
      default: "OPEN",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);