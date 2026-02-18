import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

/**
 * CompanyTemplate – standalone entity for company templates.
 * Mirrors all fields of the Company model but adds `template_title`.
 * Operators and donator (enterprise) users can create/manage these.
 */
const companyTemplateSchema = new mongoose.Schema({
  // Owner – either an enterprise user (usertype=2) or an operator (_id from Operator collection)
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  owner_type: {
    type: String,
    enum: ["enterprise", "operator"],
    required: true,
  },

  // Template identifier
  template_title: { type: String, required: true, trim: true },

  // ---- All standard Company fields ----
  video: { type: String, trim: true, get: setImageUrl },
  image: { type: String, trim: true, get: setImageUrl },
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

  date: { type: Date, default: Date.now },
});

companyTemplateSchema.set("toObject", { getters: true });
companyTemplateSchema.set("toJSON", { getters: true });

const CompanyTemplateModel = mongoose.model(
  "company_template",
  companyTemplateSchema,
);

export default CompanyTemplateModel;
