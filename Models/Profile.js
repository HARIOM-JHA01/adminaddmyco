import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

const profileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  owner_name_english: { type: String },
  owner_name_chinese: { type: String },
  telegramId: { type: String, trim: true, },
  email: { type: String },
  contact: { type: Number },
  address1: { type: String },
  address2: { type: String },
  address3: { type: String },
  WhatsApp: { type: String },
  WeChat: { type: String },
  Line: { type: String },
  Instagram: { type: String },
  Facebook: { type: String },
  Twitter: { type: String },
  Youtube: { type: String },
  Linkedin: { type: String },
  SnapChat: { type: String },
  Skype: { type: String },
  TikTok: { type: String },
  tags: { type: String },
  profile_image: { type: String, trim: true, get: setImageUrl },
  profilestatus : {type:Number,default:0},
  companystatus : {type:Number,default:0},
  // usertype: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
profileSchema.set('toObject', { getters: true })
profileSchema.set('toJSON', { getters: true })
const ProfileModel = mongoose.model("Profile", profileSchema);

export default ProfileModel