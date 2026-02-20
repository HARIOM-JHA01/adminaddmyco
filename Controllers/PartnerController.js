import express from "express";
import { Validator } from "node-input-validator";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import mongoose from "mongoose";
import PartnerModel from "../Models/Partner.js";
import PartnerPackageModel from "../Models/PartnerPackage.js";
import PartnerPaymentModel from "../Models/PartnerPayment.js";
import PartnerUserModel from "../Models/PartnerUser.js";
import PartnerRenewalPriceModel from "../Models/PartnerRenewalPrice.js";
import UserModel from "../Models/User.js";
import MembershipModel from "../Models/Membership.js";
import { baseUrl } from "../Config.js";

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];

class PartnerController {
  /**
   * Search users by name, username, or email
   */
  static SearchUser = async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || query.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Search query is required.",
        });
      }

      // Search by firstname, lastname, username, or email (case-insensitive)
      const users = await UserModel.find({
        $or: [
          { firstname: { $regex: query, $options: "i" } },
          { lastname: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
        ],
      }).limit(20);

      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("SearchUser error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
  /**
   * Generate unique referral code
   */
  static generateReferralCode = () => {
    return crypto.randomBytes(6).toString("hex").toUpperCase();
  };

  /**
   * Partner Telegram Login/Register
   * No password required, similar to user Telegram login
   */
  static TelegramLogin = async (req, res) => {
    try {
      const { tgid, name, username, country, countryCode } = req.body;

      const validator = new Validator(req.body, {
        tgid: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Case-insensitive partner lookup by tgid
      const _normPartnerTg = String(tgid || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let partner = null;
      if (_normPartnerTg) {
        const _escPartner = _normPartnerTg.replace(
          /[.*+?^${}()|[\\]\\]/g,
          "\\$&",
        );
        partner = await PartnerModel.findOne({
          tgid: new RegExp(`^${_escPartner}$`, "i"),
        });
      }

      if (!partner) {
        // Create new partner
        const referralCode = PartnerController.generateReferralCode();
        const referralUrl = `https://partner.addmy.co/t.me/${referralCode}`;

        partner = await PartnerModel.create({
          tgid,
          name: name || "",
          username: username || "",
          country: country || "",
          countryCode: countryCode || "",
          referralCode,
          referralUrl,
          userCredits: 0,
          renewalCredits: 0,
          status: 1,
          isReferralActive: false,
        });
      }

      // Generate JWT token
      const payload = { id: partner._id, tgid: partner.tgid };
      const token = jwt.sign(payload, accessTokenSecret, {
        expiresIn: accessTokenLife || "365d",
      });

      // Update token
      partner.token = token;
      partner.lastActive = new Date();
      await partner.save();

      return res.status(200).json({
        success: true,
        message:
          partner.userCredits > 0
            ? "Login successful"
            : "Registration successful. Purchase a package to start.",
        data: {
          partner: {
            id: partner._id,
            tgid: partner.tgid,
            tgUsername: partner.username,
            username: partner.username,
            country: partner.country,
            countryCode: partner.countryCode,
            referralCode: partner.referralCode,
            referralUrl: partner.referralUrl,
            userCredits: partner.userCredits,
            usedUserCredits: partner.usedUserCredits,
            renewalCredits: partner.renewalCredits,
            usedRenewalCredits: partner.usedRenewalCredits,
            isReferralActive: partner.isReferralActive,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Partner Telegram login error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Get Partner Profile
   */
  static GetProfile = async (req, res) => {
    try {
      const partner = req.partner;

      return res.status(200).json({
        success: true,
        data: {
          id: partner._id,
          tgid: partner.tgid,
          tgUsername: partner.username,
          username: partner.username,
          referralCode: partner.referralCode,
          referralUrl: partner.referralUrl,
          userCredits: partner.userCredits,
          usedUserCredits: partner.usedUserCredits,
          availableUserCredits: partner.userCredits - partner.usedUserCredits,
          renewalCredits: partner.renewalCredits,
          usedRenewalCredits: partner.usedRenewalCredits,
          availableRenewalCredits:
            partner.renewalCredits - partner.usedRenewalCredits,
          isReferralActive: partner.isReferralActive,
          joinDate: partner.joinDate,
          lastActive: partner.lastActive,
        },
      });
    } catch (error) {
      console.error("Get partner profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get All Available Packages
   */
  static GetPackages = async (req, res) => {
    try {
      // Show USER_CREDITS packages first by default; still sort by price within type
      const packages = await PartnerPackageModel.aggregate([
        { $match: { status: 1 } },
        {
          $addFields: {
            sortOrder: { $cond: [{ $eq: ["$type", "USER_CREDITS"] }, 0, 1] },
          },
        },
        { $sort: { sortOrder: 1, price: 1 } },
        { $project: { sortOrder: 0 } },
      ]);

      return res.status(200).json({
        success: true,
        data: packages,
      });
    } catch (error) {
      console.error("Get packages error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Purchase Package with USDT
   */
  static PurchasePackage = async (req, res) => {
    try {
      const { packageId, transactionId, walletAddress } = req.body;
      const partnerId = req.partner._id;

      const validator = new Validator(req.body, {
        packageId: "required",
        transactionId: "required|string",
        walletAddress: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Find package
      const packageData = await PartnerPackageModel.findOne({
        _id: packageId,
        status: 1,
      });

      if (!packageData) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check for duplicate transaction
      const existingPayment = await PartnerPaymentModel.findOne({
        transactionId,
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID already used",
        });
      }

      // Create payment record (pending approval)
      const payment = await PartnerPaymentModel.create({
        partner: partnerId,
        package: packageId,
        packageType: packageData.type,
        amount: packageData.price,
        credits: packageData.credits,
        transactionId,
        walletAddress,
        status: 0, // pending
        paymentStatus: 0,
      });

      return res.status(200).json({
        success: true,
        message: "Payment submitted successfully. Waiting for admin approval.",
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          credits: payment.credits,
          status: "pending",
        },
      });
    } catch (error) {
      console.error("Purchase package error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Get Partner Payment History
   */
  static GetPaymentHistory = async (req, res) => {
    try {
      const partnerId = req.partner._id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      const payments = await PartnerPaymentModel.find({ partner: partnerId })
        .populate("package", "name type credits")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await PartnerPaymentModel.countDocuments({
        partner: partnerId,
      });

      return res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get Partner Dashboard Stats
   */
  static GetDashboard = async (req, res) => {
    try {
      const partnerId = req.partner._id;
      const partner = req.partner;

      // Get total users joined
      const totalUsers = await PartnerUserModel.countDocuments({
        partner: partnerId,
      });

      // Get active memberships (not expired)
      const activeUsers = await PartnerUserModel.countDocuments({
        partner: partnerId,
        membershipExpiryDate: { $gte: new Date() },
      });

      // Get expired memberships
      const expiredUsers = await PartnerUserModel.countDocuments({
        partner: partnerId,
        membershipExpiryDate: { $lt: new Date() },
      });

      // Get total renewals done
      const totalRenewals = await PartnerUserModel.aggregate([
        { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
        { $group: { _id: null, total: { $sum: "$renewalCount" } } },
      ]);

      // Get pending payments
      const pendingPayments = await PartnerPaymentModel.countDocuments({
        partner: partnerId,
        status: 0,
      });

      // Get users joined this month
      const thisMonthStart = moment().startOf("month").toDate();
      const usersThisMonth = await PartnerUserModel.countDocuments({
        partner: partnerId,
        joinDate: { $gte: thisMonthStart },
      });

      return res.status(200).json({
        success: true,
        data: {
          credits: {
            userCredits: partner.userCredits,
            usedUserCredits: partner.usedUserCredits,
            availableUserCredits: partner.userCredits - partner.usedUserCredits,
            renewalCredits: partner.renewalCredits,
            usedRenewalCredits: partner.usedRenewalCredits,
            availableRenewalCredits:
              partner.renewalCredits - partner.usedRenewalCredits,
          },
          referral: {
            referralCode: partner.referralCode,
            referralUrl: partner.referralUrl,
            isActive: partner.isReferralActive,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            expired: expiredUsers,
            joinedThisMonth: usersThisMonth,
          },
          renewals: {
            total: totalRenewals.length > 0 ? totalRenewals[0].total : 0,
          },
          payments: {
            pending: pendingPayments,
          },
        },
      });
    } catch (error) {
      console.error("Get dashboard error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get List of Users Joined Through Partner
   */
  static GetMyUsers = async (req, res) => {
    try {
      const partnerId = req.partner._id;
      const { page = 1, limit = 20, status } = req.query;

      const skip = (page - 1) * limit;
      const query = { partner: partnerId };

      // Filter by membership status
      if (status === "active") {
        query.membershipExpiryDate = { $gte: new Date() };
      } else if (status === "expired") {
        query.membershipExpiryDate = { $lt: new Date() };
      }

      const totalAll = await PartnerUserModel.countDocuments(query);

      const users = await PartnerUserModel.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $match: { "user.0": { $exists: true } } },
        { $unwind: "$user" },
        { $sort: { joinDate: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);

      const totalPipeline = [
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $match: { "user.0": { $exists: true } } },
        { $count: "total" },
      ];

      const totalResult = await PartnerUserModel.aggregate(totalPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;
      const deletedCount = totalAll - total;

      // Format response
      const formattedUsers = users.map((pu) => {
        const userData = {
          id: pu._id,
          userId: pu.user._id,
          username: pu.user.username,
          name: pu.user.owner_name_english,
          tgid: pu.user.tgid,
          joinDate: pu.joinDate,
          membershipType:
            pu.user.membertype || pu.user.membershipType || "1234",
          isExpired: pu.membershipExpiryDate
            ? new Date(pu.membershipExpiryDate) < new Date()
            : true,
          daysUntilExpiry: pu.membershipExpiryDate
            ? Math.ceil(
                (new Date(pu.membershipExpiryDate) - new Date()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0,
          renewalCount: pu.renewalCount,
          lastRenewalDate: pu.lastRenewalDate,
          // Login tracking
          isFirstLogin: pu.isFirstLogin,
          firstLoginAt: pu.firstLoginAt,
          lastLoginAt: pu.lastLoginAt,
          loginCount: pu.loginCount,
        };

        // Only include membershipExpiryDate if it exists (for premium users)
        if (pu.membershipExpiryDate) {
          userData.membershipExpiryDate = pu.membershipExpiryDate;
        }

        return userData;
      });

      return res.status(200).json({
        success: true,
        data: {
          users: formattedUsers,
          pagination: {
            deletedUsers: deletedCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my users error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get Renewal Prices
   */
  static GetRenewalPrices = async (req, res) => {
    try {
      const prices = await PartnerRenewalPriceModel.find({ status: 1 }).sort({
        membershipMonths: 1,
      });

      return res.status(200).json({
        success: true,
        data: prices,
      });
    } catch (error) {
      console.error("Get renewal prices error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Renew User Membership
   */
  static RenewUserMembership = async (req, res) => {
    try {
      const { partnerUserId, months } = req.body;
      const partnerId = req.partner._id;

      const validator = new Validator(req.body, {
        partnerUserId: "required",
        months: "required|integer|min:1",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Find partner-user relationship
      const partnerUser = await PartnerUserModel.findOne({
        _id: partnerUserId,
        partner: partnerId,
      }).populate("user");

      if (!partnerUser) {
        return res.status(404).json({
          success: false,
          message: "User not found in your network",
        });
      }

      // Check if partner has renewal credits
      const partner = req.partner;
      const availableCredits =
        partner.renewalCredits - partner.usedRenewalCredits;

      if (availableCredits <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient renewal credits. Please purchase renewal credits.",
          requiresPayment: true,
        });
      }

      // Calculate new expiry date (always add 1 year)
      let newExpiryDate;
      const currentExpiry = partnerUser.membershipExpiryDate;
      const now = new Date();

      if (currentExpiry && new Date(currentExpiry) > now) {
        // Extend from current expiry
        newExpiryDate = moment(currentExpiry).add(12, "months").toDate();
      } else {
        // Start from now
        newExpiryDate = moment().add(12, "months").toDate();
      }

      // Update partner user
      partnerUser.membershipExpiryDate = newExpiryDate;
      partnerUser.membertype = "premium";
      partnerUser.enddate = newExpiryDate;
      partnerUser.usertype = 1;
      partnerUser.renewalCount += 1;
      partnerUser.lastRenewalDate = new Date();
      partnerUser.lastRenewalBy = "PARTNER";
      await partnerUser.save();

      // Update user membership
      const user = partnerUser.user;

      // Ensure freeUsername exists before upgrading
      if (!user.freeUsername) {
        let generatedUsername = crypto.randomBytes(4).toString("hex");
        let isUnique = false;
        while (!isUnique) {
          const conflict = await UserModel.findOne({
            freeUsername: generatedUsername,
          });
          if (!conflict) {
            isUnique = true;
          } else {
            generatedUsername = crypto.randomBytes(4).toString("hex");
          }
        }
        user.freeUsername = generatedUsername;
      }

      // Set startdate if not set
      const startDate = user.startdate || moment().format("YYYY-MM-DD");

      // Update user to premium with all fields as in admin approval
      user.usertype = 1;
      user.membertype = "premium";
      user.startdate = startDate;
      user.paymentstatus = 1;
      user.enddate = moment(newExpiryDate).format("YYYY-MM-DD");
      user.referralType = 0;
      user.paymentBy = 4; // 4 for Partner Renewal
      user.membershiperiod = "12"; // 12 months

      // Ensure username equals tgid for premium users (handle collisions)
      if (user.tgid) {
        let desiredUsername = user.tgid;
        const conflict = await UserModel.findOne({
          username: desiredUsername,
          _id: { $ne: user._id },
        });
        if (conflict) {
          desiredUsername =
            desiredUsername + "-" + crypto.randomBytes(2).toString("hex");
        }
        user.username = desiredUsername;
      }

      await user.save();

      // Deduct renewal credit from partner
      partner.usedRenewalCredits += 1;
      await partner.save();

      return res.status(200).json({
        success: true,
        message: `Membership renewed successfully for 12 months`,
        data: {
          userId: user._id,
          username: user.username,
          newExpiryDate,
          remainingCredits: partner.renewalCredits - partner.usedRenewalCredits,
          renewalCount: partnerUser.renewalCount,
        },
      });
    } catch (error) {
      console.error("Renew user membership error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Get Credits by Referral Code
   */
  static GetCredits = async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Referral code is required",
        });
      }

      // Find partner by referral code (case insensitive)
      const partner = await PartnerModel.findOne({
        referralCode: { $regex: new RegExp(`^${code}$`, "i") },
        status: 1,
      });

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          referralCode: partner.referralCode,
          userCredits: partner.userCredits,
          usedUserCredits: partner.usedUserCredits,
          availableUserCredits: partner.userCredits - partner.usedUserCredits,
          renewalCredits: partner.renewalCredits,
          usedRenewalCredits: partner.usedRenewalCredits,
          availableRenewalCredits:
            partner.renewalCredits - partner.usedRenewalCredits,
          isReferralActive: partner.isReferralActive,
        },
      });
    } catch (error) {
      console.error("Get credits error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get Single User Details
   */
  static GetUserDetails = async (req, res) => {
    try {
      const { partnerUserId } = req.params;
      const partnerId = req.partner._id;

      const partnerUser = await PartnerUserModel.findOne({
        _id: partnerUserId,
        partner: partnerId,
      }).populate(
        "user",
        "username owner_name_english owner_name_chinese tgid email contact",
      );

      if (!partnerUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isExpired = partnerUser.membershipExpiryDate
        ? new Date(partnerUser.membershipExpiryDate) < new Date()
        : true;

      const daysUntilExpiry = partnerUser.membershipExpiryDate
        ? Math.ceil(
            (new Date(partnerUser.membershipExpiryDate) - new Date()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          id: partnerUser._id,
          user: {
            id: partnerUser.user._id,
            username: partnerUser.user.username,
            nameEnglish: partnerUser.user.owner_name_english,
            nameChinese: partnerUser.user.owner_name_chinese,
            tgid: partnerUser.user.tgid,
            email: partnerUser.user.email,
            contact: partnerUser.user.contact,
          },
          joinDate: partnerUser.joinDate,
          membershipExpiryDate: partnerUser.membershipExpiryDate,
          isExpired,
          daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
          renewalCount: partnerUser.renewalCount,
          lastRenewalDate: partnerUser.lastRenewalDate,
          lastRenewalBy: partnerUser.lastRenewalBy,
          // Login tracking
          isFirstLogin: partnerUser.isFirstLogin,
          firstLoginAt: partnerUser.firstLoginAt,
          lastLoginAt: partnerUser.lastLoginAt,
          loginCount: partnerUser.loginCount,
        },
      });
    } catch (error) {
      console.error("Get user details error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };

  /**
   * Get Pending Transactions
   */
  static GetPendingTransactions = async (req, res) => {
    try {
      const partnerId = req.partner._id;

      const pendingPayments = await PartnerPaymentModel.find({
        partner: partnerId,
        status: 0,
      })
        .populate("package", "name type credits")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: {
          pendingTransactions: pendingPayments,
        },
      });
    } catch (error) {
      console.error("Get pending transactions error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
}

export default PartnerController;
