import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

const employeeNamecardSchema = new mongoose.Schema(
  {
    // Basic employee information - REQUIRED
    name_english: { type: String, required: true },
    name_chinese: { type: String, required: true },
    telegram_username: { type: String, required: true },
    contact_number: { type: String, required: true },
    address1: { type: String, required: true },
    address2: { type: String, required: true },
    address3: { type: String, required: true },

    // Country - REQUIRED for member ID generation
    country_code: { type: String, required: true },

    // Profile media - REQUIRED
    profile_image: { type: String, trim: true, get: setImageUrl },
    profile_video: { type: String, trim: true, get: setImageUrl },

    // Social media - REQUIRED
    whatsapp_link: { type: String, required: true },
    telegram_link: { type: String, required: true },

    // Optional fields
    email: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    x_twitter: { type: String },
    line: { type: String },
    youtube: { type: String },
    website: { type: String },

    // Template references (company required, chamber optional)
    company_template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company_template",
      required: true,
    },
    chamber_template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chamber_template",
      default: null,
    },

    // Owner/Creator references (one of these will be populated)
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      default: null,
    },

    // Status and metadata
    isActive: { type: Boolean, default: true },
    status: { type: Number, default: 0 }, // 0: active, 1: inactive, 2: deleted
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Enable getters for image URL transformation
employeeNamecardSchema.set("toObject", { getters: true, virtuals: true });
employeeNamecardSchema.set("toJSON", { getters: true, virtuals: true });

employeeNamecardSchema.virtual("profile_url").get(function () {
  const companyName = this.company_template?.company_name_english || "";
  const telegramUsername = this.telegram_username || "";
  
  const companyFirstWord = companyName.split(" ")[0] || "";
  const companySlug = companyFirstWord.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const staffSlug = telegramUsername.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (!companySlug || !staffSlug) return "";
  return `https://addmy.co/t.me/${companySlug}-${staffSlug}`;
});

// Indexes for performance
employeeNamecardSchema.index({ employee_username: 1 });
employeeNamecardSchema.index({ tgid: 1 });
employeeNamecardSchema.index({ email: 1 });
employeeNamecardSchema.index({ company_template: 1 });
employeeNamecardSchema.index({ chamber_template: 1 });
employeeNamecardSchema.index({ createdByUser: 1 });
employeeNamecardSchema.index({ createdByOperator: 1 });

const EmployeeNamecardModel = mongoose.model(
  "EmployeeNamecard",
  employeeNamecardSchema,
);

export default EmployeeNamecardModel;
