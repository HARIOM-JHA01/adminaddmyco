import mongoose from "mongoose";
import { setImageUrl } from "../Common.js";

const imageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  image: { type: String, trim: true },
  date: { type: Date, default: Date.now },
});


//  Compiling Schema
// imageSchema.set('toObject', { getters: true })
// imageSchema.set('toJSON', { getters: true })
const ImageModel = mongoose.model("image", imageSchema);
export default ImageModel