import mongoose from "mongoose";
// import { setImageUrl } from "../Common.js";

const systemSchema = new mongoose.Schema({
  Thumbnail :{ type: String},
  categoryname:{type: mongoose.Schema.Types.ObjectId},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
// systemSchema.set('toObject', { getters: true })
// systemSchema.set('toJSON', { getters: true })
const SystemModel = mongoose.model("System", systemSchema);
export default SystemModel