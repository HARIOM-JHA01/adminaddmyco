import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String },
    tgid: { type: String, required: true, unique: true },
    username: { type: String },
    token: { type: String },
    referralCode: { type: String, unique: true },
    referralUrl: { type: String },
    country: { type: String },
    countryCode: { type: String },

    // Credits for user signups
    userCredits: { type: Number, default: 0 },
    usedUserCredits: { type: Number, default: 0 },

    // Credits for membership renewals
    renewalCredits: { type: Number, default: 0 },
    usedRenewalCredits: { type: Number, default: 0 },

    // Status
    status: { type: Number, default: 1 }, // 1: active, 0: inactive
    isReferralActive: { type: Boolean, default: false },

    // Metadata
    joinDate: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for performance
partnerSchema.index({ tgid: 1 });
partnerSchema.index({ referralCode: 1 });

const PartnerModel = mongoose.model("Partner", partnerSchema);
export default PartnerModel;
