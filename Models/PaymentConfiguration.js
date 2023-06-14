import mongoose from "mongoose";

const paymentconfigurationSchema = new mongoose.Schema({
    value : { type: String },
    payment_id: {type: Number},
  
});
//  Compiling Schema
const PaymentConfigurationModel = mongoose.model("paymentconfiguration", paymentconfigurationSchema);
export default PaymentConfigurationModel 