import mongoose from "mongoose";
import { setdate } from "../Common.js";

const toncoinSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "User" },
    membershiperiod: { type: String },
    firstname: { type: String, },
    lastname: { type: String, },
    address: { type: String, },
    paypalid: { type: String, },
    transactionid: { type: String },
    transactiondate: { type: String },
    toncoin: { type: String },
    paypal: { type: String },
    amount: { type: String },
    status: { type: Number, default: 0 },
    // usertype: { type: Number, default: 0 },
    paymenttype: { type: Number, default: 0 },
    paymentstatus: { type: Number, default: null },
    date: { type: Date, default: Date.now }
});

//  Compiling Schema
const ToncoinModel = mongoose.model("Toncoin", toncoinSchema);
export default ToncoinModel