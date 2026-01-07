import mongoose from "mongoose";

const advertisementDisplayLogSchema = new mongoose.Schema(
  {
    advertisementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    country: String,
    position: {
      type: String,
      enum: ["HOME_BANNER", "BOTTOM_CIRCLE"],
    },
    displayedAt: {
      type: Date,
      default: Date.now,
    },
    userClicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const AdvertisementDisplayLogModel = mongoose.model(
  "AdvertisementDisplayLog",
  advertisementDisplayLogSchema
);

export default AdvertisementDisplayLogModel;
