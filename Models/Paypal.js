import mongoose from "mongoose";

const paypalSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
    membershiperiod: { type: String },
    firstname: { type: String, },
    lastname: { type: String, },
    paypalid: { type: String, },
    transactionid: { type: String },
    paypal: { type: String },
    status: { type: Number,default:0 },
    usertype:{type:Number,default:0},
    paymenttype:{type:Number},
    date: { type: String }
});

//  Compiling Schema
const PaypalModel = mongoose.model("Paypal", paypalSchema);

export default PaypalModel