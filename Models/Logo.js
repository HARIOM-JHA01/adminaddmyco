import mongoose from "mongoose";
import { setImageUrl,validatorError } from "../Common.js";


const logoSchema = new mongoose.Schema({
  Link :{ type: String },
  Banner :{ type: String,get: setImageUrl},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema

logoSchema.set('toObject', { getters: true })
logoSchema.set('toJSON', { getters: true })
const LogoModel = mongoose.model("Logo", logoSchema);
export default LogoModel