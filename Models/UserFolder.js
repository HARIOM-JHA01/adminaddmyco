import mongoose from "mongoose";

const userfolderSchema = new mongoose.Schema({
  Folder :{ type: String },
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const UserFolderModel = mongoose.model("UserFolder", userfolderSchema);
export default UserFolderModel