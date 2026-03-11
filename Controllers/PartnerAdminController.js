import { baseUrl } from "../Config.js";
import PartnerModel from "../Models/Partner.js";
import PartnerPackageModel from "../Models/PartnerPackage.js";
import PartnerPaymentModel from "../Models/PartnerPayment.js";
import PartnerUserModel from "../Models/PartnerUser.js";
import PartnerRenewalPriceModel from "../Models/PartnerRenewalPrice.js";
import moment from "moment";

class PartnerAdminController {
  static PartnerList = async (req, res) => {
    try {
      const partners = await PartnerModel.find({}).sort({ createdAt: -1 });
      // attach quick totals if available
      const enriched = await Promise.all(
        partners.map(async (p) => {
          const totalUsers = await PartnerUserModel.countDocuments({
            partner: p._id,
          });
          return {
            ...p.toObject(),
            totalUsers,
          };
        })
      );
      res.render("Partner/PartnerList", {
        baseUrl,
        partners: enriched,
        path: "partnerlist",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static PartnerView = async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      const partner = await PartnerModel.findById(id).lean();
      if (!partner) return res.status(404).send("Partner not found");

      const partnerUsers = (
        await PartnerUserModel.find({ partner: partner._id })
          .populate("user")
          .sort({ createdAt: -1 })
          .lean()
      ).filter((pu) => pu.user != null);

      const payments = await PartnerPaymentModel.find({ partner: partner._id })
        .populate("package")
        .populate("approvedBy")
        .sort({ createdAt: -1 })
        .lean();

      const stats = {
        totalUsers: partnerUsers.length,
        activeUsers: partnerUsers.filter(
          (u) => new Date(u.membershipExpiryDate) > new Date()
        ).length,
        totalRenewals: partnerUsers.reduce(
          (acc, u) => acc + (u.renewalCount || 0),
          0
        ),
        totalPayments: payments.length,
      };

      res.render("Partner/PartnerView", {
        baseUrl,
        partner,
        partnerUsers,
        payments,
        stats,
        path: "partnerview",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static PartnerReports = async (req, res) => {
    try {
      const partners = await PartnerModel.find({}).lean();
      const payments = await PartnerPaymentModel.find({})
        .populate("partner")
        .lean();
      const partnerUsers = await PartnerUserModel.find({})
        .populate("user")
        .lean();

      const stats = {
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.status === 1).length,
        totalUsers: partnerUsers.length,
        totalRevenue: payments
          .filter((p) => p.status === 1)
          .reduce((s, p) => s + (p.amount || 0), 0),
        approvedPayments: payments.filter((p) => p.status === 1).length,
        pendingPayments: payments.filter((p) => p.status === 0).length,
        totalUserCredits: partners.reduce(
          (s, p) => s + (p.userCredits || 0),
          0
        ),
        usedUserCredits: partners.reduce(
          (s, p) => s + (p.usedUserCredits || 0),
          0
        ),
        totalRenewalCredits: partners.reduce(
          (s, p) => s + (p.renewalCredits || 0),
          0
        ),
        usedRenewalCredits: partners.reduce(
          (s, p) => s + (p.usedRenewalCredits || 0),
          0
        ),
        totalRenewals: partnerUsers.reduce(
          (s, u) => s + (u.renewalCount || 0),
          0
        ),
        activeMemberships: partnerUsers.filter(
          (u) => new Date(u.membershipExpiryDate) > new Date()
        ).length,
      };

      // top partners by recruited users
      const partnerUserCounts = await PartnerUserModel.aggregate([
        { $group: { _id: "$partner", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      const topPartners = await Promise.all(
        partnerUserCounts.map(async (p, idx) => {
          const partner = await PartnerModel.findById(p._id).lean();
          return {
            ...(partner || {}),
            totalUsers: p.count,
            activeUsers: await PartnerUserModel.countDocuments({
              partner: p._id,
              membershipExpiryDate: { $gt: new Date() },
            }),
            totalRenewals: await PartnerUserModel.countDocuments({
              partner: p._1,
              renewalCount: { $gt: 0 },
            }).catch(() => 0),
            revenue: await PartnerPaymentModel.aggregate([
              { $match: { partner: p._id, status: 1 } },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
          };
        })
      );

      const recentActivity = payments.slice(0, 20).map((p) => ({
        date: p.createdAt,
        partnerName: p.partner?.username || p.partner?.tgid,
        type: "payment",
        details: `Payment ${p.transactionId}`,
        status: p.status === 1 ? "completed" : "pending",
      }));

      const packageSales = await PartnerPaymentModel.aggregate([
        { $match: { status: 1 } },
        {
          $group: {
            _id: "$package",
            count: { $sum: 1 },
            totalCredits: { $sum: "$credits" },
            revenue: { $sum: "$amount" },
          },
        },
      ]);

      // normalize revenue objects in topPartners
      const normalizedTop = topPartners.map((t) => ({
        ...t,
        revenue:
          Array.isArray(t.revenue) && t.revenue[0] ? t.revenue[0].total : 0,
      }));

      res.render("Partner/PartnerReports", {
        baseUrl,
        stats,
        topPartners: normalizedTop,
        recentActivity,
        packageSales: packageSales.map((p) => ({
          name: p._id?.name || "Unknown",
          type: p._id?.type || "USER_CREDITS",
          salesCount: p.count,
          totalCredits: p.totalCredits,
          revenue: p.revenue,
        })),
        // promote this view to act as the admin dashboard
        path: "dashboard",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };
  static DeletePartner = async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      const partner = await PartnerModel.findById(id);
      if (!partner) return res.status(404).send("Partner not found");

      // Delete associated partner users
      await PartnerUserModel.deleteMany({ partner: partner._id });

      // Delete associated payments
      await PartnerPaymentModel.deleteMany({ partner: partner._id });

      // Finally, delete the partner
      await partner.remove();

      res.redirect(baseUrl + "admin/partner/list");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static PackageActivate = async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      const pkg = await PartnerPackageModel.findById(id);
      if (!pkg)
        return res
          .status(404)
          .json({ success: false, message: "Package not found" });

      pkg.status = 1;
      await pkg.save();

      return res.status(200).json({
        success: true,
        message: "Package activated",
        Url: `${baseUrl}admin/package/list`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static PackageDeactivate = async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      const pkg = await PartnerPackageModel.findById(id);
      if (!pkg)
        return res
          .status(404)
          .json({ success: false, message: "Package not found" });

      pkg.status = 0;
      await pkg.save();

      return res.status(200).json({
        success: true,
        message: "Package deactivated",
        Url: `${baseUrl}admin/package/list`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static PackageDelete = async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      const pkg = await PartnerPackageModel.findById(id);
      if (!pkg)
        return res
          .status(404)
          .json({ success: false, message: "Package not found" });

      // Optionally: remove related partner payments if desired.
      // await PartnerPaymentModel.deleteMany({ package: pkg._id });

      await pkg.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Package deleted",
        Url: `${baseUrl}admin/package/list`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  static PackageList = async (req, res) => {
    try {
      // Ensure USER_CREDITS packages appear first by default; still sort newest first within type
      const packages = await PartnerPackageModel.aggregate([
        {
          $addFields: {
            sortOrder: { $cond: [{ $eq: ["$type", "USER_CREDITS"] }, 0, 1] },
          },
        },
        { $sort: { sortOrder: 1, createdAt: -1 } },
        { $project: { sortOrder: 0 } },
      ]);
      res.render("PartnerPackage/PackageList", {
        baseUrl,
        packages,
        path: "packagelist",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static PackageCreate = async (req, res) => {
    res.render("PartnerPackage/PackageCreate", {
      baseUrl,
      path: "packagelist",
      session: req.session,
      moment,
      loginUser: req.user,
    });
  };

  static PackageCreatePost = async (req, res) => {
    try {
      const { name, type, credits, price, status, renewalYears } = req.body;

      // store price as-is

      const packageData = {
        name,
        type,
        credits: parseInt(credits),
        price: parseFloat(price),
        // finalPrice removed
        status: parseInt(status),
      };

      // Add renewalYears if type is RENEWAL_CREDITS
      if (type === "RENEWAL_CREDITS") {
        // default to 1 when not provided
        packageData.renewalYears = renewalYears ? parseInt(renewalYears) : 1;
      }

      await PartnerPackageModel.create(packageData);

      return res.status(200).json({
        success: true,
        message: "Package created successfully",
      });
    } catch (err) {
      console.error("Package create error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static PackageEdit = async (req, res) => {
    try {
      const pkg = await PartnerPackageModel.findById(req.params.id).lean();
      if (!pkg) return res.status(404).send("Package not found");
      res.render("PartnerPackage/PackageEdit", {
        baseUrl,
        package: pkg,
        path: "packagelist",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static PackageEditPost = async (req, res) => {
    try {
      // id may be passed in req.params (URL /package/edit/:id) or in req.body
      const id = req.params.id || req.body.id;
      const { name, type, credits, price, status, renewalYears } = req.body;

      const pkg = await PartnerPackageModel.findById(id);
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Validate inputs
      if (!name || !type) {
        return res
          .status(400)
          .json({ success: false, message: "name and type are required" });
      }

      const parsedCredits = parseInt(credits);
      const parsedPrice = parseFloat(price);
      if (Number.isNaN(parsedCredits) || parsedCredits < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Valid credits are required" });
      }
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Valid price is required" });
      }

      pkg.name = name;
      pkg.type = type;
      pkg.credits = parsedCredits;
      pkg.price = parsedPrice;
      // finalPrice removed
      pkg.status = parseInt(status);

      // Update renewalYears if type is RENEWAL_CREDITS; default to 1 if not supplied
      if (type === "RENEWAL_CREDITS") {
        pkg.renewalYears = renewalYears ? parseInt(renewalYears) : 1;
      } else {
        pkg.renewalYears = undefined;
      }

      await pkg.save();

      return res.status(200).json({
        success: true,
        message: "Package updated successfully",
      });
    } catch (err) {
      console.error("Package edit error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static PaymentList = async (req, res) => {
    try {
      const payments = await PartnerPaymentModel.find({})
        .populate("partner")
        .populate("package")
        .sort({ createdAt: -1 })
        .lean();
      const pendingCount = payments.filter((p) => p.status === 0).length;
      const approvedCount = payments.filter((p) => p.status === 1).length;
      const rejectedCount = payments.filter((p) => p.status === 2).length;
      res.render("PartnerPayment/PaymentList", {
        baseUrl,
        payments,
        pendingCount,
        approvedCount,
        rejectedCount,
        path: "partnerpaymentslist",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static RenewalPriceList = async (req, res) => {
    try {
      const renewalPrices = await PartnerRenewalPriceModel.find({})
        .sort({ membershipMonths: 1 })
        .lean();
      res.render("RenewalPrice/RenewalPriceList", {
        baseUrl,
        renewalPrices,
        path: "renewalpricelist",
        session: req.session,
        moment,
        loginUser: req.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  };

  static RenewalPriceCreatePost = async (req, res) => {
    try {
      const { membershipMonths, creditCost, description, status } = req.body;

      await PartnerRenewalPriceModel.create({
        membershipMonths: parseInt(membershipMonths),
        creditCost: parseInt(creditCost),
        description: description || "",
        status: parseInt(status),
      });

      return res.status(200).json({
        success: true,
        message: "Renewal price created successfully",
      });
    } catch (err) {
      console.error("Renewal price create error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static RenewalPriceEditPost = async (req, res) => {
    try {
      const { id, membershipMonths, creditCost, description, status } =
        req.body;

      const renewalPrice = await PartnerRenewalPriceModel.findById(id);
      if (!renewalPrice) {
        return res.status(404).json({
          success: false,
          message: "Renewal price not found",
        });
      }

      renewalPrice.membershipMonths = parseInt(membershipMonths);
      renewalPrice.creditCost = parseInt(creditCost);
      renewalPrice.description = description || "";
      renewalPrice.status = parseInt(status);

      await renewalPrice.save();

      return res.status(200).json({
        success: true,
        message: "Renewal price updated successfully",
      });
    } catch (err) {
      console.error("Renewal price edit error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static ApprovePayment = async (req, res) => {
    try {
      const paymentId = req.body.paymentId || req.body.id || req.query.id;
      const adminId = req.user && req.user._id;

      if (!paymentId) {
        return res
          .status(400)
          .json({ success: false, message: "paymentId is required" });
      }

      const payment = await PartnerPaymentModel.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (payment.status !== 0) {
        return res.status(400).json({
          success: false,
          message: "Payment already processed",
        });
      }

      // Update payment status
      payment.status = 1;
      payment.paymentStatus = 1;
      if (adminId) payment.approvedBy = adminId;
      payment.approvedAt = new Date();
      await payment.save();

      // Add credits to partner
      const partner = await PartnerModel.findById(payment.partner);
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: "Partner not found",
        });
      }

      if (payment.packageType === "USER_CREDITS") {
        partner.userCredits += payment.credits;
      } else if (payment.packageType === "RENEWAL_CREDITS") {
        partner.renewalCredits += payment.credits;
      }

      // Activate referral if not already active and has credits
      if (
        !partner.isReferralActive &&
        (partner.userCredits > 0 || partner.renewalCredits > 0)
      ) {
        partner.isReferralActive = true;
      }

      await partner.save();

      return res.status(200).json({
        success: true,
        message: "Payment approved and credits added successfully",
      });
    } catch (err) {
      console.error("Approve payment error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static RejectPayment = async (req, res) => {
    try {
      const paymentId = req.body.paymentId || req.body.id || req.query.id;
      const reason = req.body.reason || req.query.reason || "";

      if (!paymentId) {
        return res
          .status(400)
          .json({ success: false, message: "paymentId is required" });
      }

      const payment = await PartnerPaymentModel.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (payment.status !== 0) {
        return res.status(400).json({
          success: false,
          message: "Payment already processed",
        });
      }

      // Update payment status
      payment.status = 2;
      payment.paymentStatus = 2;
      payment.rejectionReason = reason || "";
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Payment rejected",
      });
    } catch (err) {
      console.error("Reject payment error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  static AdminAddCredit = async (req, res) => {
    try {
      const { partnerId, packageType, credits } = req.body;
      const adminId = req.user && req.user._id;

      if (!partnerId || !packageType || !credits) {
        return res.status(400).json({
          success: false,
          message: "partnerId, packageType, and credits are required",
        });
      }

      if (!["USER_CREDITS", "RENEWAL_CREDITS"].includes(packageType)) {
        return res.status(400).json({
          success: false,
          message: "packageType must be USER_CREDITS or RENEWAL_CREDITS",
        });
      }

      const creditsNum = parseInt(credits);
      if (isNaN(creditsNum) || creditsNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "credits must be a positive number",
        });
      }

      const partner = await PartnerModel.findById(partnerId);
      if (!partner) {
        return res.status(404).json({ success: false, message: "Partner not found" });
      }

      // Find or create a system-level "Admin Grant" package for this type
      // so all existing templates that access v.package.name continue to work
      const packageLabel =
        packageType === "USER_CREDITS" ? "Admin Grant (Premium)" : "Admin Grant (Renewal)";
      let systemPackage = await PartnerPackageModel.findOne({
        name: packageLabel,
        type: packageType,
        price: 0,
      });
      if (!systemPackage) {
        systemPackage = await PartnerPackageModel.create({
          name: packageLabel,
          type: packageType,
          credits: 0,
          price: 0,
          renewalYears: 1,
          status: 1,
        });
      }

      const transactionId = `ADMIN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      await PartnerPaymentModel.create({
        partner: partner._id,
        package: systemPackage._id,
        packageType,
        amount: 0,
        credits: creditsNum,
        transactionId,
        walletAddress: "ADMIN_GRANT",
        status: 1,
        paymentStatus: 1,
        approvedBy: adminId,
        approvedAt: new Date(),
        paymentDate: new Date(),
      });

      if (packageType === "USER_CREDITS") {
        partner.userCredits += creditsNum;
      } else {
        partner.renewalCredits += creditsNum;
      }

      if (!partner.isReferralActive && (partner.userCredits > 0 || partner.renewalCredits > 0)) {
        partner.isReferralActive = true;
      }

      await partner.save();

      return res.status(200).json({
        success: true,
        message: `${creditsNum} ${packageType === "USER_CREDITS" ? "premium" : "renewal"} credits added successfully`,
      });
    } catch (err) {
      console.error("AdminAddCredit error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };
}

export default PartnerAdminController;
