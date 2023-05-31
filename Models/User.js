import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

const userSchema = new mongoose.Schema({
  firstname: { type: String, },
  lastname: { type: String, },
  username: { type: String, },
  tgid: { type: String,trim: true},
  email: { type: String },
  password: { type: String },
  photo: { type: String },
  token: { type: String },
  otp: { type: Number },
  country: { type: String },
  countryCode: { type: String },
  memberid: { type: String },
  membertype: { type: String },
  membershiperiod: { type: String },
  joindate: { type: String },
  paid: { type: Number },
  contact: { type: Number },
  address: { type: String },
  fcmtoken: { type: String, },
  owner_name_english: { type: String },
  owner_name_chinese: { type: String },
  telegramId: { type: String, trim: true},
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
  count: { type: Number, default: 0 },
  usertype: { type: Number, default: 0 },
  languagetype: { type: Number, default: 1 },
  profilestatus: { type: Number, default: 0 },
  companystatus: { type: Number, default: 0 },
  profile_image: { type: String, trim: true, get: setImageUrl },
  video: { type: String, trim: true, get: setImageUrl },
  enddate: { type: String , default: null},
  startdate: { type: String , default: null},
  paymentstatus: { type: Number, default: null },
  date: { type: Date, default: Date.now },
  isReferral: { type: Number, default: 0 },
  refstatue:{type:Number, default:0},
  refimgstatue:{type:Number, default:0},
  logoImage: { type: String },
  logoTelegramUrl: { type: String },
});

//  Compiling Schema
userSchema.set('toObject', { getters: true })
userSchema.set('toObject', { getters: true })
userSchema.set('toJSON', { getters: true })

const UserModel = mongoose.model("User", userSchema);

export default UserModel