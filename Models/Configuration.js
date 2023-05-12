import mongoose from "mongoose";

const configurationSchema = new mongoose.Schema({
    ConfigKey : { type: String },
    ConfigValue: {type: Number},
  
});
//  Compiling Schema
const ConfigurationModel = mongoose.model("configuration", configurationSchema);
export default ConfigurationModel 