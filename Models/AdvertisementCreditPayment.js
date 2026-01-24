import mongoose from "mongoose";

const advertisementCreditPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  telegram_id: { type: String },
  amount: { type: Number, required: true }, // Amount in USDT
  credits: { type: Number, required: true }, // Number of credits to be purchased
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdvertisementPackage",
  },
  transactionId: { type: String, required: true },
  walletAddress: { type: String, required: true },
  status: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
  approvalNotes: { type: String },
  rejectionReason: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  approvedAt: { type: Date },
  // Display capacity locked at the time of approval (credits × rate at approval time)
  displayCapacity: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for quick lookups
advertisementCreditPaymentSchema.index({ user: 1, createdAt: -1 });
advertisementCreditPaymentSchema.index({ status: 1, createdAt: -1 });
advertisementCreditPaymentSchema.index({ transactionId: 1 });

const AdvertisementCreditPaymentModel = mongoose.model(
  "AdvertisementCreditPayment",
  advertisementCreditPaymentSchema,
);

export default AdvertisementCreditPaymentModel;
