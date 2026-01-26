import express from "express";
import { Validator } from "node-input-validator";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import SendEmail from "../Utils/SendEmail.js";
import AdvertisementModel from "../Models/Advertisement.js";
import AdvertisementPackageModel from "../Models/AdvertisementPackage.js";
import SponsorCreditsModel from "../Models/SponsorCredits.js";
import AdvertisementDisplayLogModel from "../Models/AdvertisementDisplayLog.js";
import AdvertisementCreditPaymentModel from "../Models/AdvertisementCreditPayment.js";
import UserModel from "../Models/User.js";
import { validatorError } from "../Common.js";
import fs from "fs";
import path from "path";
import { __dirname, baseUrl } from "../Config.js";
import makeDir from "make-dir";

const app = express();

class AdvertisementController {
  // ============================= USER ENDPOINTS =============================

  /**
   * GET /api/v1/advertisement/packages
   * Get all active advertisement packages
   */
  static getPackages = async (req, res) => {
    try {
      const { position } = req.query;

      let filter = { isActive: true };
      if (position) {
        filter.positions = { $in: [position] };
      }

      const packages = await AdvertisementPackageModel.find(filter);

      return res.status(200).json({
        success: true,
        data: packages,
      });
    } catch (error) {
      console.error("Error fetching packages:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching packages",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/my-credits
   * Get user's current credit balance
   */
  static getMyCredits = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { position } = req.query;

      let credits = await SponsorCreditsModel.findOne({ sponsorId });

      if (!credits) {
        credits = {
          sponsorId,
          totalCredits: 0,
          usedCredits: 0,
          balanceCredits: 0,
          transactions: [],
        };
      }

      // Calculate actual used credits from existing ads (overall)
      const overallMatch = {
        sponsorId: sponsorId,
        deletedAt: null,
      };

      const actualUsedCredits = await AdvertisementModel.aggregate([
        { $match: overallMatch },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
          },
        },
      ]);

      const usedCreditsFromAds =
        actualUsedCredits.length > 0 ? actualUsedCredits[0].totalCredits : 0;
      const actualBalance = credits.totalCredits - usedCreditsFromAds;

      // If a position is requested, calculate used credits for that position
      let usedCreditsForPosition = 0;
      if (position) {
        const positionMatch = {
          sponsorId: sponsorId,
          deletedAt: null,
          position,
        };
        const posAgg = await AdvertisementModel.aggregate([
          { $match: positionMatch },
          {
            $group: {
              _id: null,
              totalCredits: { $sum: "$credits" },
            },
          },
        ]);
        usedCreditsForPosition = posAgg.length > 0 ? posAgg[0].totalCredits : 0;
      }

      return res.status(200).json({
        success: true,
        data: {
          ...credits.toObject(),
          usedCredits: usedCreditsFromAds, // Override with calculated value
          balanceCredits: actualBalance, // Override with calculated balance
          requestedPosition: position || null,
          usedCreditsForPosition,
          // Available credits for a specific position is the same as overall balance
          // because the sponsor has a shared pool of credits across positions.
          availableCreditsForPosition: actualBalance,
        },
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching credits",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/advertisement/buy-credits
   * Initiate USDT payment for credits
   */
  static buyCredits = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { packageId, transactionId, walletAddress } = req.body;

      // Validate input
      let validator = new Validator(req.body, {
        packageId: "required",
        transactionId: "required|string",
        walletAddress: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(400).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Get package details
      const package_ = await AdvertisementPackageModel.findById(packageId);
      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check if transaction already exists
      const existingPayment = await AdvertisementCreditPaymentModel.findOne({
        transactionId,
      });
      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: "Transaction already submitted",
        });
      }

      // Create payment record
      const payment = new AdvertisementCreditPaymentModel({
        user: sponsorId,
        telegram_id: req.user.tgid,
        amount: package_.priceUSDT,
        credits: package_.displayCredits,
        package: packageId,
        transactionId,
        walletAddress,
        status: 0, // Pending
      });

      await payment.save();

      return res.status(201).json({
        success: true,
        message: "Payment submitted successfully. Waiting for admin approval.",
        data: {
          paymentId: payment._id,
          transactionId,
          amount: package_.priceUSDT,
          credits: package_.displayCredits,
          status: "PENDING",
          walletAddress,
        },
      });
    } catch (error) {
      console.error("Error buying credits:", error);
      return res.status(500).json({
        success: false,
        message: "Error processing purchase",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/payment-history
   * Get user's payment history
   */
  static getPaymentHistory = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { status, page = 1, limit = 10 } = req.query;

      let filter = { user: sponsorId };
      if (status !== undefined) {
        filter.status = parseInt(status);
      }

      const skip = (page - 1) * limit;

      const payments = await AdvertisementCreditPaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("package", "name displayCredits priceUSDT");

      const total =
        await AdvertisementCreditPaymentModel.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment history",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/advertisement/verify-payment
   * Verify USDT payment and add credits (Deprecated - use payment flow instead)
   */
  static verifyPayment = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { transactionId, txHash } = req.body;

      let validator = new Validator(req.body, {
        transactionId: "required",
        txHash: "required",
      });

      if (!(await validator.check())) {
        return res.status(400).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Find sponsor credits and transaction
      let sponsorCredits = await SponsorCreditsModel.findOne({ sponsorId });
      if (!sponsorCredits) {
        return res.status(404).json({
          success: false,
          message: "No credits record found",
        });
      }

      const transaction = sponsorCredits.transactions.find(
        (t) => t.transactionId === transactionId,
      );
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // TODO: Verify payment on blockchain or payment processor
      // For now, mark as COMPLETED if txHash is provided
      transaction.status = "COMPLETED";
      transaction.txHash = txHash;

      // Update credits
      sponsorCredits.totalCredits += transaction.creditsAdded;
      sponsorCredits.balanceCredits =
        sponsorCredits.totalCredits - sponsorCredits.usedCredits;

      await sponsorCredits.save();

      // Send confirmation email
      const user = await UserModel.findById(sponsorId);
      if (user && user.email) {
        SendEmail.send({
          email: user.email,
          subject: "Advertisement Credits Added",
          html: `<p>Dear ${user.firstname},</p>
                 <p>Your purchase of ${transaction.creditsAdded} advertisement credits has been confirmed.</p>
                 <p>Transaction ID: ${transactionId}</p>
                 <p>New Balance: ${sponsorCredits.balanceCredits} credits</p>`,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          creditsAdded: transaction.creditsAdded,
          newBalance: sponsorCredits.balanceCredits,
          message: "Credits added successfully",
        },
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({
        success: false,
        message: "Error verifying payment",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/advertisement/create
   * Create new advertisement
   */
  static createAdvertisement = async (req, res) => {
    try {
      // If sponsorId is supplied, only allow it when it matches the authenticated user
      // (disallow creating ads on behalf of another sponsor via this endpoint)
      const sponsorIdInput = req.body.sponsorId;
      const sponsorId = sponsorIdInput
        ? String(sponsorIdInput)
        : String(req.user._id);
      if (sponsorIdInput && String(sponsorIdInput) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message:
            "Cannot create advertisement for another sponsor via this endpoint",
        });
      }

      const { position, country, credits, redirectUrl } = req.body;

      // Validate basic fields
      let validator = new Validator(req.body, {
        position: "required|in:HOME_BANNER,BOTTOM_CIRCLE",
        credits: "required|numeric|min:1",
        redirectUrl: "required|url",
      });

      if (!(await validator.check())) {
        return res.status(400).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Normalize country into an array (support string, comma-separated, or array)
      let countries = [];
      if (Array.isArray(country)) {
        countries = country.map((c) => String(c).trim()).filter(Boolean);
      } else if (typeof country === "string") {
        countries = country
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
      }

      if (!countries.length) {
        return res
          .status(400)
          .json({ success: false, message: "Country is required" });
      }

      // Validate Telegram URL
      if (!redirectUrl.startsWith("https://t.me/")) {
        return res.status(400).json({
          success: false,
          message:
            "Redirect URL must start with https://t.me/ (Telegram public URL only)",
        });
      }

      // Ensure credits is a number
      const creditsNum = Number(credits);
      if (!Number.isFinite(creditsNum) || creditsNum <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid credits" });
      }

      // Get display credit rate for the selected position
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;
      const rateDoc = await AdvertisementRateModel.findOne({ position }).lean();
      const rate = rateDoc ? rateDoc.displayCreditRate : 1000;

      // Compute display count from credits
      const displayCountNum = creditsNum * rate;

      if (!Number.isFinite(displayCountNum) || displayCountNum <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid computed display count" });
      }

      // Check sponsor credits (credits are spent, not displayCount)
      let sponsorCredits = await SponsorCreditsModel.findOne({ sponsorId });

      // Calculate actual available credits from existing ads
      const actualUsedCredits = await AdvertisementModel.aggregate([
        {
          $match: {
            sponsorId: sponsorId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
          },
        },
      ]);

      const usedCreditsFromAds =
        actualUsedCredits.length > 0 ? actualUsedCredits[0].totalCredits : 0;
      const totalCredits = sponsorCredits ? sponsorCredits.totalCredits : 0;
      const available = totalCredits - usedCreditsFromAds;

      if (!sponsorCredits || available < creditsNum) {
        console.warn(
          `CreateAd: sponsor ${sponsorId} tried to create ad with ${creditsNum} credits (computed displays: ${displayCountNum}) but has ${available} credits`,
        );
        return res.status(403).json({
          success: false,
          message: "Insufficient credits. Please purchase more credits.",
          availableCredits: available,
          requestedCredits: creditsNum,
        });
      }

      // Check if image file exists
      if (!req.files || !req.files.image) {
        return res.status(400).json({
          success: false,
          message: "Image file is required",
        });
      }

      const image = req.files.image;
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (image.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          message: "Image file size must not exceed 5MB",
        });
      }

      // Save image
      const uploadDir = path.join(__dirname, `assets/advertisement`);
      await makeDir(uploadDir);

      const fileName = `ad_${sponsorId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${image.name.split(".").pop()}`;
      const filePath = path.join(uploadDir, fileName);

      await image.mv(filePath);

      // Construct imageUrl, avoiding double slashes (baseUrl may or may not end with /)
      const cleanBaseUrl = baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl;
      const imageUrl = `${cleanBaseUrl}/assets/advertisement/${fileName}`;

      // Create advertisement first (before deducting credits)
      const advertisement = new AdvertisementModel({
        sponsorId,
        position,
        country: countries,
        credits: creditsNum,
        displayCount: displayCountNum,
        displayUsed: 0,
        displayRemaining: displayCountNum,
        redirectUrl,
        imageUrl,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        statistics: {
          createdAt: new Date(),
        },
        metadata: {
          fileName,
          fileSize: image.size,
          uploadedAt: new Date(),
        },
      });

      await advertisement.save();

      // Deduct credits only after ad is successfully created
      sponsorCredits.usedCredits += creditsNum;
      sponsorCredits.balanceCredits -= creditsNum;
      await sponsorCredits.save();

      return res.status(201).json({
        success: true,
        data: {
          _id: advertisement._id,
          sponsorId: advertisement.sponsorId,
          position: advertisement.position,
          country: Array.isArray(advertisement.country)
            ? advertisement.country.join(", ")
            : advertisement.country,
          credits: advertisement.credits,
          displayCount: advertisement.displayCount,
          displayUsed: advertisement.displayUsed,
          displayRemaining: advertisement.displayRemaining,
          status: advertisement.status,
          approvalStatus: advertisement.approvalStatus,
          imageUrl: advertisement.imageUrl,
          redirectUrl: advertisement.redirectUrl,
          createdAt: advertisement.createdAt,
        },
      });
    } catch (error) {
      console.error("Error creating advertisement:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating advertisement",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/my-ads
   * Get all ads posted by current user
   */
  static getMyAds = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { status, position } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      let filter = { sponsorId, deletedAt: null };
      if (status) filter.status = status;
      if (position) filter.position = position;

      const skip = (page - 1) * limit;

      const ads = await AdvertisementModel.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await AdvertisementModel.countDocuments(filter);

      // Fetch view statistics for each ad
      const adsWithStats = await Promise.all(
        ads.map(async (ad) => {
          const displayLogs = await AdvertisementDisplayLogModel.find({
            advertisementId: ad._id,
          }).lean();

          const viewsByCountry = {};
          displayLogs.forEach((log) => {
            const country = log.country || "Unknown";
            viewsByCountry[country] = (viewsByCountry[country] || 0) + 1;
          });

          return {
            _id: ad._id,
            position: ad.position,
            country: Array.isArray(ad.country)
              ? ad.country.join(", ")
              : ad.country,
            imageUrl: ad.imageUrl,
            redirectUrl: ad.redirectUrl,
            displayCount: ad.displayCount,
            displayUsed: ad.displayUsed,
            displayRemaining: ad.displayRemaining,
            status: ad.status,
            viewCount: displayLogs.length,
            clickCount: displayLogs.filter((log) => log.userClicked).length,
            ctrPercentage:
              displayLogs.length > 0
                ? (displayLogs.filter((log) => log.userClicked).length /
                    displayLogs.length) *
                  100
                : 0,
            viewsByCountry,
            createdAt: ad.createdAt,
            lastDisplayedAt: ad.statistics.lastDisplayedAt,
          };
        }),
      );

      return res.status(200).json({
        success: true,
        data: adsWithStats,
        pagination: {
          page,
          limit,
          total,
        },
      });
    } catch (error) {
      console.error("Error fetching ads:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching advertisements",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/advertisement/:id/pause
   * Pause an active advertisement
   */
  static pauseAd = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { id } = req.params;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      if (ad.sponsorId.toString() !== sponsorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to modify this advertisement",
        });
      }

      ad.status = "PAUSED";
      await ad.save();

      return res.status(200).json({
        success: true,
        data: {
          _id: ad._id,
          status: ad.status,
          message: "Advertisement paused",
        },
      });
    } catch (error) {
      console.error("Error pausing ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error pausing advertisement",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/advertisement/:id/resume
   * Resume a paused advertisement
   */
  static resumeAd = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { id } = req.params;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      if (ad.sponsorId.toString() !== sponsorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to modify this advertisement",
        });
      }

      ad.status = "ACTIVE";
      await ad.save();

      return res.status(200).json({
        success: true,
        data: {
          _id: ad._id,
          status: ad.status,
          message: "Advertisement resumed",
        },
      });
    } catch (error) {
      console.error("Error resuming ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error resuming advertisement",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/advertisement/:id/add-credits
   * Add more credits to an existing advertisement to extend its display capacity
   */
  static addCreditsToAd = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { id } = req.params;
      const { credits } = req.body;

      // Validate credits
      const creditsNum = Number(credits);
      if (!Number.isFinite(creditsNum) || creditsNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid credits amount. Must be a positive number.",
        });
      }

      // Find the advertisement
      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      // Check ownership
      if (ad.sponsorId.toString() !== sponsorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to modify this advertisement",
        });
      }

      // Get the rate for this position
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;
      const rateDoc = await AdvertisementRateModel.findOne({
        position: ad.position,
      }).lean();
      const rate = rateDoc ? rateDoc.displayCreditRate : 1000;

      // Calculate additional displays
      const additionalDisplays = creditsNum * rate;

      // Check if user has enough credits
      const actualUsedCredits = await AdvertisementModel.aggregate([
        {
          $match: {
            sponsorId: sponsorId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
          },
        },
      ]);

      const usedCreditsFromAds =
        actualUsedCredits.length > 0 ? actualUsedCredits[0].totalCredits : 0;

      let sponsorCredits = await SponsorCreditsModel.findOne({ sponsorId });
      const totalCredits = sponsorCredits ? sponsorCredits.totalCredits : 0;
      const available = totalCredits - usedCreditsFromAds;

      if (available < creditsNum) {
        return res.status(403).json({
          success: false,
          message: "Insufficient credits. Please purchase more credits.",
          availableCredits: available,
          requestedCredits: creditsNum,
        });
      }

      // Update the advertisement
      ad.credits += creditsNum;
      ad.displayCount += additionalDisplays;
      ad.displayRemaining += additionalDisplays;

      // If ad was COMPLETED, reactivate it
      if (ad.status === "COMPLETED") {
        ad.status = "ACTIVE";
      }

      await ad.save();

      // Update sponsor credits
      sponsorCredits.usedCredits += creditsNum;
      sponsorCredits.balanceCredits -= creditsNum;
      await sponsorCredits.save();

      return res.status(200).json({
        success: true,
        message: "Credits added successfully",
        data: {
          _id: ad._id,
          creditsAdded: creditsNum,
          displaysAdded: additionalDisplays,
          totalCredits: ad.credits,
          totalDisplays: ad.displayCount,
          displayRemaining: ad.displayRemaining,
          status: ad.status,
          availableCredits: available - creditsNum,
        },
      });
    } catch (error) {
      console.error("Error adding credits to ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error adding credits to advertisement",
        error: error.message,
      });
    }
  };

  /**
   * DELETE /api/v1/advertisement/:id
   * Soft-delete an advertisement
   */
  static deleteAd = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { id } = req.params;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      if (ad.sponsorId.toString() !== sponsorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to delete this advertisement",
        });
      }

      ad.deletedAt = new Date();
      await ad.save();

      return res.status(200).json({
        success: true,
        message: "Advertisement deleted",
      });
    } catch (error) {
      console.error("Error deleting ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting advertisement",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/:id/stats
   * Get detailed statistics for a specific advertisement including views by country and time
   */
  static getAdStats = async (req, res) => {
    try {
      const sponsorId = req.user._id;
      const { id } = req.params;

      // Verify the ad belongs to the user
      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      if (ad.sponsorId.toString() !== sponsorId.toString()) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to view this advertisement's statistics",
        });
      }

      // Get all display logs for this ad
      const displayLogs = await AdvertisementDisplayLogModel.find({
        advertisementId: id,
      }).lean();

      // Get click logs
      const clickLogs = displayLogs.filter((log) => log.userClicked);

      // Group views by country
      const viewsByCountry = {};
      displayLogs.forEach((log) => {
        const country = log.country || "Unknown";
        if (!viewsByCountry[country]) {
          viewsByCountry[country] = 0;
        }
        viewsByCountry[country]++;
      });

      // Group views by date
      const viewsByDate = {};
      displayLogs.forEach((log) => {
        const date = moment(log.displayedAt).format("YYYY-MM-DD");
        if (!viewsByDate[date]) {
          viewsByDate[date] = 0;
        }
        viewsByDate[date]++;
      });

      // Group views by time (hour)
      const viewsByTime = {};
      displayLogs.forEach((log) => {
        const time = moment(log.displayedAt).format("HH:00");
        if (!viewsByTime[time]) {
          viewsByTime[time] = 0;
        }
        viewsByTime[time]++;
      });

      // Detailed view list with all metadata
      const detailedViews = displayLogs.map((log) => ({
        displayId: log._id,
        country: log.country || "Unknown",
        date: moment(log.displayedAt).format("YYYY-MM-DD"),
        time: moment(log.displayedAt).format("HH:mm:ss"),
        hour: moment(log.displayedAt).format("HH:00"),
        position: log.position,
        userClicked: log.userClicked,
        clickedAt: log.clickedAt || null,
        displayedAt: log.displayedAt,
      }));

      return res.status(200).json({
        success: true,
        data: {
          advertisementId: ad._id,
          position: ad.position,
          country: Array.isArray(ad.country)
            ? ad.country.join(", ")
            : ad.country,
          status: ad.status,
          totalViews: displayLogs.length,
          totalClicks: clickLogs.length,
          ctrPercentage:
            displayLogs.length > 0
              ? (clickLogs.length / displayLogs.length) * 100
              : 0,
          summary: {
            viewsByCountry,
            viewsByDate,
            viewsByTime,
          },
          detailedViews,
        },
      });
    } catch (error) {
      console.error("Error fetching ad statistics:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching advertisement statistics",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/my-stats
   * Get comprehensive advertisement credit and display statistics for user
   */
  static getMyStats = async (req, res) => {
    try {
      const sponsorId = req.user._id;

      // Get credit information
      const credits = (await SponsorCreditsModel.findOne({ sponsorId })) || {
        totalCredits: 0,
        usedCredits: 0,
        balanceCredits: 0,
        transactions: [],
      };

      // Calculate actual used credits from existing ads (more accurate than stored value)
      const actualUsedCredits = await AdvertisementModel.aggregate([
        {
          $match: {
            sponsorId: sponsorId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
          },
        },
      ]);

      const usedCreditsFromAds =
        actualUsedCredits.length > 0 ? actualUsedCredits[0].totalCredits : 0;
      const actualBalance = credits.totalCredits - usedCreditsFromAds;

      // Get advertisement rates
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;
      const rates = await AdvertisementRateModel.find({
        isActive: true,
      }).lean();
      const rateMap = {};
      rates.forEach((rate) => {
        rateMap[rate.position] = rate.displayCreditRate;
      });

      // Get all advertisements for this user
      const advertisements = await AdvertisementModel.find({
        sponsorId,
        deletedAt: null,
      });

      // Calculate display stats by position
      const positionStats = {
        HOME_BANNER: {
          displayTotal: 0,
          displayUsed: 0,
          displayRemaining: 0,
          activeAds: 0,
          totalAds: 0,
        },
        BOTTOM_CIRCLE: {
          displayTotal: 0,
          displayUsed: 0,
          displayRemaining: 0,
          activeAds: 0,
          totalAds: 0,
        },
      };

      advertisements.forEach((ad) => {
        const position = ad.position;
        if (positionStats[position]) {
          positionStats[position].displayTotal += ad.displayCount;
          positionStats[position].displayUsed += ad.displayUsed;
          positionStats[position].displayRemaining += ad.displayRemaining;
          positionStats[position].totalAds += 1;

          if (ad.status === "ACTIVE") {
            positionStats[position].activeAds += 1;
          }
        }
      });

      // Calculate credit allocation and display capacity by position
      const creditAllocationByPosition = {
        HOME_BANNER: {
          creditsAllocated: 0,
          displayCapacity: 0,
        },
        BOTTOM_CIRCLE: {
          creditsAllocated: 0,
          displayCapacity: 0,
        },
      };

      // Get packages to map positions to credits
      const packages = await AdvertisementPackageModel.find({ isActive: true });

      // Calculate credits allocated to each position based on completed transactions
      credits.transactions.forEach((transaction) => {
        if (transaction.status === "COMPLETED") {
          // Find the package
          const pkg = packages.find(
            (p) => p._id.toString() === transaction.packageId?.toString(),
          );
          if (pkg) {
            const positions = pkg.positions;
            const creditsPerPosition =
              transaction.creditsAdded / positions.length;

            positions.forEach((pos) => {
              if (creditAllocationByPosition[pos]) {
                creditAllocationByPosition[pos].creditsAllocated +=
                  creditsPerPosition;
                // Calculate display capacity using rates
                const rate = rateMap[pos] || 1000; // Default to 1000 if no rate found
                creditAllocationByPosition[pos].displayCapacity +=
                  creditsPerPosition * rate;
              }
            });
          }
        }
      });

      // Calculate used credits based on actual display usage
      const creditUsageByPosition = {
        HOME_BANNER: {
          creditsUsed: 0,
        },
        BOTTOM_CIRCLE: {
          creditsUsed: 0,
        },
      };

      // Calculate credits used based on display usage and rates
      Object.keys(positionStats).forEach((position) => {
        const rate = rateMap[position] || 1000;
        const displaysUsed = positionStats[position].displayUsed;
        creditUsageByPosition[position].creditsUsed = displaysUsed / rate;
      });

      const response = {
        credits: {
          total: credits.totalCredits,
          used: usedCreditsFromAds, // Use calculated value from actual ads
          balance: actualBalance, // Use calculated balance
          transactions: credits.transactions,
        },
        rates: rateMap, // Include rates for reference
        positions: {
          startPage: {
            // HOME_BANNER
            creditAllocated:
              creditAllocationByPosition.HOME_BANNER.creditsAllocated,
            creditUsed: creditUsageByPosition.HOME_BANNER.creditsUsed,
            displayCapacity:
              creditAllocationByPosition.HOME_BANNER.displayCapacity,
            displayTotal: positionStats.HOME_BANNER.displayTotal,
            displayUsed: positionStats.HOME_BANNER.displayUsed,
            displayRemaining: positionStats.HOME_BANNER.displayRemaining,
            activeAds: positionStats.HOME_BANNER.activeAds,
            totalAds: positionStats.HOME_BANNER.totalAds,
          },
          bottomCircle: {
            // BOTTOM_CIRCLE
            creditAllocated:
              creditAllocationByPosition.BOTTOM_CIRCLE.creditsAllocated,
            creditUsed: creditUsageByPosition.BOTTOM_CIRCLE.creditsUsed,
            displayCapacity:
              creditAllocationByPosition.BOTTOM_CIRCLE.displayCapacity,
            displayTotal: positionStats.BOTTOM_CIRCLE.displayTotal,
            displayUsed: positionStats.BOTTOM_CIRCLE.displayUsed,
            displayRemaining: positionStats.BOTTOM_CIRCLE.displayRemaining,
            activeAds: positionStats.BOTTOM_CIRCLE.activeAds,
            totalAds: positionStats.BOTTOM_CIRCLE.totalAds,
          },
        },
        summary: {
          totalDisplaysCapacity:
            creditAllocationByPosition.HOME_BANNER.displayCapacity +
            creditAllocationByPosition.BOTTOM_CIRCLE.displayCapacity,
          totalDisplaysPurchased:
            creditAllocationByPosition.HOME_BANNER.displayCapacity +
            creditAllocationByPosition.BOTTOM_CIRCLE.displayCapacity,
          totalDisplaysUsed:
            positionStats.HOME_BANNER.displayUsed +
            positionStats.BOTTOM_CIRCLE.displayUsed,
          totalDisplaysRemaining:
            creditAllocationByPosition.HOME_BANNER.displayCapacity -
            positionStats.HOME_BANNER.displayUsed +
            (creditAllocationByPosition.BOTTOM_CIRCLE.displayCapacity -
              positionStats.BOTTOM_CIRCLE.displayUsed),
          totalActiveAds:
            positionStats.HOME_BANNER.activeAds +
            positionStats.BOTTOM_CIRCLE.activeAds,
        },
      };

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching advertisement stats:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching advertisement statistics",
        error: error.message,
      });
    }
  };

  // ============================= PUBLIC ENDPOINTS =============================

  /**
   * GET /api/v1/advertisement/active
   * Get active ads for display (called on app load)
   */
  static getActiveAds = async (req, res) => {
    try {
      let { position, country = "GLOBAL" } = req.query;

      if (!position) {
        return res.status(400).json({
          success: false,
          message: "Position parameter is required",
        });
      }

      // Generate session ID
      const sessionId = `sess_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;

      // Find active ads by position
      let ads = await AdvertisementModel.find({
        position,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        displayRemaining: { $gt: 0 },
        deletedAt: null,
      });

      // Country filtering configuration (system-wide)
      const requestedCountry = (country || "GLOBAL").toUpperCase();
      // Read system config to determine whether country-based ads should be used.
      let countryFilteringEnabled = true;
      try {
        const ConfigurationModel = (await import("../Models/Configuration.js"))
          .default;
        const cfg = await ConfigurationModel.findOne({
          ConfigKey: "ADVERTISEMENTS_COUNTRY_FILTER",
        });
        if (cfg && (cfg.ConfigValue === "0" || cfg.ConfigValue === 0)) {
          countryFilteringEnabled = false;
        }
      } catch (e) {
        // ignore and default to enabled
      }

      // If country filtering disabled, force GLOBAL
      if (!countryFilteringEnabled) {
        country = "GLOBAL";
      }

      // Filter by country: first try user's country, then GLOBAL
      // Handle both array and string formats for ad.country
      let filteredAds = ads.filter((ad) => {
        const adCountries = Array.isArray(ad.country)
          ? ad.country
          : [ad.country || "GLOBAL"];
        return adCountries.includes(requestedCountry);
      });

      if (filteredAds.length === 0) {
        filteredAds = ads.filter((ad) => {
          const adCountries = Array.isArray(ad.country)
            ? ad.country
            : [ad.country || "GLOBAL"];
          return adCountries.includes("GLOBAL");
        });
      }

      // Return one random ad
      let selectedAd = null;
      if (filteredAds.length > 0) {
        selectedAd =
          filteredAds[Math.floor(Math.random() * filteredAds.length)];
      }

      const result = selectedAd
        ? [
            {
              _id: selectedAd._id,
              position: selectedAd.position,
              imageUrl: selectedAd.imageUrl,
              redirectUrl: selectedAd.redirectUrl,
              displayRemaining: selectedAd.displayRemaining,
            },
          ]
        : [];

      return res.status(200).json({
        success: true,
        data: result,
        sessionId,
      });
    } catch (error) {
      console.error("Error fetching active ads:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching advertisements",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/country-configs
   * Deprecated: country configs removed. Use System Configuration (ConfigKey=ADVERTISEMENTS_COUNTRY_FILTER).
   */
  static getCountryConfigs = async (req, res) => {
    return res.status(410).json({
      success: false,
      message:
        "Country configs have been removed. Use system configuration (ConfigKey=ADVERTISEMENTS_COUNTRY_FILTER) to toggle country-based ad filtering.",
    });
  };

  /**
   * GET /api/v1/advertisement/config/ad-country-filter
   * Public: returns current system value for ADVERTISEMENTS_COUNTRY_FILTER (0/1)
   */
  static getAdCountryFilterConfig = async (req, res) => {
    try {
      const ConfigurationModel = (await import("../Models/Configuration.js"))
        .default;
      const cfg = await ConfigurationModel.findOne({
        ConfigKey: "ADVERTISEMENTS_COUNTRY_FILTER",
      });
      const value =
        cfg && cfg.ConfigValue !== undefined && cfg.ConfigValue !== null
          ? String(cfg.ConfigValue)
          : "1";
      return res.status(200).json({
        success: true,
        ConfigKey: "ADVERTISEMENTS_COUNTRY_FILTER",
        ConfigValue: value,
      });
    } catch (error) {
      console.error("Error fetching advertisement config:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching configuration",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/advertisement/:id/track-display
   * Track an impression (ad shown to user)
   */
  static trackDisplay = async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId, country, timezone } = req.body;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      // Capture server-side information
      const now = new Date();
      const utcTimestamp = now.toISOString();

      // Get IP address (handle various proxy headers)
      const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.headers["x-real-ip"] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        "unknown";

      // Get user agent
      const userAgent = req.headers["user-agent"] || "unknown";

      // Increment view count
      ad.viewCount += 1;
      ad.displayUsed += 1;
      ad.displayRemaining -= 1;

      // Update statistics
      if (!ad.statistics.firstDisplayedAt) {
        ad.statistics.firstDisplayedAt = now;
      }
      ad.statistics.lastDisplayedAt = now;

      // If displayRemaining reaches 0, mark as COMPLETED
      if (ad.displayRemaining <= 0) {
        ad.status = "COMPLETED";
      }

      await ad.save();

      // Log display with enhanced tracking data
      await AdvertisementDisplayLogModel.create({
        advertisementId: id,
        sessionId,
        country: country || "GLOBAL",
        position: ad.position,
        displayedAt: now,
        displayedAtUTC: utcTimestamp,
        timezone: timezone || null,
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        success: true,
        message: "Display tracked",
      });
    } catch (error) {
      console.error("Error tracking display:", error);
      return res.status(500).json({
        success: false,
        message: "Error tracking display",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/advertisement/:id/track-click
   * Track when user clicks redirect link
   */
  static trackClick = async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId } = req.body;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      // Increment click count and update CTR
      ad.clickCount += 1;
      ad.statistics.ctrPercentage =
        ad.viewCount > 0 ? (ad.clickCount / ad.viewCount) * 100 : 0;

      await ad.save();

      // Log click
      await AdvertisementDisplayLogModel.updateOne(
        { advertisementId: id, sessionId },
        {
          userClicked: true,
          clickedAt: new Date(),
        },
      );

      return res.status(200).json({
        success: true,
        redirectUrl: ad.redirectUrl,
      });
    } catch (error) {
      console.error("Error tracking click:", error);
      return res.status(500).json({
        success: false,
        message: "Error tracking click",
        error: error.message,
      });
    }
  };

  // ============================= ADMIN ENDPOINTS =============================

  /**
   * GET /api/v1/admin/advertisement/packages
   * List all packages (active & inactive)
   */
  static adminGetPackages = async (req, res) => {
    try {
      const packages = await AdvertisementPackageModel.find();

      return res.status(200).json({
        success: true,
        data: packages,
      });
    } catch (error) {
      console.error("Error fetching packages:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching packages",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/advertisement/packages/:id
   * Get single package
   */
  static adminGetPackage = async (req, res) => {
    try {
      const { id } = req.params;

      const package_ = await AdvertisementPackageModel.findById(id);

      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: package_,
      });
    } catch (error) {
      console.error("Error fetching package:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching package",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/v1/admin/advertisement/packages
   * Create new package
   */
  static adminCreatePackage = async (req, res) => {
    try {
      const {
        name,
        description,
        displayCredits,
        priceUSDT,
        positions,
        duration,
        isActive,
      } = req.body;

      let validator = new Validator(req.body, {
        name: "required|string|minLength:3|maxLength:50",
        displayCredits: "required|numeric|min:1",
        priceUSDT: "required|numeric|min:0",
        positions: "required|array",
      });

      if (!(await validator.check())) {
        return res.status(400).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Check if a package with the same name and overlapping positions already exists
      const existingPackage = await AdvertisementPackageModel.findOne({
        name,
        positions: { $in: positions },
      });
      if (existingPackage) {
        return res.status(400).json({
          success: false,
          message: "Package with same name and display position already exists",
        });
      }

      const newPackage = new AdvertisementPackageModel({
        name,
        description,
        displayCredits,
        priceUSDT,
        positions,
        duration: duration || null,
        isActive: isActive !== false,
      });

      await newPackage.save();

      return res.status(201).json({
        success: true,
        data: newPackage,
      });
    } catch (error) {
      console.error("Error creating package:", error);
      if (error && error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Package with same name and display position already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error creating package",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/packages/:id
   * Update package
   */
  static adminUpdatePackage = async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // If name or positions are being changed, ensure no other package has the same name
      // and an overlapping position (exclude the current package id)
      if (updates.name || updates.positions) {
        const currentPackage = await AdvertisementPackageModel.findById(id);
        if (!currentPackage) {
          return res
            .status(404)
            .json({ success: false, message: "Package not found" });
        }
        const newName = updates.name || currentPackage.name;
        const newPositions = updates.positions || currentPackage.positions;

        const conflict = await AdvertisementPackageModel.findOne({
          _id: { $ne: id },
          name: newName,
          positions: { $in: newPositions },
        });

        if (conflict) {
          return res.status(400).json({
            success: false,
            message:
              "Package with same name and display position already exists",
          });
        }
      }

      const package_ = await AdvertisementPackageModel.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true },
      );

      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: package_,
      });
    } catch (error) {
      console.error("Error updating package:", error);
      if (error && error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Package with same name and display position already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error updating package",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/packages/:id/toggle
   * Toggle package active status
   */
  static adminTogglePackage = async (req, res) => {
    try {
      const { id } = req.params;

      const package_ = await AdvertisementPackageModel.findById(id);

      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      package_.isActive = !package_.isActive;
      await package_.save();

      return res.status(200).json({
        success: true,
        data: package_,
      });
    } catch (error) {
      console.error("Error toggling package:", error);
      return res.status(500).json({
        success: false,
        message: "Error toggling package",
        error: error.message,
      });
    }
  };

  /**
   * DELETE /api/v1/admin/advertisement/packages/:id
   * Delete a package
   */
  static adminDeletePackage = async (req, res) => {
    try {
      const { id } = req.params;

      const package_ = await AdvertisementPackageModel.findByIdAndDelete(id);

      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Package deleted successfully",
        data: package_,
      });
    } catch (error) {
      console.error("Error deleting package:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting package",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/advertisement/all
   * List all advertisements with sponsor details
   */
  static adminGetAllAds = async (req, res) => {
    try {
      const {
        status,
        approvalStatus,
        position,
        country,
        page = 1,
        limit = 10,
      } = req.query;

      let filter = { deletedAt: null };
      if (status) filter.status = status;
      if (approvalStatus) filter.approvalStatus = approvalStatus;
      if (position) filter.position = position;
      if (country) filter.country = country;

      const skip = (page - 1) * limit;

      const ads = await AdvertisementModel.find(filter)
        .populate(
          "sponsorId",
          "firstname lastname email tgid telegramId username",
        )
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await AdvertisementModel.countDocuments(filter);

      const adsWithStats = ads.map((ad) => {
        const telegramUsername =
          ad.sponsorId?.telegramId ||
          ad.sponsorId?.username ||
          ad.sponsorId?.tgid ||
          "N/A";
        const telegramUrl =
          telegramUsername && telegramUsername !== "N/A"
            ? `https://t.me/${telegramUsername.replace("@", "")}`
            : null;

        return {
          _id: ad._id,
          sponsor: {
            _id: ad.sponsorId?._id,
            firstName: ad.sponsorId?.firstname,
            lastName: ad.sponsorId?.lastname,
            email: ad.sponsorId?.email,
            tgid: ad.sponsorId?.tgid,
            telegramUsername: telegramUsername,
            telegramUrl: telegramUrl,
          },
          position: ad.position,
          country: ad.country,
          imageUrl: ad.imageUrl,
          redirectUrl: ad.redirectUrl,
          displayCount: ad.displayCount,
          displayUsed: ad.displayUsed,
          displayRemaining: ad.displayRemaining,
          status: ad.status,
          approvalStatus: ad.approvalStatus,
          viewCount: ad.viewCount,
          clickCount: ad.clickCount,
          ctrPercentage:
            ad.viewCount > 0 ? (ad.clickCount / ad.viewCount) * 100 : 0,
          createdAt: ad.createdAt,
        };
      });

      return res.status(200).json({
        success: true,
        data: adsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      });
    } catch (error) {
      console.error("Error fetching ads:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching advertisements",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/:id/approve
   * Approve a pending advertisement
   */
  static adminApproveAd = async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      ad.approvalStatus = "APPROVED";
      await ad.save();

      // Send approval email
      const sponsor = await UserModel.findById(ad.sponsorId);
      if (sponsor && sponsor.email) {
        SendEmail.send({
          email: sponsor.email,
          subject: "Your Advertisement Has Been Approved",
          html: `<p>Dear ${sponsor.firstname},</p>
                 <p>Your advertisement has been approved and is now live!</p>
                 <p>${notes ? "Admin Notes: " + notes : ""}</p>`,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          _id: ad._id,
          approvalStatus: ad.approvalStatus,
          message: "Advertisement approved",
        },
      });
    } catch (error) {
      console.error("Error approving ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error approving advertisement",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/:id/reject
   * Reject an advertisement
   */
  static adminRejectAd = async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const ad = await AdvertisementModel.findById(id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      ad.approvalStatus = "REJECTED";
      ad.rejectionReason = rejectionReason;
      ad.status = "REJECTED";
      await ad.save();

      // Refund credits if not yet used
      if (ad.displayUsed === 0) {
        let sponsorCredits = await SponsorCreditsModel.findOne({
          sponsorId: ad.sponsorId,
        });
        if (sponsorCredits) {
          // If this ad was created before 'credits' field existed, derive credits from displayCount and position rate
          let creditsToRefund = ad.credits;
          if (!creditsToRefund) {
            const AdvertisementRateModel = (
              await import("../Models/AdvertisementRate.js")
            ).default;
            const rateDoc = await AdvertisementRateModel.findOne({
              position: ad.position,
            }).lean();
            const rate = rateDoc ? rateDoc.displayCreditRate : 1000;
            creditsToRefund = Math.ceil(ad.displayCount / rate);
          }

          sponsorCredits.usedCredits -= creditsToRefund;
          sponsorCredits.balanceCredits += creditsToRefund;
          await sponsorCredits.save();
        }
      }

      // Send rejection email
      const sponsor = await UserModel.findById(ad.sponsorId);
      if (sponsor && sponsor.email) {
        SendEmail.send({
          email: sponsor.email,
          subject: "Your Advertisement Has Been Rejected",
          html: `<p>Dear ${sponsor.firstname},</p>
                 <p>Unfortunately, your advertisement has been rejected.</p>
                 <p>Reason: ${rejectionReason}</p>
                 <p>Please contact support if you have any questions.</p>`,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          _id: ad._id,
          approvalStatus: ad.approvalStatus,
          message: "Advertisement rejected",
        },
      });
    } catch (error) {
      console.error("Error rejecting ad:", error);
      return res.status(500).json({
        success: false,
        message: "Error rejecting advertisement",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/advertisement/analytics
   * Get analytics dashboard data
   */
  static adminGetAnalytics = async (req, res) => {
    try {
      const { startDate, endDate, country } = req.query;

      let dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      let filter = { deletedAt: null };
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
      if (country) filter.country = country;

      const totalAds = await AdvertisementModel.countDocuments(filter);
      const activeAds = await AdvertisementModel.countDocuments({
        ...filter,
        status: "ACTIVE",
      });
      const completedAds = await AdvertisementModel.countDocuments({
        ...filter,
        status: "COMPLETED",
      });

      const ads = await AdvertisementModel.find(filter);

      let totalDisplays = 0;
      let totalClicks = 0;
      let totalRevenueUSDT = 0;

      ads.forEach((ad) => {
        totalDisplays += ad.viewCount;
        totalClicks += ad.clickCount;
      });

      // Calculate total revenue from completed transactions
      const completedTransactions = await SponsorCreditsModel.aggregate([
        {
          $unwind: "$transactions",
        },
        {
          $match: {
            "transactions.status": "COMPLETED",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$transactions.amountUSDT" },
          },
        },
      ]);

      if (completedTransactions.length > 0) {
        totalRevenueUSDT = completedTransactions[0].totalRevenue;
      }

      // Top sponsors
      const topSponsors = await AdvertisementModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$sponsorId",
            activeAds: {
              $sum: {
                $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0],
              },
            },
            totalDisplays: { $sum: "$viewCount" },
            totalClicks: { $sum: "$clickCount" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "sponsor",
          },
        },
        { $sort: { totalDisplays: -1 } },
        { $limit: 5 },
      ]);

      // Ads by position
      const adsByPosition = await AdvertisementModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$position",
            count: { $sum: 1 },
            displays: { $sum: "$viewCount" },
            clicks: { $sum: "$clickCount" },
          },
        },
      ]);

      // Ads by country
      const adsByCountry = await AdvertisementModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$country",
            count: { $sum: 1 },
            displays: { $sum: "$viewCount" },
            clicks: { $sum: "$clickCount" },
          },
        },
        { $sort: { displays: -1 } },
      ]);

      const overallCTR =
        totalDisplays > 0 ? (totalClicks / totalDisplays) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          totalAds,
          activeAds,
          completedAds,
          totalDisplays,
          totalClicks,
          overallCTR: parseFloat(overallCTR.toFixed(2)),
          totalRevenueUSDT,
          topSponsors: topSponsors.map((sponsor) => ({
            sponsorId: sponsor._id,
            sponsorName:
              sponsor.sponsor.length > 0
                ? `${sponsor.sponsor[0].firstname} ${sponsor.sponsor[0].lastname}`
                : "Unknown",
            activeAds: sponsor.activeAds,
            totalDisplays: sponsor.totalDisplays,
            totalClicks: sponsor.totalClicks,
          })),
          adsByPosition: adsByPosition.reduce((acc, item) => {
            acc[item._id] = {
              count: item.count,
              displays: item.displays,
              clicks: item.clicks,
            };
            return acc;
          }, {}),
          adsByCountry: adsByCountry.map((item) => ({
            country: item._id,
            count: item.count,
            displays: item.displays,
            clicks: item.clicks,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching analytics",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/sponsor/:sponsorId/details
   * Get detailed sponsor information
   */
  static adminGetSponsorDetails = async (req, res) => {
    try {
      const { sponsorId } = req.params;

      const sponsor = await UserModel.findById(sponsorId);
      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: "Sponsor not found",
        });
      }

      const creditInfo = await SponsorCreditsModel.findOne({ sponsorId });
      const advertisements = await AdvertisementModel.find({
        sponsorId,
        deletedAt: null,
      });

      const transactions = creditInfo ? creditInfo.transactions : [];

      return res.status(200).json({
        success: true,
        data: {
          sponsor: {
            _id: sponsor._id,
            firstName: sponsor.firstname,
            lastName: sponsor.lastname,
            email: sponsor.email,
            tgid: sponsor.tgid,
          },
          creditInfo: {
            totalCredits: creditInfo ? creditInfo.totalCredits : 0,
            usedCredits: creditInfo ? creditInfo.usedCredits : 0,
            balanceCredits: creditInfo ? creditInfo.balanceCredits : 0,
          },
          advertisements: advertisements.map((ad) => ({
            _id: ad._id,
            position: ad.position,
            status: ad.status,
            displayCount: ad.displayCount,
            displayUsed: ad.displayUsed,
            viewCount: ad.viewCount,
            clickCount: ad.clickCount,
            ctrPercentage:
              ad.viewCount > 0 ? (ad.clickCount / ad.viewCount) * 100 : 0,
            createdAt: ad.createdAt,
          })),
          transactions,
        },
      });
    } catch (error) {
      console.error("Error fetching sponsor details:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching sponsor details",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/advertisement/credit-payments
   * Get all pending credit payment requests
   */
  static adminGetCreditPayments = async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      let filter = {};
      if (status !== undefined) {
        filter.status = parseInt(status);
      }

      const skip = (page - 1) * limit;

      const payments = await AdvertisementCreditPaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "firstname lastname email tgid")
        .populate("package", "name displayCredits priceUSDT");

      const total =
        await AdvertisementCreditPaymentModel.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: payments.map((payment) => ({
          _id: payment._id,
          user: payment.user,
          package: payment.package,
          transactionId: payment.transactionId,
          walletAddress: payment.walletAddress,
          amount: payment.amount,
          credits: payment.credits,
          status: payment.status, // 0: pending, 1: approved, 2: rejected
          statusLabel:
            payment.status === 0
              ? "Pending"
              : payment.status === 1
                ? "Approved"
                : "Rejected",
          approvalNotes: payment.approvalNotes,
          rejectionReason: payment.rejectionReason,
          createdAt: payment.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching credit payments:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching credit payments",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/credit-payments/:id/approve
   * Approve a credit payment request
   */
  static adminApproveCreditPayment = async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user._id;

      const payment = await AdvertisementCreditPaymentModel.findById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Idempotent handling: if already approved, return success; if rejected, return conflict
      if (payment.status === 1) {
        return res.status(200).json({
          success: true,
          message: "Payment already approved",
          data: payment,
        });
      }

      if (payment.status === 2) {
        console.warn(`Attempt to approve already rejected payment ${id}`);
        return res.status(409).json({
          success: false,
          message: "Payment already rejected",
          status: payment.status,
        });
      }

      // Get package details to determine position
      const pkg = await AdvertisementPackageModel.findById(
        payment.package,
      ).lean();
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Calculate display capacity based on the package's position rate
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      // Use the first position in the package (packages are typically specific to one position)
      const position = pkg.positions[0];
      const rateDoc = await AdvertisementRateModel.findOne({
        position,
        isActive: true,
      }).lean();

      // Get the rate for this position, default to 1000 if not found
      const rate = rateDoc ? rateDoc.displayCreditRate : 1000;
      const displayCapacity = payment.credits * rate;

      // Update payment status and store display capacity
      payment.status = 1; // Approved
      // Clear approval notes as per config: do not retain admin notes on approval
      payment.approvalNotes = "";
      payment.approvedBy = adminId;
      payment.approvedAt = new Date();
      payment.displayCapacity = displayCapacity;
      await payment.save();

      // Update user's credits
      let sponsorCredits = await SponsorCreditsModel.findOne({
        sponsorId: payment.user,
      });
      if (!sponsorCredits) {
        sponsorCredits = new SponsorCreditsModel({
          sponsorId: payment.user,
          totalCredits: 0,
          usedCredits: 0,
          balanceCredits: 0,
          transactions: [],
        });
      }

      sponsorCredits.totalCredits += payment.credits;
      sponsorCredits.balanceCredits += payment.credits;
      sponsorCredits.transactions.push({
        transactionId: payment.transactionId,
        packageId: payment.package,
        creditsAdded: payment.credits,
        amountUSDT: payment.amount,
        // Store the display capacity locked at this moment
        displayCapacity: displayCapacity,
        // use allowed enum value
        status: "COMPLETED",
        walletAddress: payment.walletAddress,
        transactionDate: payment.approvedAt || new Date(),
        txHash: payment.txHash || null,
      });

      try {
        await sponsorCredits.save();
      } catch (err) {
        // Roll back payment approval if credits update fails
        console.error(
          "Error updating sponsor credits, reverting payment approval:",
          err,
        );
        payment.status = 0;
        payment.approvalNotes = "";
        payment.approvedBy = null;
        payment.approvedAt = null;
        await payment.save();

        return res.status(500).json({
          success: false,
          message: "Error updating sponsor credits",
          error: err.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment approved successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error approving payment:", error);
      return res.status(500).json({
        success: false,
        message: "Error approving payment",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/credit-payments/:id/reject
   * Reject a credit payment request
   */
  static adminRejectCreditPayment = async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user._id;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const payment = await AdvertisementCreditPaymentModel.findById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Idempotent handling: if already rejected, return success; if already approved, return conflict
      if (payment.status === 2) {
        return res.status(200).json({
          success: true,
          message: "Payment already rejected",
          data: payment,
        });
      }

      if (payment.status === 1) {
        console.warn(`Attempt to reject already approved payment ${id}`);
        return res.status(409).json({
          success: false,
          message: "Payment already approved",
          status: payment.status,
        });
      }

      // Update payment status
      payment.status = 2; // Rejected
      payment.rejectionReason = reason;
      // Ensure approval notes are cleared on rejection
      payment.approvalNotes = "";
      payment.approvedBy = adminId;
      payment.approvedAt = new Date();
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Payment rejected successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error rejecting payment:", error);
      return res.status(500).json({
        success: false,
        message: "Error rejecting payment",
        error: error.message,
      });
    }
  };

  // ============================= COUPON RATES =============================

  /**
   * GET /api/v1/admin/advertisement/rates
   * Get all coupon rates
   */
  static adminGetRates = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      const rates = await AdvertisementRateModel.find().lean();

      return res.status(200).json({
        success: true,
        data: rates,
      });
    } catch (error) {
      console.error("Error fetching rates:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching rates",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/advertisement/rates/:position
   * Get specific coupon rate
   */
  static adminGetRate = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      const { position } = req.params;

      const rate = await AdvertisementRateModel.findOne({ position }).lean();

      if (!rate) {
        return res.status(404).json({
          success: false,
          message: "Rate not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: rate,
      });
    } catch (error) {
      console.error("Error fetching rate:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching rate",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/advertisement/rates/:position
   * Update coupon rate
   */
  static adminUpdateRate = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      const { position } = req.params;
      const { displayCreditRate, description } = req.body;

      // Validate input
      if (!displayCreditRate || displayCreditRate < 1) {
        return res.status(400).json({
          success: false,
          message: "Display credit rate must be at least 1",
        });
      }

      const rate = await AdvertisementRateModel.findOneAndUpdate(
        { position },
        {
          displayCreditRate: parseInt(displayCreditRate),
          description: description || "",
        },
        { new: true, runValidators: true },
      );

      if (!rate) {
        return res.status(404).json({
          success: false,
          message: "Rate not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Rate updated successfully",
        data: rate,
      });
    } catch (error) {
      console.error("Error updating rate:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating rate",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/advertisement/rates
   * Get coupon rates (public - for users)
   */
  static getUserRates = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      const rates = await AdvertisementRateModel.find({
        isActive: true,
      }).lean();

      const ratesMap = {};
      rates.forEach((rate) => {
        ratesMap[rate.position] = rate.displayCreditRate;
      });

      return res.status(200).json({
        success: true,
        data: ratesMap,
        rates: rates,
      });
    } catch (error) {
      console.error("Error fetching rates:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching rates",
        error: error.message,
      });
    }
  };
}

export default AdvertisementController;
