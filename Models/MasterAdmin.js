import mongoose from "mongoose";

const masteradminSchema = new mongoose.Schema({
  name: { type: String, required: true,  trim:true, unique:true },
  email: { type: String, required: true, trim:true, unique:true},
  password: {type:String, trim:true},
  isMasterAdmin:{type:Number,default:0},
  token: { type: String },
  otp:{type:Number},
  join: { type: Date, default: Date.now }
});

//  Compiling Schema
const MasterAdminModel = mongoose.model("MasterAdmin", masteradminSchema);

export default MasterAdminModel