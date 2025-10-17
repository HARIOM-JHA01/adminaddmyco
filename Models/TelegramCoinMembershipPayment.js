import mongoose from "mongoose";

const telegramCoinMembershipPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  telegram_id: { type: String, ref: "User" },
  membership_id: { type: mongoose.Schema.Types.ObjectId, ref: "Membership" },
  amount: { type: Number, required: true },
  date: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const TelegramCoinMembershipPaymentModel = mongoose.model(
  "TelegramCoinMembershipPayment",
  telegramCoinMembershipPaymentSchema
);
export default TelegramCoinMembershipPaymentModel;
