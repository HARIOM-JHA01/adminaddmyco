import mongoose from "mongoose";

const contactfolderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
  contact_id:{type: mongoose.Schema.Types.ObjectId},
  folder_id:{type: mongoose.Schema.Types.ObjectId},
  tag:{type: String},
  status: {type:Number,default:0 },
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const ContactFolderModel = mongoose.model("ContactFolder", contactfolderSchema);
export default ContactFolderModel