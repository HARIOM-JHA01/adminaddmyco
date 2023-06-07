
import mongoose from "mongoose";

const ReferralMembershipStipePaymentSchema = new mongoose.Schema({
  membership: { type: mongoose.Schema.Types.ObjectId, ref: "ReferralMembership" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referral_tgid: { type: String },
  referral_id: { type: String },
  date: { type: Date, default: Date.now }
  // amount : {type : Number},
},
  { timestramp: true }
);

//  Compiling Schema
const ReferralMembershipStipePayment = mongoose.model("ReferralMembershipStipePayment", ReferralMembershipStipePaymentSchema);
export default ReferralMembershipStipePayment