import mongoose from "mongoose";

const referralmembershipSchema = new mongoose.Schema({
  membershiperiod: { type: Number },
  price: { type: Number },
  date: { type: Date, default: Date.now }
},
  { timestamps: true }
);

//  Compiling Schema
const ReferralMembershipModel = mongoose.model("ReferralMembership", referralmembershipSchema);
export default ReferralMembershipModel