import mongoose from "mongoose";

const partnerRenewalPriceSchema = new mongoose.Schema(
  {
    membershipMonths: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    partnerPrice: { type: Number, required: true }, // Discounted price for partners
    discountPercentage: { type: Number },

    status: { type: Number, default: 1 }, // 1: active, 0: inactive
  },
  { timestamps: true }
);

// Calculate discount percentage
partnerRenewalPriceSchema.pre("save", function (next) {
  if (this.originalPrice > 0) {
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.partnerPrice) / this.originalPrice) * 100
    );
  }
  next();
});

const PartnerRenewalPriceModel = mongoose.model(
  "PartnerRenewalPrice",
  partnerRenewalPriceSchema
);
export default PartnerRenewalPriceModel;
