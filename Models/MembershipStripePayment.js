import mongoose from "mongoose";

const membershipstripePaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  telegram_id: { type: String, default: null, ref: "User" },
  membership_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    ref: "Membership",
  },
  date: { type: String },
  createdAt: { type: Date, default: Date.now },
});

//  Compiling Schema
const MembershipStrpiePaymentModel = mongoose.model(
  "MembershipStripePayment",
  membershipstripePaymentSchema
);
export default MembershipStrpiePaymentModel;
