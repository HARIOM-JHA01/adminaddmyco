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
      const id = req.params.id;
      const partner = await PartnerModel.findById(id).lean();
      if (!partner) return res.status(404).send("Partner not found");

      const partnerUsers = await PartnerUserModel.find({ partner: partner._id })
        .populate("user")
        .sort({ createdAt: -1 })
        .lean();

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
        partnerName: p.partner?.name || p.partner?.tgid,
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

  static PackageList = async (req, res) => {
    try {
      const packages = await PartnerPackageModel.find({})
        .sort({ createdAt: -1 })
        .lean();
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
}

export default PartnerAdminController;
