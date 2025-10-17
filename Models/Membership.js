import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  membershiperiod: { type: Number },
  usdt: { type: Number },
  telegramcoin: { type: Number },
  date: { type: Date, default: Date.now },
});

//  Compiling Schema
const MembershipModel = mongoose.model("Membership", membershipSchema);
export default MembershipModel;
