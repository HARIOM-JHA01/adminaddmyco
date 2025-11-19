import mongoose from "mongoose";

const partnerPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["USER_CREDITS", "RENEWAL_CREDITS"],
      required: true,
    },
    credits: { type: Number, required: true },
    price: { type: Number, required: true }, // Price in USDT
    // discount removed, finalPrice removed

    // For renewal credits package
    renewalYears: { type: Number }, // Number of years each renewal gives

    status: { type: Number, default: 1 }, // 1: active, 0: inactive
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Calculate final price before saving
// finalPrice calculation removed - price is stored as-is

const PartnerPackageModel = mongoose.model(
  "PartnerPackage",
  partnerPackageSchema
);
export default PartnerPackageModel;
