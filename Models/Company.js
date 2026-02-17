import mongoose from "mongoose";
import { setImageUrl, validatorError } from "../Common.js";

const companySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  video: { type: String, trim: true, get: setImageUrl },
  image: { type: String, trim: true, get: setImageUrl },
  // Support multiple images/videos (first will remain in `image`/`video` for compatibility)
  videos: [{ type: String, trim: true, get: setImageUrl }],
  images: [{ type: String, trim: true, get: setImageUrl }],
  company_name_english: { type: String },
  company_name_chinese: { type: String },
  companydesignation: { type: String },
  description: { type: String },
  email: { type: String },
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
  telegramId: { type: String },
  contact: { type: String },
  fax: { type: String },
  website: { type: String },
  fanpage: { type: String },
  companystatus: { type: Number, default: 0 },
  company_order: { type: Number, default: 1 },
  isTemplate: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
  // usertype:{type:Number,default:0},
});

//  Compiling Schema
companySchema.set("toObject", { getters: true });
companySchema.set("toJSON", { getters: true });
const CompanyModel = mongoose.model("company", companySchema);

export default CompanyModel;
