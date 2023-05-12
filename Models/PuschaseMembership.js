import mongoose from "mongoose";

const purchasemembershipSchema = new mongoose.Schema({
 peroid:{type: String},
 firstname:{type: String},
 lastname:{type: String},
 address:{type: String},
 transaction:{type: String},
 toncoin:{type: String},
 date: { type: Date, default: Date.now }
});

//  Compiling Schema
const PurchaseMembershipModel = mongoose.model("PurchaseMembership", purchasemembershipSchema);

export default PurchaseMembershipModel