import mongoose from "mongoose";
import { setImageUrl, validatorError } from "../Common.js";

const chamberSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
    chamber_name_english: { type: String },
    chamber_name_chinese: { type: String },
    chamberdesignation: { type: String },
    detail: { type: String },
    tgchannel: { type: String },
    chamberfanpage: { type: String },
    chamberwebsite: { type: String },
    chamber_order  : {type:Number,default:0},
    video: { type: String, trim: true, get: setImageUrl },
    image: { type: String, trim: true, get: setImageUrl },
    WhatsApp: { type: String },
    WeChat: { type: String },
    Line: { type: String },
    Instagram: { type: String },
    Facebook: { type: String },
    Twitter: { type: String },
    Youtube: { type: String },
    Linkedin: { type: String },
    SnapChat: { type: String },
    Skype: { type: String },
    TikTok: { type: String },
    date: { type: Date, default: Date.now },
    usertype:{type:Number,default:0},
});

//  Compiling Schema
chamberSchema.set('toObject', { getters: true })
chamberSchema.set('toJSON', { getters: true })
const ChamberModel = mongoose.model("chamber", chamberSchema);

export default ChamberModel