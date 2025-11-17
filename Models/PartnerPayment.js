import mongoose from "mongoose";

const partnerPaymentSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerPackage",
      required: true,
    },
    packageType: {
      type: String,
      enum: ["USER_CREDITS", "RENEWAL_CREDITS"],
      required: true,
    },

    amount: { type: Number, required: true },
    credits: { type: Number, required: true },

    transactionId: { type: String, required: true },
    walletAddress: { type: String, required: true },

    status: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
    paymentStatus: { type: Number, default: 0 }, // 0: pending, 1: completed, 2: failed

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
partnerPaymentSchema.index({ partner: 1, paymentDate: -1 });
partnerPaymentSchema.index({ status: 1 });

const PartnerPaymentModel = mongoose.model(
  "PartnerPayment",
  partnerPaymentSchema
);
export default PartnerPaymentModel;
