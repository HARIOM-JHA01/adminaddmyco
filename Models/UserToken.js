import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  User: { type: mongoose.Schema.Types.ObjectId , required: true },
  token: { type: String, required: true }
} ,
{timestamps: true});
const UserTokenModel = mongoose.model("usertoken", userSchema);
export default UserTokenModel;
