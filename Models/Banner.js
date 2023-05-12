import mongoose from "mongoose";
import { setImageUrl,validatorError } from "../Common.js";


const bannerSchema = new mongoose.Schema({
  Title :{ type: String },
  Link :{ type: String , },
  Banner :{ type: String,get: setImageUrl },
  date: { type: Date, default: Date.now }
});

//  Compiling Schema

bannerSchema.set('toObject', { getters: true })
bannerSchema.set('toJSON', { getters: true })
const BannerModel = mongoose.model("Banner", bannerSchema);
export default BannerModel