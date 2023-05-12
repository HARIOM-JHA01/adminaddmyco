import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },
  view: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
},
  { timestamps: true }
)

const NotificationModel = mongoose.model("Notification", NotificationSchema);
export default NotificationModel;

