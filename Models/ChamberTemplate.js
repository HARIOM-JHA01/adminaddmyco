import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

/**
 * ChamberTemplate – standalone entity for chamber templates.
 * Mirrors all fields of the Chamber model but adds `template_title`.
 * Operators and donator (enterprise) users can create/manage these.
 */
const chamberTemplateSchema = new mongoose.Schema({
  // Owner – either an enterprise user (usertype=2) or an operator
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

  // ---- All standard Chamber fields ----
  chamber_name_english: { type: String },
  chamber_name_chinese: { type: String },
  chamberdesignation: { type: String },
  detail: { type: String },
  tgchannel: { type: String },
  chamberfanpage: { type: String },
  chamberwebsite: { type: String },
  chamber_order: { type: Number, default: 1 },
  video: { type: String, trim: true, get: setImageUrl },
  image: { type: String, trim: true, get: setImageUrl },
  images: [{ type: String, trim: true }],
  videos: [{ type: String, trim: true }],
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
  usertype: { type: Number, default: 0 },

  date: { type: Date, default: Date.now },
});

chamberTemplateSchema.set("toObject", { getters: true });
chamberTemplateSchema.set("toJSON", { getters: true });

const ChamberTemplateModel = mongoose.model(
  "chamber_template",
  chamberTemplateSchema,
);

export default ChamberTemplateModel;
