import mongoose from "mongoose";

const advertisementCountryConfigSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    countryName: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

advertisementCountryConfigSchema.index({ countryCode: 1 }, { unique: true });

const AdvertisementCountryConfigModel = mongoose.model(
  "AdvertisementCountryConfig",
  advertisementCountryConfigSchema
);

export default AdvertisementCountryConfigModel;
