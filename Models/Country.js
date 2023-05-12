import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  country_code:{type:String},
  country_name:{type:String}
});

//  Compiling Schema
const CountryModel = mongoose.model("Country", countrySchema);
export default CountryModel