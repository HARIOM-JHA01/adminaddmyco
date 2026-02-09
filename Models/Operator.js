import mongoose from "mongoose";

const operatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    token: { type: String },
    role: { type: String, default: "operator" }, // operator or owner
    credits: { type: Number, default: 0 }, // Remaining credits for creating employees
    operatorSlots: { type: Number, default: 0 }, // Number of operator accounts/slots allowed (if applicable)
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

operatorSchema.index({ email: 1 });
operatorSchema.index({ token: 1 });
operatorSchema.index({ isActive: 1 });

const OperatorModel = mongoose.model("Operator", operatorSchema);

export default OperatorModel;
