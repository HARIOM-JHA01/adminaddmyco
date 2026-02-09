import mongoose from "mongoose";

// Minimal package schema per product requirement:
// - name
// - employeeCredits: number of employee accounts granted
// - operatorCredits: number of operator accounts/slots granted
// - price (USDT)
// - status (active)
const donatorPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeCredits: { type: Number, required: true, default: 0 },
    operatorCredits: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true }, // Price in USDT
    status: { type: Number, default: 1 }, // 1 active, 0 inactive
  },
  { timestamps: true },
);

// Indexes for common queries
donatorPackageSchema.index({ name: 1 });
donatorPackageSchema.index({ status: 1 });

const DonatorPackageModel = mongoose.model(
  "DonatorPackage",
  donatorPackageSchema,
);

export default DonatorPackageModel;
