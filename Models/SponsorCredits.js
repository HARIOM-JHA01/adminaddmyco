import mongoose from "mongoose";

const sponsorCreditsSchema = new mongoose.Schema(
  {
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    usedCredits: {
      type: Number,
      default: 0,
    },
    balanceCredits: {
      type: Number,
      default: 0,
    },
    transactions: [
      {
        transactionId: String,
        packageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AdvertisementPackage",
        },
        creditsAdded: Number,
        amountUSDT: Number,
        // Display capacity locked at purchase/approval time (credits × rate at that moment)
        displayCapacity: {
          type: Number,
          default: null,
        },
        status: {
          type: String,
          enum: ["COMPLETED", "PENDING", "FAILED"],
          default: "PENDING",
        },
        walletAddress: String,
        transactionDate: {
          type: Date,
          default: Date.now,
        },
        txHash: {
          type: String,
          default: null,
        },
      },
    ],
  },
  { timestamps: true },
);

const SponsorCreditsModel = mongoose.model(
  "SponsorCredits",
  sponsorCreditsSchema,
);

export default SponsorCreditsModel;
