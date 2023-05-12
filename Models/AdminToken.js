import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  User: { type: mongoose.Schema.Types.ObjectId , required: true },
  token: { type: String, required: true }
} ,
{timestamps: true});
const AdminTokenModel = mongoose.model("admintoken", adminSchema);
export default AdminTokenModel;
