import express, { response } from "express";
import { Validator } from "node-input-validator";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { validatorError } from "../Common.js";
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import makeDir from "make-dir";
import fs from "fs";
import SendEmail from "../Utils/SendEmail.js";
import AdminModel from "../Models/Admin.js";
import UserModel from "../Models/User.js";
import MembershipModel from "../Models/Membership.js";
import BannerModel from "../Models/Banner.js";
import SystemModel from "../Models/Systemimage.js";
import FolderModel from "../Models/Folder.js";
import PaypalModel from "../Models/Paypal.js";
import ConfigurationModel from "../Models/Configuration.js";
import ReferralMembershipModel from "../Models/ReferralMembership.js";
import ReferralReportModel from "../Models/ReferralReport.js";
import AdminNotificationModel from "../Models/AdminNotification.js";
import PaymentConfigurationModel from "../Models/PaymentConfiguration.js";
import excelJS from "exceljs";
import CategoryModel from "../Models/Category.js";
import moment from "moment/moment.js";
import { log } from "console";
import AdminTokenModel from "../Models/AdminToken.js";
// localStorage used on server is not suitable for per-user state; store tokens in session instead
import LogoModel from "../Models/Logo.js";
import ReferralMembershipStipePayment from "../Models/ReferralMembershipStipePayment.js";
import MembershipStrpiePaymentModel from "../Models/MembershipStripePayment.js";
import USDTMembershipPaymentModel from "../Models/USDTMembershipPayment.js";
import TelegramCoinMembershipPaymentModel from "../Models/TelegramCoinMembershipPayment.js";
import crypto from "crypto";
import { checkExpiredMemberships } from "../Utils/membershipCron.js";

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
const app = express();

// ...............ADMIN-REGISTER...............
class AdminController {
  static Adminregister = async (req, res) => {
    try {
      let data = req.body;

      let validator = new Validator(data, {
        email: "required|email",
        name: "required|alpha",
        password: "required",
        confirmpassword: "required|same:password",
      });
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors);
        return res.render("Admin/Register", { baseUrl, errors, path: "" });
      }
      let user = await AdminModel.findOne({ email: data.email });
      if (user) {
        res.render("Admin/Register", {
          baseUrl,
          message: "This User is already register",
        });
      } else {
        const { name, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const doc = new AdminModel({
          name: name,
          email: email,
          password: hashedPassword,
        });
        const result = await doc.save();
        res.redirect("signin");
      }
    } catch (error) {}
  };

  //.........ADMIN-LOGIN............
  static Adminlogin = async (req, res) => {
    var data = req.body;
    let validator = new Validator(
      data,
      {
        email: "required|email",
        password: "required",
      },
      {
        email: "Email Is Necessary",
        password: "Password Is Necessary",
      },
    );
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Admin/Login", { baseUrl, errors: error, path: "" });
    } else {
      let accessTokenSecret = process.env["JWT_SECRET_KEY"];
      let accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
      let user = await AdminModel.findOne({ email: data.email });
      if (!user) {
        res.render("Admin/Login", { baseUrl, message: "User Not Found" });
      } else {
        let match = bcrypt.compareSync(data.password, user.password);
        if (!match) {
          return res.render("Admin/Login", {
            baseUrl,
            message: "Your Password May Be Wrong",
          });
        }
        const token = jwt.sign(
          { email: data.email, id: user._id },
          process.env.JWT_SECRET_KEY,
          { expiresIn: process.env.ACCESS_TOKEN_LIFE },
        );
        let tokendata = await AdminTokenModel.create({
          token: token,
          User: user._id,
        });
        await AdminModel.findByIdAndUpdate(
          { _id: user._id },
          {
            fcmtoken: req.body.fcmtoken,
          },
        );
        let user1 = await AdminModel.findById(user._id);
        // store token in session (don't use server-side localStorage for per-user authentication)
        req.session.user_id = user1._id;
        req.session.token = token;
        req.session.token = token;
        req.session.tostMsg = "You Are Logged in Successfully...";
        req.session.tostBackground = "#0b6a3c";
        req.session.isTost = true;
        return res.redirect("dashboard");
      }
    }
  };
  static GetProfile = async (req, res) => {
    const userDetails = await AdminModel.findById(req.session.user_id);
    return res.status(200).json({
      success: true,
      data: userDetails,
    });
  };

  // ...........ADMIN-FORGOTPASSWORD............
  static ForgotPassword = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(
        data,
        {
          email: "required|email",
        },
        {
          email: "Enter your Email",
        },
      );
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors);
        return res.render("Admin/ForgotPassword", {
          baseUrl,
          errors,
          path: "",
        });
      }
      const user = await AdminModel.findOne({ email: req.body.email });
      if (!user)
        return res.render("Admin/ForgotPassword", {
          baseUrl,
          errors: { email: "Your email may be wrong" },
          id: req.body.id,
        });
      let otp = Math.floor(Math.random() * 1000000 + 1) + " ";
      await AdminModel.findByIdAndUpdate(user._id, { otp });
      await SendEmail(user.email, "Password reset", otp);
      res.render("Layout/Otp", {
        baseUrl,
        id: user?._id,
        message: "otp send in your email address",
      });
    } catch (error) {
      res.send("An error occured");
    }
  };

  // ............ADMIN-OTPVARIFYING............
  static OtpVarify = async (req, res) => {
    try {
      const user = await AdminModel.findById(req.body.id);
      if (!user) return res.status(400).send("user not found");
      //user.otp
      const otp1 = req.body.otp1;
      const otp2 = req.body.otp2;
      const otp3 = req.body.otp3;
      const otp4 = req.body.otp4;
      const otp5 = req.body.otp5;
      const otp6 = req.body.otp6;
      const result = otp1.concat(
        "",
        otp2,
        "",
        otp3,
        "",
        otp4,
        "",
        otp5,
        "",
        otp6,
      );
      let otp;
      if (result != "") {
        otp = await AdminModel.findOne({ otp: result });
      } else {
        return res.render("Layout/Otp", {
          baseUrl,
          errors: { otp: "Add your Otp" },
          id: req.body.id,
        });
      }
      if (!otp) {
        return res.render("Layout/Otp", {
          baseUrl,
          errors: { otp: "Otp not Match" },
          id: req.body.id,
        });
      } else {
        res.render("Admin/ChangePasswords", {
          baseUrl,
          id: req.body.id,
        });
      }
    } catch (error) {
      res.send("An error occured");
    }
  };

  // ............ADMIN-PASSWORDRESET...........
  static ResetPassword = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        new_password: "required|minLength:7|maxLength:15",
        confirm_password: "required|same:new_password",
      });
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors);
        return res.render("Admin/ChangePasswords", {
          baseUrl,
          errors,
          path: "",
          id: req.body.id,
          session: req.session,
        });
      }

      const user = await AdminModel.findById(req.body.id);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.new_password, salt);
      await AdminModel.findByIdAndUpdate(req.body.id, {
        password: hashedPassword,
      });
      res.redirect("signin");
    } catch (error) {
      res.send("An error occured");
    }
  };

  //........CHANGE-PASSWORD AFTER LOGIN.....
  static ChangePassword = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(req.body, {
        current_password: "required",
        new_password: "required|minLength:7|maxLength:15",
        confirm_password: "required|same:new_password",
      });
      const matched = await validator.check();
      if (!matched) {
        let errors = validatorError(res, validator.errors);
        return res.render("Admin/Changepassword", {
          baseUrl,
          errors,
          path: "",
        });
      }

      let user = req.user;
      const hashedPassword = bcrypt.hashSync(req.body.new_password, 10);
      await AdminModel.updateOne(
        {
          _id: user._id,
        },
        {
          password: hashedPassword,
        },
      );
      const userData = await AdminModel.findOne({ _id: user._id });
      let jwt_secret = process.env.JWT_SECRET || "mysecret";
      let token = jwt.sign({ data: userData }, jwt_secret, {
        expiresIn: "12h",
      });
      return res.redirect("signin");
    } catch (error) {
      return res.status(400).send({
        message: error.message,
        data: error,
      });
    }
  };

  //..........ADMIN-LOGOUT...........
  static Adminlogout = async (req, res) => {
    var data = req.body;
    let tokenData = await AdminModel.findByIdAndUpdate(data._id, {
      token: req.session.token,
    });
    req.session.token = null;
    return res.status(200).send("User logout successfully.");
  };

  // ................MY-ACCOUNT..................
  static MyAccount = async (req, res) => {
    let data = req.body;
    let validator = new Validator(data, {
      email: "required|email",
    });
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let myaccount = await UserModel.find({});
      res.render("Admin/Myaccount", {
        baseUrl,
        errors: error,
        myaccount: myaccount,
        path: "myaccount",
      });
    } else {
      if (req.body.myaccount_id != "") {
        const doc = await UserModel.findByIdAndUpdate(req.body.myaccount_id, {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
        });
      } else {
        const doc = new UserModel({
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
        });
        const result = await doc.save();
      }
      req.session.isTost = true;
      req.session.tostMsg = "Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}dashboard`);
    }
  };

  // .........BANNER.............
  static Banner = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      data,
      {
        title: "required",
        link: "required|url",
        thumbnail: "required",
      },
      {
        title: "Title is necessary",
        link: "Link is necessary",
        thumbnail: "Thumbnail is necessary",
      },
    );

    const path = await makeDir("./assets/bannerimage/");
    let thumbnail = req.files?.thumbnail;
    let imagename;

    if (req.files?.thumbnail) {
      thumbnail = req.files?.thumbnail;
      var d = new Date();
      var photo = thumbnail.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      imagename = "bannerimage/" + imname;
      let uploadPath = path + "/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Banner/AddBanner", {
        baseUrl,
        errors: error,
        path: "banner",
      });
    } else {
      const doc = new BannerModel({
        Title: req.body.title,
        Link: req.body.link,
        Banner: imagename,
      });
      const result = await doc.save();
      req.session.tostMsg = "Banner Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/banner`);
    }
  };

  static EditBanner = async (req, res) => {
    let data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      {
        title: "required",
        link: "required|url",
        thumbnail: "required",
      },
      {
        title: "Title is necessary",
        link: "Link is necessary",
        thumbnail: "Thumbnail is necessary",
      },
    );
    let banner = await BannerModel.findById(req.body.id);
    const path = await makeDir("./assets/bannerimage/");
    let thumbnail;
    let imagename;
    if (req.files?.thumbnail != undefined) {
      const url = banner.Banner;
      let filename = new URL(url).pathname.split("/").pop();
      let photo = path + "/" + filename;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      thumbnail = req.files?.thumbnail;
      var d = new Date();
      photo = thumbnail.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadPath = path + "/" + imname;
      imagename = "bannerimage/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    // await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let banner = await BannerModel.findByIdAndUpdate(req.body.id);
      res.render("Banner/EditBanner", {
        baseUrl,
        errors: error,
        banner: banner,
        path: "banner",
      });
    } else {
      const doc = await BannerModel.findByIdAndUpdate(req.body.id, {
        Title: req.body.title,
        Link: req.body.link,
        Banner: imagename,
      });
      req.session.tostMsg = "Banner Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/banner`);
    }
  };

  static DeleteBanner = async (req, res) => {
    const banner1 = await BannerModel.findById(req.query.id);
    const path = await makeDir("./assets/bannerimage/");
    if (banner1.Banner) {
      const url = banner1.Banner;
      let filename = new URL(url).pathname.split("/").pop();
      let image = path + "/" + filename;
      if (fs.existsSync(image)) fs.unlinkSync(image);
    }
    const banner = await BannerModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/banner`,
    });
  };

  // .....................MEMEBRSHIP[CONFIGURATION]...............
  static MembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        usdt: "required",
        telegramcoin: "required",
      },
      {
        membershiperiod: " This Field is necessary",
        usdt: " This Field is necessary",
        telegramcoin: " This Field is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Configuration/AddMembership", {
        baseUrl,
        errors: error,
        path: "membership",
      });
    } else {
      const doc = new MembershipModel({
        membershiperiod: req.body.membershiperiod,
        usdt: req.body.usdt,
        telegramcoin: req.body.telegramcoin,
      });
      const result = await doc.save();
      req.session.tostMsg = "Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/membership`);
    }
  };

  static EditMembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        usdt: "required",
        telegramcoin: "required",
      },
      {
        membershiperiod: " This Field is necessary",
        usdt: " This Field is necessary",
        telegramcoin: " This Field is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let membership = await MembershipModel.findById(data.id);
      res.render("Configuration/EditMembership", {
        baseUrl,
        errors: error,
        membership: membership,
        path: "membership",
      });
    } else {
      const doc = await MembershipModel.findByIdAndUpdate(data.id, {
        membershiperiod: req.body.membershiperiod,
        usdt: req.body.usdt,
        telegramcoin: req.body.telegramcoin,
      });
      req.session.isTost = true;
      req.session.tostMsg = "Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/membership`);
    }
  };

  static DeleteMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/membership`,
    });
  };

  // .........................SYSTEM[CONFIGURATION]............................
  static SystemImages = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      data,
      {
        thumbnail: "required",
        categoryname: "required",
      },
      {
        thumbnail: "Image is necessary",
        categoryname: " Category Selection is required",
      },
    );
    await validator.check();
    let error = validatorError(res, validator.errors);

    const path = await makeDir("./assets/systemimage/");

    let details = {};
    if (error && JSON.stringify(error) != "{}") {
      let system = await SystemModel.find({});
      let categories = await CategoryModel.find({});

      res.render("Configuration/Addsystemimage", {
        baseUrl,
        errors: error,
        categories: categories,
        system: system,
        path: "system",
      });
    } else {
      let category = await SystemModel.findOne({
        categoryname: req.body.categoryname,
      });
      let image = req.files?.thumbnail;
      const images = [];
      if (image) {
        if (Array.isArray(image)) {
          for (let i = 0; i < image.length; i++) {
            var d = new Date();
            let extension = image[i].name.split(".").pop();
            let r = (Math.random() + 1).toString(36).substring(7);
            var imname = d.getSeconds() + "." + r + "." + extension;
            images.push(imname);
            let uploadPath = path + "/" + imname;
            image[i].mv(uploadPath, function (err) {
              if (err) return res.status(500).send(err);
            });
          }
        } else {
          var d = new Date();
          let extension = image.name.split(".").pop();
          let r = (Math.random() + 1).toString(36).substring(7);
          var imname = d.getSeconds() + "." + r + "." + extension;
          let uploadPath = path + "/" + imname;
          image.mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err);
          });
          images.push(imname);
        }
      }
      if (category != null) {
        if (category.Thumbnail != "") images.push(category.Thumbnail);
        details["Thumbnail"] = images.join();
        const doc = await SystemModel.findByIdAndUpdate(category._id, details);
      } else {
        const doc = new SystemModel({
          categoryname: req.body.categoryname,
          Thumbnail: images.join(),
        });
        const result = await doc.save();
      }
      req.session.tostMsg = "SystemImage Update Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/system`);
    }
  };

  static EditSystemImages = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      data,
      {
        categoryname: "required",
      },
      {
        categoryname: " Category Selection is required",
      },
    );
    await validator.check();
    let error = validatorError(res, validator.errors);
    const path = await makeDir("./assets/systemimage/");

    let details = {};
    if (error && JSON.stringify(error) != "{}") {
      let system = await SystemModel.find({});
      let categories = await CategoryModel.find({});
      res.redirect("back");

      res.render("Configuration/Editsystemimage", {
        baseUrl,
        errors: error,
        categories: categories,
        system: system,
        path: "system",
      });
    } else {
      let category = await SystemModel.findOne({
        categoryname: req.body.categoryname,
      });
      let image = req.files?.thumbnail;
      const images = [];
      if (image) {
        if (Array.isArray(image)) {
          for (let i = 0; i < image.length; i++) {
            var d = new Date();
            let extension = image[i].name.split(".").pop();
            let r = (Math.random() + 1).toString(36).substring(7);
            var imname = d.getSeconds() + "." + r + "." + extension;
            images.push(imname);
            let uploadPath = path + "/" + imname;
            image[i].mv(uploadPath, function (err) {
              if (err) return res.status(500).send(err);
            });
          }
        } else {
          var d = new Date();
          let extension = image.name.split(".").pop();
          let r = (Math.random() + 1).toString(36).substring(7);
          var imname = d.getSeconds() + "." + r + "." + extension;
          let uploadPath = path + "/" + imname;
          image.mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err);
          });
          images.push(imname);
        }
      }
      if (category != "") {
        if (category.Thumbnail != "") images.push(category.Thumbnail);
        details["Thumbnail"] = images.join();
        const doc = await SystemModel.findByIdAndUpdate(category._id, details);
      } else {
        const doc = new SystemModel({
          categoryname: req.body.categoryname,
          Thumbnail: images.join(),
        });
        const result = await doc.save();
      }

      req.session.tostMsg = "SystemImage Update Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/system`);
    }
  };

  static Deletesystempic = async (req, res) => {
    var id = req.query.id;
    var newarray = id.split("-");
    var uid = newarray[0];
    var uname = newarray[1];
    const path = await makeDir("./assets/systemimage/");
    let system = await SystemModel.findById(uid);
    var gT = system.Thumbnail;
    var gt1 = gT.split(",");
    gt1 = gt1.filter(function (item) {
      return item !== uname;
    });
    if (system.Thumbnail) {
      const url = system.Thumbnail;
      let filename = uname;
      let image = path + "/" + filename;
      if (fs.existsSync(image)) fs.unlinkSync(image);
    }
    const pic = await SystemModel.findByIdAndUpdate(uid, {
      Thumbnail: gt1.join(),
    });
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/system`,
    });
  };

  static DeletesystemImages = async (req, res) => {
    let systems = await SystemModel.findById(req.query.id);
    const path = await makeDir("./assets/systemimage/");
    if (systems.Thumbnail) {
      let thumbnail = req.files?.thumbnail;
      let photo = path + "/" + thumbnail;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
    const system = await SystemModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "SystemImage deleted successfully.",
      Url: `${baseUrl}admin/system`,
    });
  };

  // ...................FOLDERS[CONFIGURATION].........................
  static Folder = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        folder: "required",
      },
      {
        folder: "Folder Name is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Configuration/Addfolder", {
        baseUrl,
        errors: error,
        path: "folder",
      });
    } else {
      const doc = new FolderModel({
        Folder: req.body.folder,
      });
      const result = await doc.save();
      req.session.tostMsg = "Data Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/folder`);
    }
  };

  static EditFolder = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        folder: "required",
      },
      {
        folder: "Folder Name is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let folder = await FolderModel.findByIdAndUpdate(req.body.id);
      res.render("Configuration/Editfolder", {
        baseUrl,
        errors: error,
        folder: folder,
        path: "folder",
      });
    } else {
      const doc = await FolderModel.findByIdAndUpdate(req.body.id, {
        Folder: req.body.folder,
      });
      req.session.isTost = true;
      req.session.tostMsg = " Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/folder`);
    }
  };

  static DeleteFolder = async (req, res) => {
    let folder = await FolderModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/folder`,
    });
  };

  // ......................DELETEUSERS[FREEUSER,PREMIUM,DONATED].....................
  static DeleteUser = async (req, res) => {
    let user = await UserModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/freeuser`,
    });
  };

  static UpdateUser = async (req, res) => {
    try {
      const user = await UserModel.findById(req.query.id);
      await UserModel.findByIdAndUpdate(user._id, {
        status: 1,
      });
      req.session.tostMsg = " Switched Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      return res.status(200).json({
        status: true,
        Url: `${baseUrl}admin/premium`,
      });
    } catch (error) {}
  };

  static ViewUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id);
    res.render("User/Viewuser", { baseUrl, user: user, path: "user" });
  };

  static DeletePremiumUser = async (req, res) => {
    let user = await UserModel.findByIdAndUpdate(req.query.id, {
      usertype: 0,
      paymentstatus: 0,
      enddate: null,
      startdate: null,
      isReferral: 0,
      refimgstatue: 0,
      refstatue: 0,
    });
    // let premium = await ToncoinModel.deleteMany({ user_id: req.query.id });
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/premium`,
    });
  };

  static UpdatePremiumUser = async (req, res) => {
    try {
      const user = await UserModel.findById(req.query.id);
      await UserModel.findByIdAndUpdate(user._id, {
        usertype: 2,
      });
      req.session.tostMsg = "Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      return res.status(200).json({
        status: true,
        Url: `${baseUrl}admin/premium`,
      });
    } catch (error) {}
  };

  static ViewPremiumUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id);
    res.render("User/Viewpremium", { baseUrl, user: user, path: "user" });
  };

  static DeleteDonatedUser = async (req, res) => {
    await UserModel.findByIdAndUpdate(req.query.id, {
      usertype: 0,
      paymentstatus: 0,
      enddate: null,
      startdate: null,
      isReferral: 0,
      refimgstatue: 0,
      refstatue: 0,
    });
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
      Url: `${baseUrl}admin/donateduser`,
    });
  };

  static ViewDonatedUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id);
    res.render("User/Viewdonate", { baseUrl, user: user, path: "user" });
  };

  // ....................CONFIGURATION(KEY-VALUE)...................
  static Configuration = async (req, res) => {
    let configuration = await ConfigurationModel.find({});
    res.render("Configuration/Configuration", {
      baseUrl,
      configuration: configuration,
      path: "configuration",
      session: req.session,
      loginUser: req.user,
    });
  };

  static add_configuration = async (req, res) => {
    res.render("Configuration/Addconfiguration", {
      baseUrl,
      data: {},
      path: "configuration",
      loginUser: req.user,
    });
  };

  static edit_configuration = async (req, res) => {
    let configuration = await ConfigurationModel.findById(req.query.id);
    res.render("Configuration/Editconfiguration", {
      baseUrl,
      configuration: configuration,
      path: "configuration",
      loginUser: req.user,
    });
  };

  static configuration = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        configkey: "required",
        configvalue: "required",
      },
      {
        configkey: "Key is necessary",
        configvalue: "Value is necessary",
      },
    );
    if (!(await validator.check())) {
      let errors = validatorError(res, validator.errors);
      return res.render("Configuration/Addconfiguration", {
        baseUrl,
        errors,
        path: "configuration",
      });
    }
    let data1 = await ConfigurationModel.findOne({ ConfigKey: data.configkey });
    if (data1) {
      res.render("Configuration/Addconfiguration", {
        baseUrl,
        message: "Choose Different Key",
        path: "configuration",
      });
    } else {
      const doc = new ConfigurationModel({
        ConfigKey: req.body.configkey,
        ConfigValue: req.body.configvalue,
        Status: req.body.status,
      });
      const result = await doc.save();
      req.session.tostMsg = "Data Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/configuration`);
    }
  };

  static editconfiguration = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        configkey: "required",
        configvalue: "required",
      },
      {
        configkey: " Key is necessary",
        configvalue: " Value is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let configuration = await ConfigurationModel.findByIdAndUpdate(
        req.body.id,
      );
      res.render("Configuration/Editconfiguration", {
        baseUrl,
        errors: error,
        configuration: configuration,
        path: "configuration",
      });
    } else {
      const doc = await ConfigurationModel.findByIdAndUpdate(req.body.id, {
        ConfigKey: req.body.configkey,
        ConfigValue: req.body.configvalue,
        Status: req.body.status,
      });
      req.session.isTost = true;
      req.session.tostMsg = " Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/configuration`);
    }
  };

  static deleteconfiguration = async (req, res) => {
    let configuration = await ConfigurationModel.findByIdAndDelete(
      req.query.id,
    );
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/configuration`,
    });
  };

  //...................CATEGORY..................
  static Categories = async (req, res) => {
    let categories = await CategoryModel.find({});
    res.render("Configuration/Category", {
      baseUrl,
      categories: categories,
      path: "categories",
      session: req.session,
      loginUser: req.user,
    });
  };

  static Addcategories = async (req, res) => {
    let categories = await CategoryModel.find({});
    res.render("Configuration/AddCategory", {
      baseUrl,
      data: {},
      categories: categories,
      path: "categories",
    });
  };

  static Editcategories = async (req, res) => {
    let categories = await CategoryModel.findById(req.query.id);
    res.render("Configuration/EditCategory", {
      baseUrl,
      categories: categories,
      path: "categories",
    });
  };

  static Category = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        categoryname: "required",
      },
      {
        title: "The Category  is necessary",
      },
    );
    if (!(await validator.check())) {
      let errors = validatorError(res, validator.errors);
      return res.render("Configuration/AddCategory", {
        baseUrl,
        errors,
        path: "categories",
      });
    }
    let data1 = await CategoryModel.findOne({
      categoryname: data.categoryname,
    });
    if (data1) {
      res.render("Configuration/AddCategory", {
        baseUrl,
        message: "Choose Different Category Name",
        path: "categories",
      });
    } else {
      const doc = new CategoryModel({
        categoryname: req.body.categoryname,
      });
      const result = await doc.save();
      req.session.tostMsg = "Data Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/categories`);
    }
  };

  static Editcategory = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        categoryname: "required",
      },
      {
        title: "The Category  is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let categories = await CategoryModel.findByIdAndUpdate(req.body.id);
      res.render("Configuration/EditCategory", {
        baseUrl,
        errors: error,
        categories: categories,
        path: "categories",
      });
    } else {
      const doc = await CategoryModel.findByIdAndUpdate(req.body.id, {
        categoryname: req.body.categoryname,
      });
      req.session.isTost = true;
      req.session.tostMsg = " Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/categories`);
    }
  };

  static Deletecategory = async (req, res) => {
    let categories = await CategoryModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/categories`,
    });
  };
  // .........LOGO.............
  static Logo = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      data,
      {
        link: "required|url",
        thumbnail: "required",
      },
      {
        link: "Link is necessary",
        thumbnail: "Thumbnail is necessary",
      },
    );

    const path = await makeDir("./assets/logoimage/");
    let thumbnail = req.files?.thumbnail;
    let imagename;

    if (req.files?.thumbnail) {
      thumbnail = req.files?.thumbnail;
      var d = new Date();
      var photo = thumbnail.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      imagename = "logoimage/" + imname;
      let uploadPath = path + "/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Configuration/AddLogo", {
        baseUrl,
        errors: error,
        path: "logo",
      });
    } else {
      const doc = new LogoModel({
        Link: req.body.link,
        Banner: imagename,
      });
      const result = await doc.save();
      req.session.tostMsg = "Logo Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/logo`);
    }
  };

  static EditLogo = async (req, res) => {
    let data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(
      {
        link: "required|url",
        thumbnail: "required",
      },
      {
        link: "Link is necessary",
        thumbnail: "Thumbnail is necessary",
      },
    );
    let logo = await LogoModel.findById(req.body.id);
    const path = await makeDir("./assets/logoimage/");
    let thumbnail;
    let imagename;
    if (req.files?.thumbnail != undefined) {
      const url = logo.Banner;
      let filename = new URL(url).pathname.split("/").pop();
      let photo = path + "/" + filename;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      thumbnail = req.files?.thumbnail;
      var d = new Date();
      photo = thumbnail.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadPath = path + "/" + imname;
      imagename = "logoimage/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    // await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let logo = await LogoModel.findByIdAndUpdate(req.body.id);
      res.render("Logo/EditLogo", {
        baseUrl,
        errors: error,
        logo: logo,
        path: "logo",
      });
    } else {
      const doc = await LogoModel.findByIdAndUpdate(req.body.id, {
        Link: req.body.link,
        Banner: imagename,
      });
      req.session.tostMsg = "Logo Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/logo`);
    }
  };

  // .....................REFERRAL-MEMEBRSHIP[CONFIGURATION]...............
  static ReferralMembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        price: "required",
        // toncoin: "required",
      },
      {
        membershiperiod: " This Field is necessary",
        price: " This Field is necessary",
        // toncoin: " This Field is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Referral/Addreferralmembership", {
        baseUrl,
        errors: error,
        path: "referralmembership",
      });
    } else {
      const doc = new ReferralMembershipModel({
        membershiperiod: req.body.membershiperiod,
        price: req.body.price,
        // toncoin: req.body.toncoin,
      });
      const result = await doc.save();
      req.session.tostMsg = "Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/referralmembership`);
    }
  };

  static EditReferralMembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        price: "required",
        // toncoin: "required",
      },
      {
        membershiperiod: "This Field is necessary",
        price: "This Field is necessary",
        // toncoin: "This Field is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let referralmembership = await ReferralMembershipModel.findByIdAndUpdate(
        data.id,
      );
      res.render("Referral/Editreferralmembership", {
        baseUrl,
        errors: error,
        referralmembership: referralmembership,
        path: "referralmembership",
      });
    } else {
      const doc = await ReferralMembershipModel.findByIdAndUpdate(data.id, {
        membershiperiod: req.body.membershiperiod,
        price: req.body.price,
        // toncoin: req.body.toncoin,
      });
      req.session.isTost = true;
      req.session.tostMsg = "Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/referralmembership`);
    }
  };

  static DeleteReferralMembershipTenure = async (req, res) => {
    let referralmembership = await ReferralMembershipModel.findByIdAndDelete(
      req.query.id,
    );
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/referralmembership`,
    });
  };

  static Notificationcount = async (req, res) => {
    let user = await UserModel.findById(req.user._id);

    let notification = await AdminNotificationModel.find({ status: 0 }).count();

    return res.status(200).json({
      success: true,
      data: notification,
    });
  };

  static DeletNotifaction = async (req, res) => {
    let user = await AdminNotificationModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  };

  static DeleteStripeDetail = async (req, res) => {
    await ReferralMembershipStipePayment.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  };

  static ExportDataReferral = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My ReferralUser");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "MemberId", key: "memberid" },
      { header: "UserName", key: "username" },
      { header: "TG-id", key: "tgid" },
      { header: "Email", key: "email" },
      { header: "Country", key: "country" },
      { header: "Referral Status", key: "refstatue" },
      { header: "Referral Imgage Status", key: "refimgstatue" },
    ];
    let counter = 1;
    const userData = await UserModel.find({ isReferral: 1 });

    userData.forEach((user) => {
      user.s_no = counter;
      worksheet.addRow(user);
      counter++;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlfoemats-officedocument.spreadsheatml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ReferralListDetail.xlsx`,
    );

    return workbook.xlsx.write(res).then(() => {
      res.status(200);
    });
  };

  static ExportDataStrape = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Stripe Detail");
    let stripe = await ReferralMembershipStipePayment.find({}).sort({
      _id: -1,
    });

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Referral TG-id", key: "referral_tgid" },
      { header: "Member TG-id", key: "member_tgid" },
      { header: "Tenure", key: "tenure" },
      { header: "Price(HK$)", key: "price" },
      { header: "Payment Date", key: "date" },
    ];
    let list = stripe.map(async (e) => {
      let member = await UserModel.findById(e.user);
      let membership = await ReferralMembershipModel.findById(e.membership);
      return {
        id: e._id,
        referral_tgid: e.referral_tgid,
        member_tgid: member.tgid,
        tenure: membership.membershiperiod,
        price: membership.price,
        date: moment(e.date).format("DD-MM-yyyy"),
      };
    });
    Promise.all(list).then((result) => {
      const data = result.map((e) => {
        return {
          id: e.id,
          referral_tgid: e.referral_tgid,
          member_tgid: e.member_tgid,
          tenure: `${e.tenure} Year`,
          price: `${e.price} HK$`,
          date: e.date,
        };
      });

      let counter = 1;

      data.forEach((user) => {
        user.s_no = counter;
        worksheet.addRow(user);
        counter++;
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlfoemats-officedocument.spreadsheatml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=StrapeDetail.xlsx`,
      );

      return workbook.xlsx.write(res).then(() => {
        res.status(200);
      });
    });
  };

  static ExportDataRefReport = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My ReferralReport");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Referal TG ID", key: "tgid" },
      { header: "Country", key: "country" },
      { header: "TG-Status", key: "refstatue" },
      { header: "Total Added Members", key: "totalRef" },
    ];

    let referralreport = await ReferralReportModel.find({}).distinct(
      "referral_user_id",
    );
    let counter = 1;
    let referral = referralreport.map(async (e) => {
      const list = await UserModel.findById(e);
      const memberlist = await ReferralReportModel.find({
        referral_user_id: e,
      });

      return {
        id: e,
        tgid: list?.tgid,
        country: list?.country,
        refstatue: list?.refstatue == 1 ? "Active" : "Deactive",
        totalRef: memberlist.length,
      };
    });

    Promise.all(referral).then((resp) => {
      resp.forEach((user) => {
        user.s_no = counter;
        worksheet.addRow(user);
        counter++;
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlfoemats-officedocument.spreadsheatml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=ReferralReport.xlsx`,
      );

      return workbook.xlsx.write(res).then(() => {
        res.status(200);
      });
    });
  };

  static ExportStripeDetail = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My StripeReport");
    let list = await MembershipStrpiePaymentModel.find({});

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Member Id", key: "member_id" },
      { header: "UserName", key: "username" },
      { header: "Telegram Id", key: "telegram_id" },
      { header: "Ternuer (in Years)", key: "tenure" },
      { header: "Amount (HK$)", key: "amount" },
      { header: "Date ", key: "date" },
    ];
    let member = list.map(async (e) => {
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
        date: e.date,
      };
    });

    Promise.all(member).then((result) => {
      const data = result.map((e) => {
        return {
          id: e._id,
          telegram_id: e.telegram_id,
          member_id: e.member_id,
          username: e.username,
          tenure: `${e.tenure} Year`,
          amount: `${e.amount} HK$`,
          date: e.date,
        };
      });
      let counter = 1;

      data.forEach((user) => {
        user.s_no = counter;
        worksheet.addRow(user);
        counter++;
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlfoemats-officedocument.spreadsheatml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=StripeDetails.xlsx`,
      );

      return workbook.xlsx.write(res).then(() => {
        res.status(200);
      });
    });
  };

  static ExportUSDTPayment = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("USDT Payment Report");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Member Id", key: "member_id" },
      { header: "UserName", key: "username" },
      { header: "Telegram Id", key: "telegram_id" },
      { header: "Wallet Address", key: "wallet" },
      { header: "Tenure (in Years)", key: "tenure" },
      { header: "Amount (USDT)", key: "amount" },
      { header: "Payment Date", key: "date" },
    ];

    let list = await USDTMembershipPaymentModel.find({});
    let member = list.map(async (e) => {
      let userdetail = await UserModel.findById(e.user);
      let membership = await MembershipModel.findById(e.membership_id);
      return {
        _id: e._id,
        member_id: userdetail?.memberid,
        username: userdetail?.username,
        telegram_id: e.telegram_id,
        tenure: membership?.membershiperiod,
        amount: e.amount,
        date: e.date,
      };
    });

    Promise.all(member).then((result) => {
      const data = result.map((e) => {
        return {
          member_id: e.member_id,
          username: e.username,
          telegram_id: e.telegram_id,
          wallet: e.wallet || "",
          tenure: `${e.tenure} Year(s)`,
          amount: `${e.amount} USDT`,
          date: e.date,
        };
      });

      let counter = 1;
      data.forEach((user) => {
        user.s_no = counter;
        worksheet.addRow(user);
        counter++;
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=USDTPaymentDetails.xlsx`,
      );

      return workbook.xlsx.write(res).then(() => {
        res.status(200);
      });
    });
  };

  static ExportTelegramCoinPayment = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Telegram Coin Payment Report");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Member Id", key: "member_id" },
      { header: "UserName", key: "username" },
      { header: "Telegram Id", key: "telegram_id" },
      { header: "Tenure (in Years)", key: "tenure" },
      { header: "Amount (Coin)", key: "amount" },
      { header: "Payment Date", key: "date" },
    ];

    let list = await TelegramCoinMembershipPaymentModel.find({});
    let member = list.map(async (e) => {
      let userdetail = await UserModel.findById(e.user);
      let membership = await MembershipModel.findById(e.membership_id);
      return {
        _id: e._id,
        member_id: userdetail?.memberid,
        username: userdetail?.username,
        telegram_id: e.telegram_id,
        tenure: membership?.membershiperiod,
        amount: e.amount,
        date: e.date,
      };
    });

    Promise.all(member).then((result) => {
      const data = result.map((e) => {
        return {
          member_id: e.member_id,
          username: e.username,
          telegram_id: e.telegram_id,
          tenure: `${e.tenure} Year(s)`,
          amount: `${e.amount} Coin`,
          date: e.date,
        };
      });

      let counter = 1;
      data.forEach((user) => {
        user.s_no = counter;
        worksheet.addRow(user);
        counter++;
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=TelegramCoinPaymentDetails.xlsx`,
      );

      return workbook.xlsx.write(res).then(() => {
        res.status(200);
      });
    });
  };

  static ExportDataRefDetail = async (req, res) => {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My ReferralReport");

    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "Referral TG", key: "referral_user_tgid" },
      { header: "Free Member TG", key: "freemember_tgid" },
      { header: "Tenure Of Upgrade", key: "membership_period" },
      { header: "Price (HK$)", key: "price" },
      { header: "Date of join to premium", key: "join_date" },
    ];
    let counter = 1;
    const userData = await ReferralReportModel.find({});

    userData.forEach((user) => {
      user.s_no = counter;
      worksheet.addRow(user);
      counter++;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlfoemats-officedocument.spreadsheatml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ReferralDetail.xlsx`,
    );

    return workbook.xlsx.write(res).then(() => {
      res.status(200);
    });
  };

  static PaymentConfiguration = async (req, res) => {
    let data = req.body;

    let validator = new Validator(
      data,
      {
        value: "required",
      },
      {
        value: "Value is necessary",
      },
    );
    if (!(await validator.check())) {
      let errors = validatorError(res, validator.errors);
      return res.render("Configuration/AddPaymentConfiguration", {
        baseUrl,
        errors,
        path: "paymentconfiguration",
      });
    } else {
      const doc = new PaymentConfigurationModel({
        value:
          req.body.value === "1"
            ? "Paypal"
            : req.body.value === "2"
              ? "Stripe"
              : req.body.value === "3"
                ? "Both"
                : "",
        payment_id: req.body.value,
      });

      const result = await doc.save();

      req.session.tostMsg = "Data Added Successfully...";
      req.session.tostBackground = "#0b6a3c";
      req.session.isTost = true;
      res.redirect(`${baseUrl}admin/paymentconfiguration`);
    }
  };

  static EditPaymentconfiguration = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        value: "required",
      },
      {
        value: " Value is necessary",
      },
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let paymentconfiguration =
        await PaymentConfigurationModel.findOneAndUpdate({
          value:
            req.body.value === "1"
              ? "Paypal"
              : req.body.value === "2"
                ? "Stripe"
                : req.body.value === "3"
                  ? "Both"
                  : "",
          payment_id: req.body.value,
        });
      res.render("Configuration/EditPaymentconfiguration", {
        baseUrl,
        errors: error,
        paymentconfiguration: paymentconfiguration,
        path: "paymentconfiguration",
      });
    } else {
      await PaymentConfigurationModel.findOneAndUpdate({
        value:
          req.body.value === "1"
            ? "Paypal"
            : req.body.value === "2"
              ? "Stripe"
              : req.body.value === "3"
                ? "Both"
                : "",
        payment_id: req.body.value,
      });
      req.session.isTost = true;
      req.session.tostMsg = " Data Updated Successfully...";
      req.session.tostBackground = "#0b6a3c";
      res.redirect(`${baseUrl}admin/paymentconfiguration`);
    }
  };

  static DeleteStripePayment = async (req, res) => {
    let user = await MembershipStrpiePaymentModel.findByIdAndDelete(
      req.query.id,
    );
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  };

  static DeleteAdminUser = async (req, res) => {
    let adminuser = await AdminModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  };

  // Set Telegram Premium Signup Toggle
  static setTelegramPremium = async (req, res) => {
    const value = req.body.telegram_signup_premium === "1" ? "1" : "0";
    let config = await ConfigurationModel.findOne({
      ConfigKey: "telegram_signup_premium",
    });
    if (config) {
      await ConfigurationModel.findByIdAndUpdate(config._id, {
        ConfigValue: value,
      });
    } else {
      await ConfigurationModel.create({
        ConfigKey: "telegram_signup_premium",
        ConfigValue: value,
      });
    }
    res.redirect(baseUrl + "admin/configuration");
  };

  // ............USDT PAYMENT APPROVAL........................
  static ApproveUSDTPayment = async (req, res) => {
    try {
      let payment = await USDTMembershipPaymentModel.findById(req.query.id);
      if (!payment) {
        return res
          .status(404)
          .json({ status: false, message: "Payment not found" });
      }

      const user = await UserModel.findById(payment.user);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      const membership = await MembershipModel.findById(payment.membership_id);
      if (!membership) {
        return res
          .status(404)
          .json({ status: false, message: "Membership not found" });
      }

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
        await user.save();
      }

      // Update user to premium
      await UserModel.findByIdAndUpdate(user._id, {
        usertype: 1,
        membertype: "premium",
        startdate: startDate,
        paymentstatus: 1,
        enddate: endDate,
        referralType: 0,
        paymentBy: 2, // 2 for USDT
      });

      // Update payment status
      await USDTMembershipPaymentModel.findByIdAndUpdate(payment._id, {
        status: 1,
        paymentstatus: 1,
      });

      // Ensure username equals tgid for premium users (handle collisions)
      try {
        const updatedUser = await UserModel.findById(user._id);
        if (updatedUser && updatedUser.tgid) {
          let desiredUsername = updatedUser.tgid;
          const conflict = await UserModel.findOne({
            username: desiredUsername,
            _id: { $ne: updatedUser._id },
          });
          if (conflict) {
            desiredUsername =
              desiredUsername + "-" + crypto.randomBytes(2).toString("hex");
          }
          await UserModel.findByIdAndUpdate(updatedUser._id, {
            username: desiredUsername,
          });
        }
      } catch (e) {
        console.error("Error setting username to tgid on USDT approval:", e);
      }

      return res.status(200).json({
        status: true,
        message: "USDT payment approved successfully",
      });
    } catch (err) {
      console.error("Approve USDT payment error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };

  static RejectUSDTPayment = async (req, res) => {
    try {
      let payment = await USDTMembershipPaymentModel.findById(req.query.id);
      if (!payment) {
        return res
          .status(404)
          .json({ status: false, message: "Payment not found" });
      }

      const user = await UserModel.findById(payment.user);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // If already approved, revert the membership
      if (payment.status == 1) {
        const membership = await MembershipModel.findById(
          payment.membership_id,
        );
        const membershipPeriodYears = membership.membershiperiod || 1;
        let enddate = moment(user.enddate)
          .subtract(membershipPeriodYears, "years")
          .format("YYYY-MM-DD");
        await UserModel.findByIdAndUpdate(user._id, {
          enddate: enddate,
        });
      }

      // Update payment status to rejected
      await USDTMembershipPaymentModel.findByIdAndUpdate(payment._id, {
        status: 2,
        paymentstatus: 2,
      });

      await UserModel.findByIdAndUpdate(user._id, {
        paymentstatus: 2,
      });

      return res.status(200).json({
        status: true,
        message: "USDT payment rejected successfully",
      });
    } catch (err) {
      console.error("Reject USDT payment error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };

  static DeleteUSDTPayment = async (req, res) => {
    try {
      let payment = await USDTMembershipPaymentModel.findById(req.query.id);
      if (!payment) {
        return res
          .status(404)
          .json({ status: false, message: "Payment not found" });
      }

      const user = await UserModel.findById(payment.user);
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // If already approved, revert the membership
      if (payment.status == 1) {
        const membership = await MembershipModel.findById(
          payment.membership_id,
        );
        const membershipPeriodYears = membership.membershiperiod || 1;
        let enddate = moment(user.enddate)
          .subtract(membershipPeriodYears, "years")
          .format("YYYY-MM-DD");
        await UserModel.findByIdAndUpdate(user._id, {
          enddate: enddate,
          paymentstatus: 2,
        });
      }

      // Delete payment record
      await USDTMembershipPaymentModel.findByIdAndDelete(req.query.id);

      return res.status(200).json({
        status: true,
        message: "USDT payment deleted successfully",
      });
    } catch (err) {
      console.error("Delete USDT payment error:", err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  };

  // Manual trigger for membership expiry check
  static CheckExpiredMemberships = async (req, res) => {
    try {
      const result = await checkExpiredMemberships();
      return res.status(200).json({
        success: true,
        message: "Membership expiry check completed",
        data: result,
      });
    } catch (error) {
      console.error("Manual membership expiry check failed:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  // ============================= ADVERTISEMENT ADMIN VIEWS =============================

  /**
   * GET /admin/advertisements
   * Render advertisement dashboard
   */
  static advertisementDashboard = async (req, res) => {
    try {
      const AdvertisementModel = (await import("../Models/Advertisement.js"))
        .default;
      const SponsorCreditsModel = (await import("../Models/SponsorCredits.js"))
        .default;

      // Get dashboard data
      const filter = {};
      const totalAds = await AdvertisementModel.countDocuments(filter);
      const activeAds = await AdvertisementModel.countDocuments({
        status: "ACTIVE",
      });
      const completedAds = await AdvertisementModel.countDocuments({
        status: "COMPLETED",
      });

      const ads = await AdvertisementModel.find(filter);
      let totalDisplays = 0;
      let totalClicks = 0;

      ads.forEach((ad) => {
        totalDisplays += ad.viewCount;
        totalClicks += ad.clickCount;
      });

      const completedTransactions = await SponsorCreditsModel.aggregate([
        { $unwind: "$transactions" },
        { $match: { "transactions.status": "COMPLETED" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$transactions.amountUSDT" },
          },
        },
      ]);

      const totalRevenueUSDT =
        completedTransactions.length > 0
          ? completedTransactions[0].totalRevenue
          : 0;

      // Top sponsors
      const topSponsors = await AdvertisementModel.aggregate([
        {
          $group: {
            _id: "$sponsorId",
            activeAds: {
              $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
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
        {
          $group: {
            _id: "$position",
            count: { $sum: 1 },
            displays: { $sum: "$viewCount" },
            clicks: { $sum: "$clickCount" },
          },
        },
      ]);

      const positionData = {};
      adsByPosition.forEach((item) => {
        positionData[item._id] = {
          count: item.count,
          displays: item.displays,
          clicks: item.clicks,
        };
      });

      return res.render("Admin/Advertisement/Dashboard", {
        baseUrl,
        path: "advertisements",
        data: {
          totalAds,
          activeAds,
          completedAds,
          totalDisplays,
          totalClicks,
          overallCTR:
            totalDisplays > 0
              ? ((totalClicks / totalDisplays) * 100).toFixed(2)
              : 0,
          totalRevenueUSDT: totalRevenueUSDT.toFixed(2),
          topSponsors: topSponsors.map((sponsor) => ({
            _id: sponsor._id,
            name:
              sponsor.sponsor.length > 0
                ? `${sponsor.sponsor[0].firstname} ${sponsor.sponsor[0].lastname}`
                : "Unknown",
            activeAds: sponsor.activeAds,
            totalDisplays: sponsor.totalDisplays,
            totalClicks: sponsor.totalClicks,
          })),
          adsByPosition: positionData,
        },
      });
    } catch (error) {
      console.error("Error loading advertisement dashboard:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading dashboard",
        error: error.message,
      });
    }
  };

  /**
   * GET /admin/advertisements/manage
   * Render manage advertisements view
   */
  static manageAdvertisements = async (req, res) => {
    try {
      const AdvertisementModel = (await import("../Models/Advertisement.js"))
        .default;
      const { status, approvalStatus, position, country, page = 1 } = req.query;

      let filter = { deletedAt: null };
      if (status) filter.status = status;
      if (approvalStatus) filter.approvalStatus = approvalStatus;
      if (position) filter.position = position;
      if (country) filter.country = country;

      const limit = 20;
      const skip = (page - 1) * limit;

      const ads = await AdvertisementModel.find(filter)
        .populate("sponsorId", "firstname lastname email tgid")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await AdvertisementModel.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);

      const adsForDisplay = ads.map((ad) => ({
        _id: ad._id,
        sponsor: {
          name: `${ad.sponsorId.firstname} ${ad.sponsorId.lastname}`,
          email: ad.sponsorId.email,
          tgid: ad.sponsorId.tgid,
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
          ad.viewCount > 0
            ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2)
            : 0,
        createdAt: moment(ad.createdAt).format("YYYY-MM-DD HH:mm"),
      }));

      return res.render("Admin/Advertisement/ManageAds", {
        baseUrl,
        path: "advertisements/manage",
        ads: adsForDisplay.map((ad) => ({
          ...ad,
          createdAt: ad.createdAt, // Keep raw date
        })),
        filters: {
          status,
          approvalStatus,
          position,
          country,
        },
        pagination: {
          page: parseInt(page),
          totalPages,
          total,
        },
        moment,
      });
    } catch (error) {
      console.error("Error loading manage advertisements:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading advertisements",
        error: error.message,
      });
    }
  };

  /**
   * GET /admin/advertisements/packages
   * Render manage packages view
   */
  static managePackages = async (req, res) => {
    try {
      const AdvertisementPackageModel = (
        await import("../Models/AdvertisementPackage.js")
      ).default;
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      let packages = await AdvertisementPackageModel.find();

      // Sort packages by explicit position priority (Landing Page first), then by name.
      const positionOrder = { HOME_BANNER: 0, BOTTOM_CIRCLE: 1 };
      function packagePositionPriority(pkg) {
        const posArray = Array.isArray(pkg.positions)
          ? pkg.positions
          : [pkg.positions];
        const orders = (posArray || [])
          .filter(Boolean)
          .map((p) =>
            positionOrder[p] !== undefined ? positionOrder[p] : 999,
          );
        return orders.length ? Math.min(...orders) : 999;
      }

      packages.sort((a, b) => {
        const oa = packagePositionPriority(a);
        const ob = packagePositionPriority(b);
        if (oa !== ob) return oa - ob;
        return (a.name || "").localeCompare(b.name || "");
      });

      // Fetch rates for calculating display credits
      const rates = await AdvertisementRateModel.find().lean();
      const ratesMap = {};
      rates.forEach((rate) => {
        ratesMap[rate.position] = rate.displayCreditRate;
      });

      // Calculate display credits for each package based on position rates
      const packagesWithDisplayCredits = packages.map((pkg) => {
        const pkgObj = pkg.toObject();
        // Get the first position's rate (packages can have multiple positions)
        const position = Array.isArray(pkgObj.positions)
          ? pkgObj.positions[0]
          : pkgObj.positions;
        const rate = ratesMap[position] || 1000; // Default to 1000 if rate not found
        pkgObj.calculatedDisplayCredits = pkgObj.displayCredits * rate;
        return pkgObj;
      });

      return res.render("Admin/Advertisement/ManagePackages", {
        baseUrl,
        path: "advertisements/packages",
        packages: packagesWithDisplayCredits,
        moment,
      });
    } catch (error) {
      console.error("Error loading packages:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading packages",
        error: error.message,
      });
    }
  };

  /**
   * GET /admin/advertisements/packages/create
   * Render create package page
   */
  static createPackagePage = async (req, res) => {
    try {
      return res.render("Admin/Advertisement/PackageCreate", {
        baseUrl,
        path: "advertisements/packages",
      });
    } catch (error) {
      console.error("Error rendering create package page:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading page",
        error: error.message,
      });
    }
  };

  /**
   * GET /admin/advertisement/sponsor/:sponsorId
   * Render sponsor details view
   */
  static sponsorDetails = async (req, res) => {
    try {
      const UserModel = (await import("../Models/User.js")).default;
      const AdvertisementModel = (await import("../Models/Advertisement.js"))
        .default;
      const SponsorCreditsModel = (await import("../Models/SponsorCredits.js"))
        .default;

      const { sponsorId } = req.params;

      const sponsor = await UserModel.findById(sponsorId);
      if (!sponsor) {
        return res.status(404).render("error", {
          baseUrl,
          message: "Sponsor not found",
        });
      }

      const creditInfo = await SponsorCreditsModel.findOne({ sponsorId });
      const advertisements = await AdvertisementModel.find({
        sponsorId,
        deletedAt: null,
      }).sort({ createdAt: -1 });

      return res.render("Admin/Advertisement/SponsorDetails", {
        baseUrl,
        path: "advertisements/sponsor",
        sponsor: {
          _id: sponsor._id,
          firstname: sponsor.firstname,
          lastname: sponsor.lastname,
          email: sponsor.email,
          tgid: sponsor.tgid,
          membertype: sponsor.membertype,
          joindate: moment(sponsor.joindate).format("YYYY-MM-DD"),
        },
        creditInfo: {
          totalCredits: creditInfo ? creditInfo.totalCredits : 0,
          usedCredits: creditInfo ? creditInfo.usedCredits : 0,
          balanceCredits: creditInfo ? creditInfo.balanceCredits : 0,
          transactions: creditInfo ? creditInfo.transactions : [],
        },
        advertisements: advertisements.map((ad) => ({
          _id: ad._id,
          position: ad.position,
          country: ad.country,
          status: ad.status,
          displayCount: ad.displayCount,
          displayUsed: ad.displayUsed,
          viewCount: ad.viewCount,
          clickCount: ad.clickCount,
          ctrPercentage:
            ad.viewCount > 0
              ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2)
              : 0,
          createdAt: moment(ad.createdAt).format("YYYY-MM-DD HH:mm"),
        })),
      });
    } catch (error) {
      console.error("Error loading sponsor details:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading sponsor details",
        error: error.message,
      });
    }
  };

  static manageCreditPayments = async (req, res) => {
    try {
      const AdvertisementCreditPaymentModel = (
        await import("../Models/AdvertisementCreditPayment.js")
      ).default;

      const payments = await AdvertisementCreditPaymentModel.find()
        .sort({ createdAt: -1 })
        .populate("user", "firstname lastname email tgid username")
        .populate("package", "name positions displayCredits priceUSDT");

      const formattedPayments = payments.map((payment) => ({
        _id: payment._id,
        user: payment.user,
        package: payment.package,
        transactionId: payment.transactionId,
        walletAddress: payment.walletAddress,
        amount: payment.amount,
        credits: payment.credits,
        status: payment.status,
        statusLabel:
          payment.status === 0
            ? "Pending"
            : payment.status === 1
              ? "Approved"
              : "Rejected",
        approvalNotes: payment.approvalNotes,
        rejectionReason: payment.rejectionReason,
        createdAt: moment(payment.createdAt).format("YYYY-MM-DD HH:mm"),
      }));

      return res.render("Admin/Advertisement/ManageCreditPayments", {
        baseUrl,
        path: "advertisements/credit-payments",
        payments: formattedPayments,
      });
    } catch (error) {
      console.error("Error loading credit payments:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading credit payments",
        error: error.message,
      });
    }
  };

  // ==================== ADVERTISEMENT RATES/COUPONS ====================

  static manageCouponRates = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      // Get all rates
      let rates = await AdvertisementRateModel.find().lean();

      // Ensure both positions exist
      const positions = ["HOME_BANNER", "BOTTOM_CIRCLE"];
      for (const position of positions) {
        const existingRate = rates.find((r) => r.position === position);
        if (!existingRate) {
          const newRate = await AdvertisementRateModel.create({
            position,
            displayCreditRate: 1000,
            description: `Display credit rate for ${position}`,
            isActive: true,
          });
          rates.push(newRate.toObject());
        }
      }

      return res.render("Admin/Advertisement/ManageCouponRates", {
        baseUrl,
        path: "advertisements/rates",
        rates: rates.sort((a, b) => a.position.localeCompare(b.position)),
        moment,
        loginUser: req.user,
      });
    } catch (error) {
      console.error("Error loading coupon rates:", error);
      return res.status(500).render("error", {
        baseUrl,
        message: "Error loading coupon rates",
        error: error.message,
      });
    }
  };

  // ================= Advertisement Country Configs (Deprecated) ========
  static manageAdCountryConfigs = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };

  static addAdCountryConfig = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };

  static createAdCountryConfig = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };

  static editAdCountryConfig = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };

  static updateAdCountryConfig = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };

  static deleteAdCountryConfig = async (req, res) => {
    req.session.isTost = true;
    req.session.tostMsg =
      "Country configs have been removed. Please use System Configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).";
    req.session.tostBackground = "#ff9f00";
    return res.redirect(`${baseUrl}admin/configuration`);
  };
  static updateCouponRate = async (req, res) => {
    try {
      const AdvertisementRateModel = (
        await import("../Models/AdvertisementRate.js")
      ).default;

      const { rateId, displayCreditRate, description } = req.body;

      // Validate input
      if (!rateId || displayCreditRate === undefined) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      if (displayCreditRate < 1) {
        return res.status(400).json({
          success: false,
          message: "Display credit rate must be at least 1",
        });
      }

      const updatedRate = await AdvertisementRateModel.findByIdAndUpdate(
        rateId,
        {
          displayCreditRate: parseInt(displayCreditRate),
          description: description || "",
        },
        { new: true, runValidators: true },
      );

      if (!updatedRate) {
        return res.status(404).json({
          success: false,
          message: "Rate not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Coupon rate updated successfully",
        data: updatedRate,
      });
    } catch (error) {
      console.error("Error updating coupon rate:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating coupon rate",
        error: error.message,
      });
    }
  };
}

export default AdminController;
