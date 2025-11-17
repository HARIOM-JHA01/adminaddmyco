import mongoose from "mongoose";

const partnerTokenSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-delete expired tokens
partnerTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PartnerTokenModel = mongoose.model("PartnerToken", partnerTokenSchema);
export default PartnerTokenModel;
