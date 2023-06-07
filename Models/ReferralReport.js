import mongoose from "mongoose";

const referralreportSchema = new mongoose.Schema({
  referral_user_id: { type: String},
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referral_user_tgid: { type: String},
  freemember_tgid: { type: String},
  membership_period: { type: String},
  country:{type:String},
  price: {type:Number},
  join_date: {type:String},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const ReferralReportModel = mongoose.model("ReferralReport", referralreportSchema);
export default ReferralReportModel