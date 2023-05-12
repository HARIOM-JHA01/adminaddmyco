import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  membershiperiod: { type: Number,},
  paypal: {type:Number,},
  toncoin: {type:Number,},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const MembershipModel = mongoose.model("Membership", membershipSchema);
export default MembershipModel