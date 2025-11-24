import mongoose from "mongoose";

const partnerUserSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    joinDate: { type: Date, default: Date.now },
    membershipExpiryDate: { type: Date },

    // Renewal tracking
    renewalCount: { type: Number, default: 0 },
    lastRenewalDate: { type: Date },
    lastRenewalBy: { type: String, default: "PARTNER" }, // PARTNER or USER

    // Login tracking
    isFirstLogin: { type: Boolean, default: true },
    firstLoginAt: { type: Date },
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },

    status: { type: Number, default: 1 }, // 1: active, 0: inactive
  },
  { timestamps: true }
);

// Indexes
partnerUserSchema.index({ partner: 1, joinDate: -1 });
partnerUserSchema.index({ user: 1 });
partnerUserSchema.index({ membershipExpiryDate: 1 });

const PartnerUserModel = mongoose.model("PartnerUser", partnerUserSchema);
export default PartnerUserModel;
