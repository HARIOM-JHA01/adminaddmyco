import "dotenv/config";
import { view, baseUrl, assetsUrl } from "../Config.js";
import { assets } from "../Common.js";
import UserModel from "../Models/User.js"
import AdminModel from "../Models/Admin.js";
import MembershipModel from "../Models/Membership.js";
import PaymentConfigurationModel from "../Models/PaymentConfiguration.js";
import ReferralMembershipModel from "../Models/ReferralMembership.js";
import ReferralMembershipStipePayment from "../Models/ReferralMembershipStipePayment.js";
import AdminNotificationModel from "../Models/AdminNotification.js";
import MembershipStrpiePaymentModel from "../Models/MembershipStripePayment.js";
import BannerModel from "../Models/Banner.js"
import SystemModel from "../Models/Systemimage.js"
import FolderModel from "../Models/Folder.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import CategoryModel from "../Models/Category.js";
import LogoModel from "../Models/Logo.js";
import RoleModel from "../Models/Role.js";
import ReferralReportModel from "../Models/ReferralReport.js";
import moment from "moment";

class DashboardController {
  static home = async (req, res) => {
    let user = await UserModel.find({}).countDocuments();
    res.render('Dashboard/Dashboard', { baseUrl, session: req.session, user: user, loginUser: req.user, assetsUrl: assets(assetsUrl), path: 'dashboard' });
  }

  static signIn = async (req, res) => {
    res.render('Admin/Login', { baseUrl, data: {}, path: 'Login' });
  }

  static signUp = async (req, res) => {
    res.render('Admin/Register', { baseUrl, data: {}, path: 'Register' });
  }

  static ForgotPassword = async (req, res) => {
    res.render('Admin/ForgotPassword', { baseUrl, data: {}, path: 'ForgotPassword' });
  }

  static ResetPassword = async (req, res) => {
    res.render('Admin/ChangePasswords', { baseUrl, data: {}, path: 'ChangePasswords' });
  }

  static ChangePassword = async (req, res) => {
    res.render('Admin/ChangePassword', { baseUrl, data: {}, path: 'ChangePassword' });
  }
  
  static MyAccount = async (req, res) => {
    let myaccount = await UserModel.find({})
    res.render('Admin/MyAccount', { baseUrl, data: {}, path: 'myaccount', myaccount: myaccount, session: req.session });
  }

  // ...............................USERS............................
  static FreeUser = async (req, res) => {
    let freeuser = await UserModel.find({ usertype: 0 }).sort({ _id: -1 });
    let country1 = await UserModel.aggregate([
      {
        $match: {
          $and: [{ usertype: 0 }]
        }
      },
      {
        $group: {
          _id: { country: "$country" }
        }
      },
    ]);

    res.render('User/FreeUser', { baseUrl, freeuser: freeuser, country1: country1, path: 'freeuser', session: req.session, moment: moment, loginUser: req.user });
  }

  static PremiumUser = async (req, res) => {
    let premium = await UserModel.aggregate([
      {
        "$lookup": {
          "from": "toncoins",
          "localField": "_id",
          "foreignField": "user_id",
          "as": "userDoc"
        }
      },
      {
        $match: {
          $and: [{ usertype: 1 }]
        }
      },
    ]).sort({ startdate: -1 })

    const list = await UserModel.find({})
    const _list = list.map(async e => {
      const tenure = await ReferralReportModel.findOne({ freemember_tgid: { $eq: e.tgid } })
      return {
        ...e,
        membershipPeriod: tenure?.membership_period
      }
    })
    let country = await UserModel.aggregate([
      {
        $group: {
          _id: { country: "$country" }
        }
      }
    ]);
    Promise.all(_list).then(result => {
      res.render('User/Premium', { baseUrl, premium: premium, path: 'premium', session: req.session, moment: moment, country: country, result: result, loginUser: req.user });
    })

  }

  static DonatedUser = async (req, res) => {
    let donateduser = await UserModel.find({ usertype: 2 }).sort({ _id: -1 });
    let country1 = await UserModel.aggregate([
      {
        $match: {
          $and: [{ usertype: 0 }]
        }
      },
      {
        $group: {
          _id: { country: "$country" }
        }
      }
    ]);
    res.render('User/Donated', { baseUrl, donateduser: donateduser, country1: country1, path: 'donateduser', session: req.session, moment: moment, loginUser: req.user });
  }

  // ....................MEBERSHIP[CONFIGURATION]......................
  static MembershipTenure = async (req, res) => {
    let membership = await MembershipModel.find({}).sort({ _id: -1 });
    res.render('Configuration/Membership', { baseUrl, membership: membership, path: 'membership', session: req.session, loginUser: req.user });
  }

  static AddMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.find({}).sort({ _id: -1 });
    res.render('Configuration/Addmembership', { baseUrl, membership: membership, path: 'membership', loginUser: req.user });
  }

  static EditMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.findById(req.query.id);
    res.render('Configuration/Editmembership', { baseUrl, membership: membership, path: 'membership', loginUser: req.user });
  }

  // ....................SYSTEMIMAGE[CONFIGURATION]........................

  static SystemImages = async (req, res) => {
    let system = await SystemModel.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: 'categoryname',
          foreignField: '_id',
          as: "category"
        }
      }
    ]).sort({ _id: -1 });
    system = await system.map((e) => {
      let a = JSON.parse(JSON.stringify(e))
      a['Thumbnail'] = a.Thumbnail.split(",");
      a['categoryname'] = a.category.categoryname;
      return a;
    });
    res.render('Configuration/Systemimage', { baseUrl, data: {}, system: system, path: 'system', session: req.session, loginUser: req.user });
  }

  static AddsystemImages = async (req, res) => {
    let system = await SystemModel.find({}).sort({ _id: -1 });
    let categories = await CategoryModel.find({});
    res.render('Configuration/Addsystemimage', { baseUrl, data: {}, system: system, path: 'system', categories: categories, loginUser: req.user });
  }

  static EditsystemImages = async (req, res) => {
    let categories = await CategoryModel.find({});
    let system = await SystemModel.findById(req.query.id);
    let a = JSON.parse(JSON.stringify(system))
    a['Thumbnail'] = system.Thumbnail.split(",");
    res.render('Configuration/Editsystemimage', { baseUrl, system: a, path: 'system', categories: categories, loginUser: req.user });
  }

  // ...................FOLDERS[CONFIGURATION].........................
  static Folder = async (req, res) => {
    let folder = await FolderModel.find({ "user_id": null }).sort({ _id: -1 });
    res.render('Configuration/Folder', { baseUrl, folder: folder, path: "folder", session: req.session, loginUser: req.user })
  }

  static AddFolder = async (req, res) => {
    let folder = await FolderModel.find({});
    res.render('Configuration/Addfolder', { baseUrl, folder: folder, path: "folder", loginUser: req.user })
  }

  static EditFolder = async (req, res) => {
    let folder = await FolderModel.findById(req.query.id)
    res.render('Configuration/Editfolder', { baseUrl, folder: folder, path: "folder", loginUser: req.user })
  }

  // ..........................BANNERS.................................
  static Banner = async (req, res) => {
    let banner = await BannerModel.find({}).sort({ _id: -1 })
    res.render('Banner/Banner', { baseUrl, data: {}, banner: banner, path: 'banner', session: req.session, loginUser: req.user });
  }

  static AddBanner = async (req, res) => {
    let banner = await BannerModel.find({});
    res.render('Banner/AddBanner', { baseUrl, data: {}, banner: banner, path: 'banner', loginUser: req.user, loginUser: req.user });
  }

  static EditBanner = async (req, res) => {
    let banner = await BannerModel.findById(req.query.id);
    res.render('Banner/EditBanner', { baseUrl, banner: banner, path: 'banner', loginUser: req.user });
  }

  static Viewbanner = async (req, res) => {
    let banner = await BannerModel.findById(req.query.id);
    res.render("Banner/ViewBanner", { baseUrl, banner: banner, path: "banner", loginUser: req.user })
  }

  // .......................PAYMENT[PAYPAL].............................
  static Paypal = async (req, res) => {
    let toncoin = await ToncoinModel.aggregate([
      {
        "$lookup": {
          "from": "users",
          "localField": "user_id",
          "foreignField": "_id",
          "as": "userDoc"
        }
      }
    ]).sort({ _id: -1 })
    res.render('MemberPayment/Paypal', { baseUrl, toncoin: toncoin, path: 'paypal', session: req.session, moment: moment, loginUser: req.user });
  }

  // .......................PAYMENT[TANCOIN].............................
  static Toncoin = async (req, res) => {
    let toncoin = await ToncoinModel.aggregate([
      {
        "$lookup": {
          "from": "users",
          "localField": "user_id",
          "foreignField": "_id",
          "as": "userDoc"
        }
      }
    ]).sort({ _id: -1 })
    res.render('MemberPayment/Toncoin', { baseUrl, toncoin: toncoin, path: 'toncoin', session: req.session, moment: moment });
  }

  // .......................REFERRAL.............................

  static Referral = async (req, res) => {
    let referral = await UserModel.aggregate([
      {
        "$lookup": {
          "from": "referral",
          "localField": "_id",
          "foreignField": "user_id",
          "as": "userDoc"
        }
      },
      {
        $match: {
          $and: [{ isReferral: 1 }]
        }
      },
    ]).sort({ _id: -1 })

    let country = await UserModel.aggregate([
      {
        $group: {
          _id: { country: "$country" }
        }
      }
    ]);

    res.render('Referral/Referral', { baseUrl, data: {}, referral: referral, path: 'referral', session: req.session, country: country, loginUser: req.user });
  }

  static UpdateReferral = async (req, res) => {
    let data = req.body;
    if (data.type == 'refstatue') {
      let data1 = await UserModel.findByIdAndUpdate(req.params.id, { refstatue: Number(data.status) });
    } else {
      let data1 = await UserModel.findByIdAndUpdate(req.params.id, { refimgstatue: Number(data.status) });
    }

    return res.status(200).json({
      success: true,
      data: data,
      message: "status update Successfully.."
    })

  }

  // ..........................LOGO.................................
  static Logo = async (req, res) => {
    let logo = await LogoModel.findOne().sort({ _id: -1 })
    res.render('Configuration/Logo', { baseUrl, data: {}, logo: logo, path: 'logo', session: req.session, loginUser: req.user });
  }

  static AddLogo = async (req, res) => {
    let logo = await LogoModel.find({});
    res.render('Configuration/Addlogo', { baseUrl, data: {}, logo: logo, path: 'logo', loginUser: req.user });
  }

  static EditLogo = async (req, res) => {
    let logo = await LogoModel.findById(req.query.id);
    res.render('Configuration/EditLogo', { baseUrl, logo: logo, path: 'logo', loginUser: req.user });
  }

  // ....................REFERRALMEBERSHIP[CONFIGURATION]......................
  static ReferralMembershipTenure = async (req, res) => {
    let referralmembership = await ReferralMembershipModel.find({}).sort({ _id: -1 });
    res.render('Referral/Referralmembership', { baseUrl, referralmembership: referralmembership, path: 'referralmembership', session: req.session, loginUser: req.user });
  }

  static AddReferralMembershipTenure = async (req, res) => {
    let referralmembership = await ReferralMembershipModel.find({}).sort({ _id: -1 });
    res.render('Referral/Addreferralmembership', { baseUrl, referralmembership: referralmembership, path: 'referralmembership', loginUser: req.user });
  }

  static EditReferralMembershipTenure = async (req, res) => {
    let referralmembership = await ReferralMembershipModel.findById(req.query.id);
    res.render('Referral/Editreferralmembership', { baseUrl, referralmembership: referralmembership, path: 'referralmembership', loginUser: req.user });
  }

  // ..........................REFERRAL-DETAIL.................................
  static ReferralDetail = async (req, res) => {
    let referraldetail = await ReferralReportModel.find({ referral_user_id: req.params.id }).sort({ _id: -1 })
    res.render(`Referral/Referraldetail`, { baseUrl, referraldetail: referraldetail, path: 'referraldetail', session: req.session, loginUser: req.user });
  }

  static ReferralReport = async (req, res) => {
    let referralreport = await ReferralReportModel.find({}).distinct("referral_user_id")
    let referral = referralreport.map(async e => {
      const list = await UserModel.findById(e)
      const memberlist = await ReferralReportModel.find({
        referral_user_id: e
      })

      return {
        id: e,
        tgid: list?.tgid,
        country: list?.country,
        refstatue: list?.refstatue == 1 ? 'Active' : 'Deactive',
        totalRef: memberlist.length
      }
    })

    Promise.all(referral).then(resp => {
      res.render('Referral/Referralreport', { baseUrl, referral: resp, path: 'referralreport', session: req.session, loginUser: req.user });
    })
  }

  // ..........................STRIPE.................................
  static Stripe = async (req, res) => {
    let stripe = await ReferralMembershipStipePayment.find({}).sort({ _id: -1 });
    let list = stripe.map(async (e) => {
      let member = await UserModel.findById(e.user);
      let membership = await ReferralMembershipModel.findById(e.membership);
      return {
        id: e._id,
        referral_tgid: e.referral_tgid,
        member_tgid: member.tgid,
        tenure: membership.membershiperiod,
        price: membership.price,
        date: moment(e.date).format("DD-MM-yyyy")
      }
    })
    Promise.all(list).then(result => {
      const data = result.map(e => {
        return {
          id: e.id,
          referral_tgid: e.referral_tgid,
          member_tgid: e.member_tgid,
          tenure: e.tenure,
          price: e.price,
          date: e.date,
        }
      })
      res.render('Referral/Stripe', { baseUrl, data: {}, path: 'stripe', data: data, session: req.session, loginUser: req.user });
    })
  }

  // ..........................NOTIFICATION.................................
  static AdminNotification = async (req, res) => {
    let notification = await AdminNotificationModel.find({}).sort({ _id: -1 })
    await AdminNotificationModel.updateMany({ "status": 0 }, { $set: { "status": 1 } })
    res.render('Referral/Notification', { baseUrl, data: {}, notification: notification, path: 'notification', session: req.session, moment: moment, loginUser: req.user });
  }

  static CreateAdmin = async (req, res) => {
    let createadmin = await AdminModel.find({});
    res.render('MasterAdmin/Createadmin', { baseUrl, data: {}, createadmin: createadmin, path: 'createadmin', session: req.session });
  }

  static Role = async (req, res) => {
    let role = await RoleModel.find({});
    res.render('Role/Role', { baseUrl, data: {}, role: role, path: 'role', session: req.session });
  }

  static AddRole = async (req, res) => {
    let addrole = await RoleModel.find({});
    res.render('Role/Role', { baseUrl, data: {}, addrole: addrole, path: 'addrole', session: req.session });
  }

  static PaymentConfiguration = async (req, res) => {
    let paymentconfiguration = await PaymentConfigurationModel.find({});
    res.render('Configuration/PaymentConfiguration', { baseUrl, paymentconfiguration: paymentconfiguration, path: 'paymentconfiguration', session: req.session });
  }

  static AddPaymentConfiguration = async (req, res) => {
    let addpaymentconfiguration = await PaymentConfigurationModel.find({});
    res.render('Configuration/AddPaymentConfiguration', { baseUrl, addpaymentconfiguration: addpaymentconfiguration, path: 'addpaymentconfiguration', session: req.session });
  }

  static EditPaymentConfiguration = async (req, res) => {
    let paymentconfiguration = await PaymentConfigurationModel.find({});
    res.render('Configuration/EditPaymentConfiguration', { baseUrl, paymentconfiguration: paymentconfiguration, path: 'paymentconfiguration', session: req.session });
  }

  static MembershipStripePayment = async (req, res) => {
    let membershipstripe = await MembershipStrpiePaymentModel.find({}).sort({ createdAt: -1 });
    let list = membershipstripe.map(async (e) => {
      let userdetail = await UserModel.findById(e.user);
      let membership = await MembershipModel.findById(e.membership_id);
      return {
        _id: e._id,
        user: e.user,
        telegram_id: e.telegram_id,
        membership_id: e.membership_id,
        member_id: userdetail.memberid,
        username: userdetail.username,
        tenure: membership.membershiperiod,
        amount: membership.paypal,
        date: e.date
       
      }
    })
    Promise.all(list).then(result => {
      res.render('MemberPayment/MembershipStripePayment', { baseUrl, data: {}, membershipstripe: result, path: 'membershipstripe', session: req.session });
    })

  }

}

export default DashboardController;