import mongoose from "mongoose";

const NameuserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  tgid: { type: String, required: true, trim:true, unique:true },
  email: {type:String, required: true, trim:true},
  country: { type: String},
  membertype: { type: String},
  membershiptenure: { type: String},
  joindate: { type: String },
  paid:{type:Number},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const NameuserModel = mongoose.model("Nameuser", NameuserSchema);

export default NameuserModel