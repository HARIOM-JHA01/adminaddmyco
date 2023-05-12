import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true,  trim:true, unique:true },
  email: { type: String, required: true, trim:true},
  password: {type:String, required: true, trim:true},
  profile_image : { type: String},
  // token: { type: String },
  otp:{type:Number},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const AdminModel = mongoose.model("Admin", adminSchema);

export default AdminModel