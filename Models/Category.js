import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  categoryname : { type: String, unique:true},
});
//  Compiling Schema
const CategoryModel = mongoose.model("Category", categorySchema);
export default CategoryModel 