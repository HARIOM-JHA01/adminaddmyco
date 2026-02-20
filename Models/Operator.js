import mongoose from "mongoose";

const operatorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    tgid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    // Login username for operator (preferred for authentication)
    username: {
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
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    // Enterprise (usertype=2) who created this operator (optional)
    createdByEnterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // Donator (usertype=3) who created this operator (optional)
    createdByDonator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // For 3-stage creation: 0 = not started, 1 = stage 1 complete (telegram), 2 = stage 2 complete (profile), 3 = stage 3 complete (company)
    creationStage: { type: Number, default: 0 },
  },
  { timestamps: true },
);

operatorSchema.index({ tgid: 1 });
operatorSchema.index({ username: 1 });
operatorSchema.index({ token: 1 });
operatorSchema.index({ isActive: 1 });

const OperatorModel = mongoose.model("Operator", operatorSchema);

export default OperatorModel;
