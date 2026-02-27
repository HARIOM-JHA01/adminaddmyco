import mongoose from "mongoose";
// import { setImageUrl, validatorError } from "../Common.js";

const backgroundSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  iconcolor: { type: String, default: null },
  fontcolor: { type: String, default: null },
  backgroundcolor: { type: String, default: null },
  fileUrl: { type: [String], default: [] },
  date: { type: Date, default: Date.now },
});

//  Compiling Schema
// backgroundSchema.set('toObject', { getters: true })
// backgroundSchema.set('toJSON', { getters: true })
const BackgroundModel = mongoose.model("Background", backgroundSchema);
export default BackgroundModel;
