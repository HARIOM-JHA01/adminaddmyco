// import mongoose from "mongoose";
// // import { setImageUrl } from "../Common.js";

// const systemSchema = new mongoose.Schema({
//   Thumbnail :{ type: String},
//   categoryname:{type: mongoose.Schema.Types.ObjectId},
//   date: { type: Date, default: Date.now }
// });

// //  Compiling Schema
// // systemSchema.set('toObject', { getters: true })
// // systemSchema.set('toJSON', { getters: true })
// const SystemModel = mongoose.model("System", systemSchema);
// export default SystemModel

import mongoose from "mongoose";
// import { setImageUrl } from "../Common.js";

const systemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  type: { type: Number, default: 0 },
  Thumbnail: { type: String },
  categoryname: { type: mongoose.Schema.Types.ObjectId },
  date: { type: Date, default: Date.now },
  telegramId: { type: String, trim: true },
});

//  Compiling Schema
systemSchema.set('toObject', { getters: true })
systemSchema.set('toJSON', { getters: true })
const SystemModel = mongoose.model("System", systemSchema);
export default SystemModel