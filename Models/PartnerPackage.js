import mongoose from "mongoose";

const partnerPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["USER_CREDITS", "RENEWAL_CREDITS"],
      required: true,
    },
    credits: { type: Number, required: true },
    price: { type: Number, required: true }, // Price in USDT
    discount: { type: Number, default: 0 }, // Discount percentage
    finalPrice: { type: Number },

    // For renewal credits package
    renewalMonths: { type: Number }, // Number of months each renewal gives

    status: { type: Number, default: 1 }, // 1: active, 0: inactive
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Calculate final price before saving
partnerPackageSchema.pre("save", function (next) {
  if (this.discount > 0) {
    this.finalPrice = this.price - (this.price * this.discount) / 100;
  } else {
    this.finalPrice = this.price;
  }
  next();
});

const PartnerPackageModel = mongoose.model(
  "PartnerPackage",
  partnerPackageSchema
);
export default PartnerPackageModel;
