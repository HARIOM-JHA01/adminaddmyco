import mongoose from "mongoose";

const usdtMembershipPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  telegram_id: { type: String, ref: "User" },
  membership_id: { type: mongoose.Schema.Types.ObjectId, ref: "Membership" },
  amount: { type: Number, required: true },
  transactionId: { type: String },
  walletAddress: { type: String },
  status: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
  paymentstatus: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
  date: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const USDTMembershipPaymentModel = mongoose.model(
  "USDTMembershipPayment",
  usdtMembershipPaymentSchema
);
export default USDTMembershipPaymentModel;
