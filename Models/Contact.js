import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  contact_id:{type: mongoose.Schema.Types.ObjectId},
  status: {type:Number,default:0 },
  tag:{type: String},
  flag:{type:Number,default:0 },
  date: { type: Date, default: Date.now }
});

//  Compiling Schema

const ContactModel = mongoose.model("Contact", contactSchema);
export default ContactModel