import mongoose from "mongoose";

const donatorPurchaseSchema = new mongoose.Schema(
  {
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DonatorPackage",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USDT" },
    transactionId: { type: String, unique: true, sparse: true },
    paymentMethod: { type: String, default: "USDT" }, // USDT, TON, Stripe, Paypal
    status: { type: Number, default: 0 }, // 0 pending, 1 approved, 2 rejected, 3 cancelled
    creditsGrantedEmployee: { type: Number, default: 0 },
    creditsGrantedOperator: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

donatorPurchaseSchema.index({ transactionId: 1 });
donatorPurchaseSchema.index({ operator: 1 });
donatorPurchaseSchema.index({ status: 1, createdAt: -1 });

const DonatorPurchaseModel = mongoose.model(
  "DonatorPurchase",
  donatorPurchaseSchema,
);

export default DonatorPurchaseModel;
