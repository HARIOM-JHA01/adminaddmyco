import axios from "axios";
import crypto from "crypto";
import UserModel from "../Models/User.js";
import MembershipModel from "../Models/Membership.js";
import TelegramCoinMembershipPaymentModel from "../Models/TelegramCoinMembershipPayment.js";
import USDTMembershipPaymentModel from "../Models/USDTMembershipPayment.js";
import moment from "moment";
import MembershipStrpiePaymentModel from "../Models/MembershipStripePayment.js";
import PurchaseMembershipModel from "../Models/PuschaseMembership.js";

class PaymentController {
  static async TelegramPayment(req, res) {
    try {
      const { membershiperiod, telegramcoin } = req.body;
      const userId = req.user.id;

      if (!membershiperiod) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid membership period" });
      }
      if (!telegramcoin) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Telegram coin amount" });
      }

      if (telegramcoin <= 0) {
        return res.status(400).json({
          success: false,
          message: "Telegram coin must be greater than zero",
        });
      }

      // Prepare invoice parameters
      const payload = `${userId}:${Date.now()}:${membershiperiod}`;
      const invoiceParams = {
        title: "Membership Renewal",
        description: `Renew your membership for ${membershiperiod} month(s)`,
        payload,
        currency: "XTR", // Telegram Stars
        prices: JSON.stringify([{ label: "Membership", amount: telegramcoin }]),
      };

      // Call Telegram Bot API
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
      const tgRes = await axios.post(url, invoiceParams);
      if (tgRes.data.ok) {
        return res.json({ success: true, invoice_link: tgRes.data.result });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Failed to create invoice" });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async USDTPayment(req, res) {
    try {
      const { membershipId, usdt, transactionId, walletAddress } = req.body;
      const userId = req.user.id;

      if (!membershipId) {
        return res
          .status(400)
          .json({ success: false, message: "Membership ID is required" });
      }
      if (!usdt || usdt <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid USDT amount" });
      }
      if (!transactionId) {
        return res
          .status(400)
          .json({ success: false, message: "Transaction ID is required" });
      }
      if (!walletAddress) {
        return res
          .status(400)
          .json({ success: false, message: "Wallet address is required" });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Find membership plan
      const membership = await MembershipModel.findById(membershipId);
      if (!membership) {
        return res
          .status(404)
          .json({ success: false, message: "Membership plan not found" });
      }

      // Create pending payment record (not approved yet)
      const paymentRecord = new USDTMembershipPaymentModel({
        user: userId,
        telegram_id: user.tgid,
        membership_id: membershipId,
        amount: usdt,
        transactionId: transactionId,
        walletAddress: walletAddress,
        status: 0, // pending approval
        paymentstatus: 0, // pending
        date: moment().format("YYYY-MM-DD"),
      });
      await paymentRecord.save();

      return res.json({
        success: true,
        message:
          "USDT payment submitted successfully. Waiting for admin approval.",
        paymentId: paymentRecord._id,
      });
    } catch (err) {
      console.error("USDT payment error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async CompleteTelegramCoinPayment(req, res) {
    try {
      const { membershipId, telegramcoin, paymentDetails } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!membershipId) {
        return res
          .status(400)
          .json({ success: false, message: "Membership ID is required" });
      }
      if (!telegramcoin || telegramcoin <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Telegram coin amount" });
      }

      // Find user
      const user = await UserModel.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Find membership plan
      const membership = await MembershipModel.findById(membershipId);
      if (!membership) {
        return res
          .status(404)
          .json({ success: false, message: "Membership plan not found" });
      }

      // Calculate new membership period
      const membershipPeriodYears = membership.membershiperiod || 1;
      const currentDate = moment();
      let startDate, endDate;

      if (user.enddate && moment(user.enddate).isAfter(currentDate)) {
        // User has active membership, extend it
        startDate = user.startdate || currentDate.format("YYYY-MM-DD");
        endDate = moment(user.enddate)
          .add(membershipPeriodYears, "years")
          .format("YYYY-MM-DD");
      } else {
        // New membership or expired
        startDate = currentDate.format("YYYY-MM-DD");
        endDate = currentDate
          .add(membershipPeriodYears, "years")
          .format("YYYY-MM-DD");
      }

      // Update user to premium
      user.usertype = 1;
      user.membertype = "premium";
      user.paymentstatus = 1;
      user.paymentBy = 1; // 1 for Telegram Coin
      user.startdate = startDate;
      user.enddate = endDate;
      user.membershiperiod = membershipPeriodYears.toString();
      // Ensure username equals tgid for premium users (handle collisions)
      try {
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
      } catch (e) {
        console.error("Username collision check error:", e);
      }
      await user.save();

      // Create payment record
      const paymentRecord = new TelegramCoinMembershipPaymentModel({
        user: userId,
        telegram_id: user.tgid,
        membership_id: membershipId,
        amount: telegramcoin,
        date: currentDate.format("YYYY-MM-DD"),
      });
      await paymentRecord.save();

      return res.json({
        success: true,
        message: "Payment completed and membership upgraded successfully",
        user: {
          id: user._id,
          username: user.username,
          usertype: user.usertype,
          membertype: user.membertype,
          startdate: user.startdate,
          enddate: user.enddate,
        },
      });
    } catch (err) {
      console.error("Telegram Coin payment completion error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // GET /membership/history - returns combined membership history for authenticated user
  static async MembershipHistory(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      // Helper to normalize records
      const normalize = (record, source) => {
        return {
          id: record._id,
          source,
          membership_id: record.membership_id || null,
          amount: record.amount || null,
          transactionId: record.transactionId || record.transaction || null,
          status: typeof record.status !== "undefined" ? record.status : null,
          date:
            record.date ||
            (record.createdAt
              ? moment(record.createdAt).format("DD-MM-YYYY")
              : null),
        };
      };

      const results = [];

      // Fetch all types without filtering by type
      const stripe = await MembershipStrpiePaymentModel.find({
        user: userId,
      });
      stripe.forEach((s) => results.push(normalize(s, "stripe")));
      const usdt = await USDTMembershipPaymentModel.find({
        user: userId,
      });
      usdt.forEach((u) => results.push(normalize(u, "usdt")));
      const tg = await TelegramCoinMembershipPaymentModel.find({
        user: userId,
      });
      tg.forEach((t) => results.push(normalize(t, "telegram")));
      const purchases = await PurchaseMembershipModel.find({});
      purchases.forEach((p) => results.push(normalize(p, "purchase")));
      // Sort combined results by date desc (attempting to parse DD-MM-YYYY or YYYY-MM-DD)
      results.sort((a, b) => {
        const da = a.date
          ? moment(a.date, ["DD-MM-YYYY", "YYYY-MM-DD"])
          : moment(0);
        const db = b.date
          ? moment(b.date, ["DD-MM-YYYY", "YYYY-MM-DD"])
          : moment(0);
        return db.valueOf() - da.valueOf();
      });

      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error("MembershipHistory error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default PaymentController;
