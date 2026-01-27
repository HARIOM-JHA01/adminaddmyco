import mongoose from "mongoose";

const advertisementPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      default: "",
    },
    displayCredits: {
      type: Number,
      required: true,
      min: 1,
    },
    priceUSDT: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPriceUSDT: {
      type: Number,
      default: null,
      min: 0,
    },
    positions: {
      type: [String],
      enum: ["HOME_BANNER", "BOTTOM_CIRCLE"],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one position is required",
      },
    },
    duration: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Ensure uniqueness for the combination of name and individual positions.
// This allows the same package name to be used for different positions but
// prevents duplicate packages with the same name and overlapping positions.
advertisementPackageSchema.index({ name: 1, positions: 1 }, { unique: true });

const AdvertisementPackageModel = mongoose.model(
  "AdvertisementPackage",
  advertisementPackageSchema,
);

export default AdvertisementPackageModel;
