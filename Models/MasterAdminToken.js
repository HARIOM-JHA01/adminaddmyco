import mongoose from "mongoose";

const masteradmintokenSchema = new mongoose.Schema({
  User: { type: mongoose.Schema.Types.ObjectId , required: true },
  token: { type: String, required: true }
} ,
{timestamps: true});
const MasterAdminTokenModel = mongoose.model("MasterAdminToken", masteradmintokenSchema);
export default MasterAdminTokenModel;
