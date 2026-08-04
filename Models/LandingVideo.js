import mongoose from "mongoose";
import { setImageUrl, validatorError } from "../Common.js";

const landingVideoSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  videoUrl: { type: String, get: setImageUrl },
  linkUrl: { type: String, required: true },
  isCompressed: { type: Boolean, default: false },
  originalSize: { type: Number, default: null },
  compressedSize: { type: Number, default: null },
  duration: { type: Number, default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  isActive: { type: Boolean, default: true },
  date: { type: Date, default: Date.now },
});

landingVideoSchema.set("toObject", { getters: true });
landingVideoSchema.set("toJSON", { getters: true });

const LandingVideoModel = mongoose.model("LandingVideo", landingVideoSchema);
export default LandingVideoModel;
