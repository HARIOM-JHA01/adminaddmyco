import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    position: {
      type: String,
      enum: ["HOME_BANNER", "BOTTOM_CIRCLE"],
      required: true,
    },
    country: {
      type: String,
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    redirectUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^https:\/\/t\.me\//.test(v);
        },
        message: "Redirect URL must start with https://t.me/",
      },
    },
    displayCount: {
      type: Number,
      required: true,
      min: 100,
    },
    displayUsed: {
      type: Number,
      default: 0,
    },
    displayRemaining: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "REJECTED", "COMPLETED"],
      default: "ACTIVE",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    statistics: {
      createdAt: Date,
      firstDisplayedAt: {
        type: Date,
        default: null,
      },
      lastDisplayedAt: {
        type: Date,
        default: null,
      },
      ctrPercentage: {
        type: Number,
        default: 0,
      },
      averageDisplaysPerDay: {
        type: Number,
        default: 0,
      },
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      imageDimensions: {
        width: Number,
        height: Number,
      },
      uploadedAt: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
advertisementSchema.index({ sponsorId: 1 });
advertisementSchema.index({ status: 1 });
advertisementSchema.index({ country: 1 });
advertisementSchema.index({ position: 1 });
advertisementSchema.index({ createdAt: 1 });

const AdvertisementModel = mongoose.model("Advertisement", advertisementSchema);

export default AdvertisementModel;
