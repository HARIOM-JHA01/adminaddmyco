import mongoose from "mongoose";

const operatorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    tgid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    telegramId: { type: String, trim: true, lowercase: true },
    password: { type: String },
    token: { type: String },
    role: { type: String, default: "operator" }, // operator or owner
    credits: { type: Number, default: 0 }, // Remaining credits for creating employees
    operatorSlots: { type: Number, default: 0 }, // Number of operator accounts/slots allowed (if applicable)
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    // Donator (usertype=2) who created this operator (optional)
    createdByDonator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

operatorSchema.index({ email: 1 });
operatorSchema.index({ tgid: 1 });
operatorSchema.index({ token: 1 });
operatorSchema.index({ isActive: 1 });

const OperatorModel = mongoose.model("Operator", operatorSchema);

export default OperatorModel;
