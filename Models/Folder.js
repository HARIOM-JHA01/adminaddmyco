import mongoose from "mongoose";


const folderSchema = new mongoose.Schema({
  Folder :{ type: String },
  user_id:{type: mongoose.Schema.Types.ObjectId ,default:null},
  date: { type: Date, default: Date.now }
});

//  Compiling Schema
const FolderModel = mongoose.model("Folder", folderSchema);
export default FolderModel