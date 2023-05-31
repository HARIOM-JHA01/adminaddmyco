import "dotenv/config";
import { view, baseUrl, assetsUrl } from "../Config.js";
import { assets } from "../Common.js";
import UserModel from "../Models/User.js"
import MembershipModel from "../Models/Membership.js";
import BannerModel from "../Models/Banner.js"
import SystemModel from "../Models/Systemimage.js"
import FolderModel from "../Models/Folder.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import CategoryModel from "../Models/Category.js";
import LogoModel from "../Models/Logo.js";
import moment from "moment";

class DashboardController {
  static home = async (req, res) => {
    console.log("dash ", req.session)
    let user = await UserModel.find({}).countDocuments();
    res.render('Dashboard/Dashboard', { baseUrl, session: req.session, user: user, assetsUrl: assets(assetsUrl), path: 'dashboard' });
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

    res.render('User/FreeUser', { baseUrl, freeuser: freeuser, country1: country1, path: 'freeuser', session: req.session, moment: moment });
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
    ]).sort({ _id: -1 })

    let country = await UserModel.aggregate([
      {
        $group: {
          _id: { country: "$country" }
        }
      }
    ]);
    res.render('User/Premium', { baseUrl, premium: premium, path: 'premium', session: req.session, moment: moment, country: country });
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
    // console.log("vinit",donateduser)
    res.render('User/Donated', { baseUrl, donateduser: donateduser, country1: country1, path: 'donateduser', session: req.session, moment: moment });
  }

  // ....................MEBERSHIP[CONFIGURATION]......................
  static MembershipTenure = async (req, res) => {
    let membership = await MembershipModel.find({}).sort({ _id: -1 });
    res.render('Configuration/Membership', { baseUrl, membership: membership, path: 'membership', session: req.session });
  }

  static AddMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.find({}).sort({ _id: -1 });
    res.render('Configuration/Addmembership', { baseUrl, membership: membership, path: 'membership', });
  }

  static EditMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.findById(req.query.id);
    res.render('Configuration/Editmembership', { baseUrl, membership: membership, path: 'membership' });
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
    res.render('Configuration/Systemimage', { baseUrl, data: {}, system: system, path: 'system', session: req.session });
  }

  static AddsystemImages = async (req, res) => {
    let system = await SystemModel.find({}).sort({ _id: -1 });
    let categories = await CategoryModel.find({});
    res.render('Configuration/Addsystemimage', { baseUrl, data: {}, system: system, path: 'system', categories: categories });
  }

  static EditsystemImages = async (req, res) => {
    let categories = await CategoryModel.find({});
    let system = await SystemModel.findById(req.query.id);
    let a = JSON.parse(JSON.stringify(system))
    a['Thumbnail'] = system.Thumbnail.split(",");
    res.render('Configuration/Editsystemimage', { baseUrl, system: a, path: 'system', categories: categories });
  }

  // ...................FOLDERS[CONFIGURATION].........................
  static Folder = async (req, res) => {
    let folder = await FolderModel.find({}).sort({ _id: -1 });
    res.render('Configuration/Folder', { baseUrl, folder: folder, path: "folder", session: req.session })
  }

  static AddFolder = async (req, res) => {
    let folder = await FolderModel.find({});
    res.render('Configuration/Addfolder', { baseUrl, folder: folder, path: "folder" })
  }

  static EditFolder = async (req, res) => {
    let folder = await FolderModel.findById(req.query.id)
    res.render('Configuration/Editfolder', { baseUrl, folder: folder, path: "folder" })
  }

  // ..........................BANNERS.................................
  static Banner = async (req, res) => {
    let banner = await BannerModel.find({}).sort({ _id: -1 })
    res.render('Banner/Banner', { baseUrl, data: {}, banner: banner, path: 'banner', session: req.session });
  }

  static AddBanner = async (req, res) => {
    let banner = await BannerModel.find({});
    res.render('Banner/AddBanner', { baseUrl, data: {}, banner: banner, path: 'banner' });
  }

  static EditBanner = async (req, res) => {
    let banner = await BannerModel.findById(req.query.id);
    res.render('Banner/EditBanner', { baseUrl, banner: banner, path: 'banner' });
  }

  static Viewbanner = async (req, res) => {
    let banner = await BannerModel.findById(req.query.id);
    res.render("Banner/ViewBanner", { baseUrl, banner: banner, path: "banner" })
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
    res.render('MemberPayment/Paypal', { baseUrl, toncoin: toncoin, path: 'paypal', session: req.session, moment: moment });
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

    console.log("253", referral)

    let country = await UserModel.aggregate([
      {
        $group: {
          _id: { country: "$country" }
        }
      }
    ]);

    res.render('Referral/Referral', { baseUrl, data: {}, referral: referral, path: 'referral', session: req.session, country: country });
  }

  static UpdateReferral = async (req, res) => {
    let data = req.body;
    console.log("data", data)
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
    console.log("log", logo);
    res.render('Configuration/Logo', { baseUrl, data: {}, logo: logo, path: 'logo', session: req.session });
  }

  static AddLogo = async (req, res) => {
    let logo = await LogoModel.find({});
    res.render('Configuration/AddLogo', { baseUrl, data: {}, logo: logo, path: 'logo' });
  }

  static EditLogo = async (req, res) => {
    let logo = await LogoModel.findById(req.query.id);
    res.render('Configuration/EditLogo', { baseUrl, logo: logo, path: 'logo' });
  }
}

export default DashboardController;