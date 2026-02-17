import mongoose from "mongoose";

const enterprisePurchaseSchema = new mongoose.Schema(
  {
    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      index: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EnterprisePackage",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USDT" },
    transactionId: { type: String, unique: true, sparse: true },
    paymentMethod: { type: String, default: "USDT" }, // USDT, TON, Stripe, Paypal
    walletAddress: { type: String, trim: true }, // Wallet address for crypto payments
    status: { type: Number, default: 0 }, // 0 pending, 1 approved, 2 rejected, 3 cancelled
    creditsGrantedEmployee: { type: Number, default: 0 },
    creditsGrantedOperator: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

enterprisePurchaseSchema.index({ transactionId: 1 });
enterprisePurchaseSchema.index({ enterprise: 1 });
enterprisePurchaseSchema.index({ operator: 1 });
enterprisePurchaseSchema.index({ status: 1, createdAt: -1 });

const EnterprisePurchaseModel = mongoose.model(
  "EnterprisePurchase",
  enterprisePurchaseSchema,
);

export default EnterprisePurchaseModel;
