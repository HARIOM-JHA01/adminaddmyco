import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  referral_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  user_tgid: { type: String, default: null, ref: "User" },
  referral_tgid: { type: String, default: null, ref: "User" },
  status: {type:Number,default:0 },
  date: { type: Date, default: Date.now },
},
  { timestamps: true }
)

const AdminNotificationModel = mongoose.model("AdminNotification", AdminNotificationSchema);
export default AdminNotificationModel;

