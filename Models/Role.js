import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: { type: String},
  role: {type: String}
});

//  Compiling Schema
const RoleModel = mongoose.model("role", roleSchema);
export default RoleModel