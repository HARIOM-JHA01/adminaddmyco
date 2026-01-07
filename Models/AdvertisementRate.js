import mongoose from "mongoose";

const advertisementRateSchema = new mongoose.Schema(
  {
    // Position type: HOME_BANNER or BOTTOM_CIRCLE
    position: {
      type: String,
      enum: ["HOME_BANNER", "BOTTOM_CIRCLE"],
      required: true,
      unique: true,
    },
    // Rate: How many display credits equal 1 package credit
    // Default: 1000 (meaning 1 package credit = 1000 display credits)
    displayCreditRate: {
      type: Number,
      required: true,
      default: 1000,
      min: 1,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const AdvertisementRateModel = mongoose.model(
  "AdvertisementRate",
  advertisementRateSchema
);

export default AdvertisementRateModel;
