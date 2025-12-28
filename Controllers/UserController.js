import express from "express";
import { Validator } from "node-input-validator";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  validatorError,
  createRandomLink,
  decrypt,
  assets,
  encrypt,
} from "../Common.js";
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import makeDir from "make-dir";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import handlebars from "handlebars";
import nodemailer from "nodemailer";
import { handlePartnerReferral } from "../Utils/partnerHelper.js";
import PartnerUserModel from "../Models/PartnerUser.js";
import SystemModel from "../Models/Systemimage.js";
import UserModel from "../Models/User.js";
import PaypalModel from "../Models/Paypal.js";
import CountryModel from "../Models/Country.js";
import MembershipModel from "../Models/Membership.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import CompanyModel from "../Models/Company.js";
import ChamberModel from "../Models/Chamber.js";
import BackgroundModel from "../Models/Background.js";
import NotificationModel from "../Models/Notification.js";
import BannerModel from "../Models/Banner.js";
import ContactModel from "../Models/Contact.js";
import FolderModel from "../Models/Folder.js";
import ConfigurationModel from "../Models/Configuration.js";
import ContactFolderModel from "../Models/ContactFolder.js";
import ReferralMembershipModel from "../Models/ReferralMembership.js";
import ReferralReportModel from "../Models/ReferralReport.js";
import PaymentConfigurationModel from "../Models/PaymentConfiguration.js";
import ImageModel from "../Models/Image.js";
import moment from "moment";
import mime from "mime";
import mongoose from "mongoose";
import LogoModel from "../Models/Logo.js";
import crypto from "crypto";
import Stripe from "stripe";
import "dotenv/config";
const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]);
// import UserTokenModel from "../Models/UserToken.js"
import user from "../Routes/User.js";
import ReferralMembershipStipePayment from "../Models/ReferralMembershipStipePayment.js";
import AdminNotificationModel from "../Models/AdminNotification.js";
import MembershipStrpiePaymentModel from "../Models/MembershipStripePayment.js";
import PartnerModel from "../Models/Partner.js";

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
const app = express();

class UserController {
  // Utility to generate an 8-character username
  static generateUsername() {
    return crypto.randomBytes(4).toString("hex");
  }

  /**
   * Helper function to find user by username
   * Checks both 'username' and 'freeUsername' fields
   * Priority:
   * 1. Try to find by 'username' (active username)
   * 2. If not found, try 'freeUsername' (permanent username)
   * This ensures:
   * - Free username always works
   * - Premium username only works when membership is active
   * - When premium expires and username reverts to freeUsername, both work
   */
  static async findUserByUsername(usernameToFind) {
    // First try to find by active username
    let user = await UserModel.findOne({ username: usernameToFind });

    // If not found, try freeUsername
    if (!user) {
      user = await UserModel.findOne({ freeUsername: usernameToFind });
    }

    return user;
  }
  // ...............USER-REGISTER...............
  static Register1 = async (req, res) => {
    try {
      var transporter = nodemailer.createTransport({
        host: "tgt-tko-m815.pointdnshere.com",
        port: 587,
        auth: {
          user: "info@addmy.co",
          pass: "noreply@addmy.com",
        },
      });
      // var transporter = nodemailer.createTransport({
      //     host: "sandbox.smtp.mailtrap.io",
      //     port: 2525,
      //     auth: {
      //         user: "6e6cbf25219481",
      //         pass: "b2d9c14a58f35d"
      //     }
      // });
      let mailOptions = {
        from: "info@addmy.co",
        to: "ankit.borad93@gmail.com",
        subject: "Testing purpose email for otp",
        text: `Hello This is your otp:`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        let f;
        if (err) console.log("message", err);
        if (info) {
          console.log("email send successfully:", info);
        }
      });
      // console.log("send");
    } catch (err) {
      console.log(err);
    }
  };

  static Register = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        username: "required|maxLength:16|minLength:5",
        tgid: "required",
        email: "required|email",
        country: "required",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }
      let name1 = await UserModel.findOne({ username: data.username });
      if (name1) {
        return res.status(422).json({
          success: false,
          message: "This Username is Already Taken...",
        });
      }
      let user = await UserModel.findOne({ tgid: data.tgid });
      if (user) {
        return res.status(422).json({
          success: false,
          message: "This User is Already Register...",
        });
      }
      let mail = await UserModel.findOne({ email: data.email });
      if (mail) {
        return res.status(422).json({
          success: false,
          message: "This Email is Already in Use...",
        });
      }
      const { username, email, tgid, country, status } = req.body;
      const doc = new UserModel({
        username: username,
        email: email,
        tgid: tgid,
        country: country,
        status: status,
        // password: hashedPassword,
      });

      const filePath = path.join(__dirname, "/Views/User/email.html");
      const source = fs.readFileSync(filePath, "utf-8").toString();
      const template = handlebars.compile(source);
      try {
        var transporter = nodemailer.createTransport({
          host: "tgt-tko-m815.pointdnshere.com",
          port: 587,
          auth: {
            user: "info@addmy.co",
            pass: "noreply@addmy.com",
          },
        });

        var randomstring = Math.floor(
          Math.random() * (100000 - 999999 + 1) + 999999
        );
        const replacements = {
          username: tgid,
          password: randomstring,
          message:
            "Hello  \n Greetings from addmy.co \n You have successfully registered to our portal and ready to create your digital contact card. \n Please use below details to login",
        };
        let htmltoSend = template(replacements);
        let sendMail = await transporter.sendMail({
          from: "info@addmy.co",
          to: req.body.email,
          subject: "You have Registered successfully",
          html: htmltoSend,
        });
      } catch (error) {}
      var countrycount = await UserModel.find({
        country: data.country,
      }).count();
      var srt2 = countrycount + 1;
      var srt = srt2.toString();
      var srt1 = "000000000000";
      var id = req.body.countryCode + "-" + srt1.slice(0, -srt.length) + srt;
      const result = await doc.save();
      const salt = await bcrypt.genSalt(10);
      const passwordToString = randomstring.toString();
      const hashedPassword = await bcrypt.hash(passwordToString, salt);
      await UserModel.findByIdAndUpdate(
        { _id: result._id },
        {
          password: hashedPassword,
          memberid: id,
        }
      );
      const result1 = await UserModel.findById(result._id);
      return res.status(200).json({
        success: true,
        data: result1,
        message: "Register successfully...",
      });
    } catch (error) {}
  };

  // ...................USERNAME....................
  static Username = async (req, res) => {
    try {
      let username = UserController.generateUsername();
      return res.status(200).json({
        success: true,
        username: username,
      });
    } catch (error) {}
  };

  static Login = async (req, res) => {
    var data = req.body;
    let validator = new Validator(data, {
      username: "required",
      password: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    }
    let accessTokenSecret = process.env["JWT_SECRET_KEY"];
    let accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
    let user = await UserModel.findOne({ tgid: data.username });
    if (!user) {
      return res.status(422).json({
        success: false,
        message: "User not found...",
      });
    } else {
      let match = bcrypt.compareSync(data.password, user.password);
      if (!match) {
        return res.status(422).json({
          success: false,
          message: "Your Password May Be Wrong...",
        });
      }
      let payload = {
        id: user._id,
        username: data.username,
        userId: accessTokenLife,
      };
      let accessToken = await jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });
      await UserModel.findByIdAndUpdate(
        { _id: user._id },
        {
          token: accessToken,
          fcmtoken: req.body.fcmtoken,
        }
      );
      req.session.token = accessToken;
      // console.log("req.session", req.session.token);
      let user1 = await UserModel.findById(user._id);
      return res.status(200).json({
        success: true,
        data: user1,
        message: "AddProfile Login Successfully...",
      });
    }
  };

  static TelegramLogin = async (req, res) => {
    var data = req.body;
    let validator = new Validator(data, {
      telegram_username: "required",
      country: "required",
      countryCode: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    }
    let user = await UserModel.findOne({ tgid: data.telegram_username });
    if (!user) {
      // Extract referral code if provided
      const referralCode =
        data.partnercode || data.referralCode || data.ref || null;

      // get partner from code and check if has user user credit left
      const partnerUser = await PartnerModel.findOne({
        referralCode: referralCode,
      });
      if (referralCode && !partnerUser) {
        return res.status(422).json({
          success: false,
          message: "Invalid referral code.",
        });
      }
      if (partnerUser) {
        const leftCredit =
          partnerUser.userCredits - partnerUser.usedUserCredits;
        if (referralCode && leftCredit <= 0) {
          return res.status(422).json({
            success: false,
            message: "Partner has no remaining user credits.",
          });
        }
      }
      // Check configuration for Telegram signup user type
      let telegramPremiumSetting = await ConfigurationModel.findOne({
        ConfigKey: "telegram_signup_premium",
      });
      let isPremium =
        telegramPremiumSetting && telegramPremiumSetting.ConfigValue === "1";
      if (referralCode) {
        isPremium = true;
      }

      // Always generate a random username for freeUsername
      var generatedUsername = UserController.generateUsername();

      // Ensure the generated username is unique
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) {
          isUnique = true;
        } else {
          generatedUsername = UserController.generateUsername();
        }
      }

      // Generate memberid
      var countrycount = await UserModel.find({
        country: data.country,
      }).count();
      var srt2 = countrycount + 1;
      var srt = srt2.toString();
      var srt1 = "000000000000";
      var countryCode = data.countryCode;
      var id = countryCode + "-" + srt1.slice(0, -srt.length) + srt;

      // Determine the active username based on premium status
      let activeUsername = generatedUsername; // default to free username
      if (isPremium) {
        // For premium users, try to use tgid as username
        const conflict = await UserModel.findOne({
          username: data.telegram_username,
        });
        if (!conflict) {
          activeUsername = data.telegram_username;
        } else {
          // If tgid conflicts, append suffix
          activeUsername =
            data.telegram_username +
            "-" +
            crypto.randomBytes(2).toString("hex");
        }
      }
      let paymentBy = 10;
      if (isPremium && partnerUser) {
        paymentBy = 4;
      }

      const doc = new UserModel({
        username: activeUsername, // Active username (premium = tgid, free = random)
        freeUsername: generatedUsername, // Always store the random username
        tgid: data.telegram_username,
        country: data.country,
        countryCode: countryCode,
        membertype: isPremium ? "premium" : "free",
        membershiperiod: isPremium ? "12" : undefined, // 1 year in months for premium
        joindate: new Date().toISOString(),
        startdate: isPremium
          ? new Date().toISOString().split("T")[0]
          : undefined,
        enddate: isPremium
          ? new Date(new Date().setFullYear(new Date().getFullYear() + 1))
              .toISOString()
              .split("T")[0]
          : undefined,
        usertype: isPremium ? 1 : 0,
        memberid: id,
        paymentBy: paymentBy,
      });
      const result = await doc.save();

      // Handle partner referral if referral code provided
      let partnerMessage = "";
      if (referralCode) {
        const referralResult = await handlePartnerReferral(
          referralCode,
          result
        );
        if (referralResult.success) {
          partnerMessage = ` You have been successfully linked to a partner.`;
        } else {
          partnerMessage = ` ${referralResult.message}`;
        }
      }

      // Create membership record only for premium
      // if (isPremium) {
      //   const membership = new MembershipModel({
      //     membershiperiod: 12, // 1 year
      //     date: new Date(),
      //   });
      //   await membership.save();
      // }
      // Generate token
      let payload = {
        id: result._id,
        username: activeUsername,
      };
      let accessToken = await jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });
      await UserModel.findByIdAndUpdate(
        { _id: result._id },
        {
          token: accessToken,
        }
      );
      // If the user was linked to a partner via referral, mark their first login
      try {
        const partnerUsers = await PartnerUserModel.find({ user: result._id });
        if (partnerUsers && partnerUsers.length > 0) {
          for (const pu of partnerUsers) {
            if (pu.isFirstLogin) {
              pu.isFirstLogin = false;
              pu.firstLoginAt = new Date();
            }
            pu.lastLoginAt = new Date();
            pu.loginCount = (pu.loginCount || 0) + 1;
            await pu.save();
          }
        }
      } catch (e) {
        console.error("Error updating PartnerUser login on registration:", e);
      }
      let user1 = await UserModel.findById(result._id);
      return res.status(200).json({
        success: true,
        data: user1,
        message: isPremium
          ? `Welcome! You have been rewarded free premium membership for 1 year.${partnerMessage}`
          : `Welcome! You have been registered as a free user.${partnerMessage}`,
      });
    } else {
      // Existing user, just login
      let payload = {
        id: user._id,
        username: data.telegram_username,
      };
      let accessToken = await jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });
      await UserModel.findByIdAndUpdate(
        { _id: user._id },
        {
          token: accessToken,
          fcmtoken: req.body.fcmtoken,
        }
      );
      let user1 = await UserModel.findById(user._id);

      // Handle partner referral if partnercode provided for existing user
      let partnerMessage = "";
      if (data.partnercode) {
        const referralResult = await handlePartnerReferral(
          data.partnercode,
          user
        );
        if (referralResult.success) {
          partnerMessage = " You have been successfully linked to a partner.";
        } else {
          partnerMessage = ` ${referralResult.message}`;
        }
      }

      // Update partner-user login tracking if user is linked to any partner
      try {
        const partnerUsers = await PartnerUserModel.find({ user: user._id });
        if (partnerUsers && partnerUsers.length > 0) {
          for (const pu of partnerUsers) {
            if (pu.isFirstLogin) {
              pu.isFirstLogin = false;
              pu.firstLoginAt = new Date();
            }
            pu.lastLoginAt = new Date();
            pu.loginCount = (pu.loginCount || 0) + 1;
            await pu.save();
          }
        }
      } catch (e) {
        console.error("Error updating PartnerUser login on login:", e);
      }
      return res.status(200).json({
        success: true,
        data: user1,
        message: `Login successful.${partnerMessage}`,
      });
    }
  };

  static Language = async (req, res) => {
    const user = await UserModel.findById(req.user._id);
    let language = await UserModel.findByIdAndUpdate(user._id, {
      languagetype: req.body.languagetype,
    });
    return res.status(200).json({
      success: true,
    });
  };

  static ForgotPassword = async (req, res) => {
    let data = req.body;
    let validator = new Validator(data, {
      email: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    }
    var email = req.body.email;
    if (email.indexOf("@") == -1) {
      var users = await UserModel.findOne({ username: req.body.email });
      var message = "Your User Name may be wrong...";
    } else {
      var users = await UserModel.findOne({ email: req.body.email });
      var message = "Your email may be wrong...";
    }
    if (!users) {
      return res.status(422).json({
        success: false,
        message: message,
      });
    }
    const filePath = path.join(__dirname, "/Views/User/email.html");
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = handlebars.compile(source);
    var transporter = nodemailer.createTransport({
      host: "tgt-tko-m815.pointdnshere.com",
      port: 587,
      auth: {
        user: "info@addmy.co",
        pass: "noreply@addmy.com",
      },
    });

    var randomstring = Math.floor(
      Math.random() * (100000 - 999999 + 1) + 999999
    );
    const replacements = {
      username: users.tgid,
      password: randomstring,
      message:
        "We have received your request to reset your password.\n Please find your new login details as below",
    };

    let htmltoSend = template(replacements);
    let info = await transporter.sendMail({
      from: "info@addmy.co",
      to: req.body.email,
      subject: "Your password request on addmy.co",
      html: htmltoSend,
    });

    const salt = await bcrypt.genSalt(10);
    const passwordToString = randomstring.toString();
    const hashedPassword = await bcrypt.hash(passwordToString, salt);
    const result = await UserModel.findByIdAndUpdate(
      { _id: users._id },
      {
        password: hashedPassword,
      }
    );
    const result1 = await UserModel.findById(result._id);
    return res.status(200).json({
      success: true,
      data: result1,
    });
  };

  // ......................USERSPROFILE......................
  static AddProfile = async (req, res) => {
    var data = req.body;
    data.profile_image = req.files?.profile_image;
    data.video = req.files?.video;
    let validator = new Validator(data, {
      owner_name_english: "required",
      owner_name_chinese: "required",
      telegramId: "required",
      contact: "required",
      address1: "required",
      address2: "required",
      address3: "required",
    });
    console.log("validator", validator);
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    }
    let mail = await UserModel.findOne({ email: data.email });
    const path = await makeDir("./assets/profileimage/");
    let pic = await UserModel.findById(req.user._id);
    const doc = {
      owner_name_english: req.body.owner_name_english,
      owner_name_chinese: req.body.owner_name_chinese,
      telegramId: req.body.telegramId,
      email: req.body.email,
      contact: req.body.contact,
      address1: req.body.address1,
      address2: req.body.address2,
      address3: req.body.address3,
      WhatsApp: req.body.WhatsApp,
      WeChat: req.body.WeChat,
      Line: req.body.Line,
      Instagram: req.body.Instagram,
      Facebook: req.body.Facebook,
      Twitter: req.body.Twitter,
      Youtube: req.body.Youtube,
      Linkedin: req.body.Linkedin,
      SnapChat: req.body.SnapChat,
      Skype: req.body.Skype,
      TikTok: req.body.TikTok,
      user_id: req.user._id,
    };
    // .....image......

    if (
      req.files?.profile_image !== undefined &&
      req.files?.profile_image !== null
    ) {
      let photo = path + "/" + req.files?.profile_image;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      let profile_image = req.files?.profile_image;
      var d = new Date();
      photo = profile_image.name;
      photo = photo.replace(/\s/g, " ");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadPath = path + "/" + imname;
      profile_image.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      doc["profile_image"] = "profileimage/" + imname;
    }

    //....................video................
    if (req.files?.video != undefined && req.files?.video != null) {
      let photo = path + "/" + req.files?.video;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      let video = req.files?.video;
      var d = new Date();
      photo = video.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadPath = path + "/" + imname;
      video.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      doc["video"] = "profileimage/" + imname;
    }
    const result = await UserModel.findByIdAndUpdate(req.user._id, doc);
    let user = await UserModel.findByIdAndUpdate(result._id, {
      profilestatus: 1,
    });
    let data1 = await UserModel.findById(user._id);
    return res.status(200).json({
      success: true,
      data: data1,
      message: "Data Added Successfully...",
    });
  };

  static UpdateProfile = async (req, res) => {
    var data = req.body;
    data.profile_image = req.files?.profile_image;
    data.video = req.files?.video;
    let validator = new Validator(data, {
      owner_name_english: "required",
      owner_name_chinese: "required",
      telegramId: "required",
      address1: "required",
      address2: "required",
      address3: "required",
    });
    console.log("update api called");
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const path = await makeDir("./assets/profileimage/");
      // resolve target id: if params.id is a valid ObjectId use it, otherwise fall back to authenticated user
      const targetId = mongoose.Types.ObjectId.isValid(req.params.id)
        ? req.params.id
        : req.user._id;
      let pic = await UserModel.findById(targetId);
      const doc = {
        username: req.body.username,
        owner_name_english: req.body.owner_name_english,
        owner_name_chinese: req.body.owner_name_chinese,
        telegramId: req.body.telegramId,
        email: req.body.email || "",
        contact: req.body.contact || "",
        address1: req.body.address1 || "",
        address2: req.body.address2 || "",
        address3: req.body.address3 || "",
        WhatsApp: req.body.WhatsApp || "",
        WeChat: req.body.WeChat || "",
        Line: req.body.Line || "",
        Instagram: req.body.Instagram || "",
        Facebook: req.body.Facebook || "",
        Twitter: req.body.Twitter || "",
        Youtube: req.body.Youtube || "",
        Linkedin: req.body.Linkedin || "",
        SnapChat: req.body.SnapChat || "",
        Skype: req.body.Skype || "",
        TikTok: req.body.TikTok || "",
        tags: req.body.tags,
        user_id: req.user._id,
        // image: imagename
      };

      // .................image.....................
      if (req.files?.profile_image != undefined) {
        let photo = path + "/" + req.files?.profile_image;
        if (fs.existsSync(photo)) fs.unlinkSync(photo);
        let profile_image = req.files?.profile_image;
        var d = new Date();
        photo = profile_image.name;
        photo = photo.replace(/\s/g, "");
        let r = (Math.random() + 1).toString(36).substring(7);
        var imname = d.getSeconds() + "." + r + "." + photo;
        let uploadPath = path + "/" + imname;
        profile_image.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
        });
        doc["profile_image"] = "profileimage/" + imname;
        doc["video"] = "";
      }

      //...video......
      if (req.files?.video != undefined) {
        let photo = path + "/" + req.files?.video;
        if (fs.existsSync(photo)) fs.unlinkSync(photo);
        let video = req.files?.video;
        var d = new Date();
        photo = video.name;
        photo = photo.replace(/\s/g, "");
        let r = (Math.random() + 1).toString(36).substring(7);
        var imname = d.getSeconds() + "." + r + "." + photo;
        let uploadPath = path + "/" + imname;
        video.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
        });
        doc["video"] = "profileimage/" + imname;
        doc["profile_image"] = "";
      }
      const result = await UserModel.findByIdAndUpdate(targetId, doc);
      console.log("123", result);
      const user1 = await UserModel.findById(result._id);
      let usercontact1 = await ContactModel.find({
        status: 1,
        contact_id: req.user._id,
      });
      for (var i = 0; i < usercontact1.length; i++) {
        var contact_id = usercontact1[i].contact_id;
        var user_id = usercontact1[i].user_id;
        const doc = {
          user_id: user_id,
          contact_id: contact_id,
          message: `${req.user.owner_name_english} has changed their Profile data`,
        };
        let notification = await NotificationModel.create(doc);
      }
      return res.status(200).json({
        success: true,
        data: user1,
        message: "Data Updated Successfully...",
      });
    }
  };

  static GetProfile = async (req, res) => {
    let logoDetails = await LogoModel.findOne();
    let profile = await UserModel.aggregate([
      {
        $match: {
          _id: req.user._id,
        },
      },
      {
        $lookup: {
          from: "backgrounds",
          localField: "_id",
          foreignField: "user_id",
          as: "theme",
        },
      },
      { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "user_id",
          as: "companydata",
        },
      },
      { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } },
    ]);

    if (logoDetails) {
      profile[0]["logoImage"] = logoDetails.Banner;
      profile[0]["logoTelegramUrl"] = logoDetails.Link;
    } else {
      profile[0]["logoImage"] = "";
      profile[0]["logoTelegramUrl"] = "";
    }
    if (profile[0]["profile_image"] != "") {
      profile[0]["profile_image"] =
        baseUrl + "assets/" + profile[0]["profile_image"];
      profile[0]["video"] = "";
    }
    if (profile[0]["video"] != "") {
      profile[0]["video"] = baseUrl + "assets/" + profile[0]["video"];
      profile[0]["profile_image"] = "";
    }
    if (!profile[0]["refstatue"]) {
      profile[0]["refstatue"] = 0;
    }
    if (!profile[0]["refimgstatue"]) {
      profile[0]["refimgstatue"] = 0;
    }
    if (!profile[0]["logoImage"]) {
      profile[0]["logoImage"] = "";
    }
    if (!profile[0]["logoTelegramUrl"]) {
      profile[0]["logoTelegramUrl"] = "";
    }
    // Attach partner info if available
    try {
      const partnerUser = await PartnerUserModel.findOne({
        user: req.user._id,
      }).populate("partner");
      if (partnerUser && partnerUser.partner) {
        // Attach limited partner info to profile
        profile[0]["partner"] = {
          _id: partnerUser.partner._id,
          referralCode: partnerUser.partner.referralCode,
          username: partnerUser.partner.username,
          tgid: partnerUser.partner.tgid,
          country: partnerUser.partner.country,
        };
        // Optional: include partner-user relation info
        profile[0]["partnerRelation"] = {
          joinDate: partnerUser.joinDate,
          membershipExpiryDate: partnerUser.membershipExpiryDate,
          renewalCount: partnerUser.renewalCount,
        };
      }
    } catch (err) {
      console.error("Error fetching partner info for profile:", err);
    }
    return res.status(200).json({
      success: true,
      data: profile[0],
    });
  };

  static Getprofile = async (req, res) => {
    // Find user by username (checks both username and freeUsername)
    const user = await UserController.findUserByUsername(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: "",
      });
    }

    let profile = await UserModel.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $lookup: {
          from: "backgrounds",
          localField: "_id",
          foreignField: "user_id",
          as: "theme",
        },
      },
      { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "user_id",
          as: "companydata",
        },
      },
      { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } },
    ]);
    if (profile != "") {
      if (profile[0]["profile_image"] != "") {
        profile[0]["profile_image"] =
          baseUrl + "assets/" + profile[0]["profile_image"];
        profile[0]["video"] = "";
      }
      if (profile[0]["video"] != "") {
        profile[0]["video"] = baseUrl + "assets/" + profile[0]["video"];
        profile[0]["profile_image"] = "";
      }
      var profiledata = profile[0];
    } else {
      var profiledata = "";
    }
    console.log("Profile", profile);

    return res.status(200).json({
      success: true,
      data: profiledata,
    });
  };

  static Getprofiles = async (req, res) => {
    // Find user by username (checks both username and freeUsername)
    const user = await UserController.findUserByUsername(req.body.username);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: "",
      });
    }

    let profile = await UserModel.aggregate([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $lookup: {
          from: "backgrounds",
          localField: "_id",
          foreignField: "user_id",
          as: "theme",
        },
      },
      { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "user_id",
          as: "companydata",
        },
      },
      { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } },
    ]);
    if (profile != "") {
      if (profile[0]["profile_image"] != "") {
        profile[0]["profile_image"] =
          baseUrl + "assets/" + profile[0]["profile_image"];
        profile[0]["video"] = "";
      }
      if (profile[0]["video"] != "") {
        profile[0]["video"] = baseUrl + "assets/" + profile[0]["video"];
        profile[0]["profile_image"] = "";
      }
      var profiledata = profile[0];
    } else {
      var profiledata = "";
    }
    console.log("Profile", profile);

    return res.status(200).json({
      success: true,
      data: profiledata,
    });
  };

  static DeleteProfile = async (req, res) => {
    let profile1 = await UserModel.findById(req.params.id);
    const path = await makeDir("./assets/profileimage/");
    if (profile1.image) {
      const url = profile1.image;
      let filename = new URL(url).pathname.split("/").pop();
      let image = path + "/" + filename;
      if (fs.existsSync(image)) fs.unlinkSync(image);
    }
    let profile = await UserModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Data Deleted Successfully...",
    });
  };

  static Landingpage = async (req, res) => {
    let company = await UserModel.aggregate([
      {
        $match: {
          _id: req.user._id,
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "user_id",
          as: "userDoc",
        },
      },
    ]);
    if (
      company[0]["profile_image"] != "" &&
      company[0]["profile_image"] != undefined &&
      company[0]["profile_image"] != null
    ) {
      company[0]["profile_image"] =
        baseUrl + "assets/" + company[0]["profile_image"];
      company[0]["video"] = "";
    }
    if (
      company[0]["video"] != "" &&
      company[0]["video"] != undefined &&
      company[0]["video"] != null
    ) {
      company[0]["video"] = baseUrl + "assets/" + company[0]["video"];
      company[0]["profile_image"] = "";
    }
    return res.status(200).json({
      success: true,
      data: company,
    });
  };

  static GetLandingpage = async (req, res) => {
    // Find user by username (checks both username and freeUsername)
    let user = await UserController.findUserByUsername(req.body.username);
    if (user) {
      let company = await UserModel.aggregate([
        {
          $match: {
            _id: user._id,
          },
        },
        {
          $lookup: {
            from: "companies",
            localField: "_id",
            foreignField: "user_id",
            as: "userDoc",
          },
        },
        {
          $lookup: {
            from: "backgrounds",
            localField: "_id",
            foreignField: "user_id",
            as: "theme",
          },
        },
        { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      ]);
      if (company[0]["profile_image"] != "") {
        company[0]["profile_image"] =
          baseUrl + "assets/" + company[0]["profile_image"];
        company[0]["video"] = "";
      }
      if (company[0]["video"] != "") {
        company[0]["video"] = baseUrl + "assets/" + company[0]["video"];
        company[0]["profile_image"] = "";
      }
      if (company) {
        return res.status(200).json({
          success: true,
          data: company,
        });
      } else {
        return res.status(422).json({
          success: false,
          message: "Record not found...",
        });
      }
    } else {
      return res.status(422).json({
        success: false,
        message: "User not found...",
      });
    }
  };

  // Public API: get background + theme + font for a given username
  static GetUserBackground = async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res
          .status(422)
          .json({ success: false, message: "username is required" });
      }
      // Find user by username (checks both username and freeUsername)
      const user = await UserController.findUserByUsername(username);
      if (!user) {
        return res
          .status(422)
          .json({ success: false, message: "User not found" });
      }
      const theme = await BackgroundModel.findOne({ user_id: user._id });
      const result = {
        background_image: "",
        theme_color: "",
        font_color: "",
      };
      if (theme) {
        if (theme.Thumbnail && theme.Thumbnail != "") {
          // if stored as full URL use it, otherwise prefix with assets path
          result.background_image =
            theme.Thumbnail.startsWith("http") ||
            theme.Thumbnail.startsWith("/")
              ? theme.Thumbnail
              : baseUrl + "assets/" + theme.Thumbnail;
        }
        result.theme_color = theme.backgroundcolor || "";
        result.font_color = theme.fontcolor || "";
      }
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("GetUserBackground error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static Companyprofile = async (req, res) => {
    var data = req.body;

    data.image = req.files?.image;
    let validator = new Validator(data, {
      company_name_english: "required",
      company_name_chinese: "required",
      companydesignation: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const path = await makeDir("./assets/companyprofile/");
      let pic = await UserModel.findById(req.user._id);
      // determine company_order: use provided value or auto-increment from max existing for this user
      let companyOrder;
      if (
        req.body.company_order !== undefined &&
        req.body.company_order !== ""
      ) {
        companyOrder = Number(req.body.company_order);
      } else {
        const last = await CompanyModel.findOne({ user_id: req.user._id })
          .sort({ company_order: -1 })
          .select("company_order")
          .lean();
        companyOrder =
          last && last.company_order ? Number(last.company_order) + 1 : 1;
      }

      const doc = {
        company_name_english: req.body.company_name_english,
        company_name_chinese: req.body.company_name_chinese,
        companydesignation: req.body.companydesignation,
        description: req.body.description,
        email: req.body.email,
        WhatsApp: req.body.WhatsApp,
        WeChat: req.body.WeChat,
        Line: req.body.Line,
        Instagram: req.body.Instagram,
        Facebook: req.body.Facebook,
        Twitter: req.body.Twitter,
        Youtube: req.body.Youtube,
        Linkedin: req.body.Linkedin,
        SnapChat: req.body.SnapChat,
        Skype: req.body.Skype,
        TikTok: req.body.TikTok,
        telegramId: req.body.telegramId,
        contact: req.body.contact,
        fax: req.body.fax,
        website: req.body.website,
        fanpage: req.body.fanpage,
        company_order: companyOrder,
        user_id: req.user._id,
        // video: imagename
      };

      // Handle up to 3 files: file1 is required, file2/file3 optional.
      // Backwards-compatible: if file1 is omitted, accept legacy `image` or `video` as file1.
      const incomingFiles = [];
      for (let i = 1; i <= 3; i++) {
        let f = req.files?.[`file${i}`];
        if (!f && i === 1) {
          // fall back to legacy single-file fields
          if (req.files?.image) f = req.files.image;
          else if (req.files?.video) f = req.files.video;
        }
        if (!f) continue;
        // If middleware returned array for a single field, take first file
        if (Array.isArray(f)) f = f[0];
        incomingFiles.push(f);
      }

      if (incomingFiles.length === 0) {
        return res.status(422).json({
          success: false,
          message: "Please upload at least one file (file1 is required).",
        });
      }

      const images = [];
      const videos = [];
      for (const file of incomingFiles) {
        const d = new Date();
        const safeName = file.name.replace(/\s/g, "");
        const r = (Math.random() + 1).toString(36).substring(7);
        const imname = d.getSeconds() + "." + r + "." + safeName;
        const uploadPath = path + "/" + imname;
        try {
          await new Promise((resolve, reject) =>
            file.mv(uploadPath, (err) => (err ? reject(err) : resolve()))
          );
        } catch (err) {
          console.error("Failed to save uploaded file:", err);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save uploaded file" });
        }
        const mtype = file.mimetype || mime.getType(safeName) || "";
        if (String(mtype).startsWith("image")) {
          images.push("companyprofile/" + imname);
        } else if (String(mtype).startsWith("video")) {
          videos.push("companyprofile/" + imname);
        } else {
          return res
            .status(422)
            .json({
              success: false,
              message: "Unsupported file type: " + safeName,
            });
        }
      }

      // Ensure total attachments (images + videos) does not exceed 3
      if (images.length + videos.length > 3) {
        return res
          .status(422)
          .json({ success: false, message: "Maximum 3 files allowed" });
      }

      if (images.length) doc.images = images;
      if (videos.length) doc.videos = videos;
      // keep legacy single `image` / `video` fields for compatibility
      if (images.length) doc.image = images[0];
      if (videos.length) doc.video = videos[0];

      let result = await CompanyModel.create(doc);
      let user = await UserModel.findByIdAndUpdate(req.user._id, {
        companystatus: 1,
      });
      let data = await CompanyModel.findById(result._id);

      // Send notification to all users who have added this user to their contacts
      try {
        const currentUser = await UserModel.findById(req.user._id);
        // Find all contacts where contact_id is the current user (people who added me)
        // and user_id is NOT the current user (don't notify myself)
        const myFollowers = await ContactModel.find({
          contact_id: req.user._id,
          user_id: { $ne: req.user._id },
          status: 1,
        });

        for (const follower of myFollowers) {
          const notificationDoc = {
            user_id: follower.user_id,
            contact_id: req.user._id,
            message: `${
              currentUser.owner_name_english || currentUser.username
            } has added a new company profile`,
          };
          await NotificationModel.create(notificationDoc);
        }
      } catch (notifError) {
        console.error(
          "Error sending company creation notifications:",
          notifError
        );
        // Don't fail the request if notification fails
      }

      return res.status(200).json({
        success: true,
        data: data,
        message: "Data Added Successfully..",
      });
    }
  };

  static Updatecompanyprofile = async (req, res) => {
    try {
      await makeDir("./assets/companyprofile/");

      const body = req.body || {};

      const companyId = body._id;
      if (!companyId) {
        return res.status(422).json({
          success: false,
          message: "_id (company id) is required in form fields",
        });
      }

      // Build update document from allowed fields
      const allowed = [
        "company_name_english",
        "company_name_chinese",
        "companydesignation",
        "description",
        "email",
        "WhatsApp",
        "WeChat",
        "Line",
        "Instagram",
        "Facebook",
        "Twitter",
        "Youtube",
        "Linkedin",
        "SnapChat",
        "Skype",
        "TikTok",
        "telegramId",
        "contact",
        "fax",
        "website",
        "fanpage",
        "company_order",
        "user_id",
      ];
      const doc = {};
      for (const k of allowed) {
        if (typeof body[k] !== "undefined") doc[k] = body[k];
      }

      // Reject if image/video fields are provided as base64/data URIs in form fields
      if (
        body.image &&
        (String(body.image).includes("base64") ||
          String(body.image).startsWith("data:"))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please upload image as a file (multipart/form-data). Do not send base64/data URIs.",
        });
      }
      if (
        body.video &&
        (String(body.video).includes("base64") ||
          String(body.video).startsWith("data:"))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please upload video as a file (multipart/form-data). Do not send base64/data URIs.",
        });
      }

      // Handle up to 3 files: file1, file2, file3 (all optional here). Fall back to legacy fields if provided.
      // Load existing attachments so we can enforce a maximum of 3 total attachments
      let existing = null;
      try {
        existing = await CompanyModel.findById(companyId).lean();
      } catch (e) {
        console.error(
          "Failed to load existing company for attachments check:",
          e
        );
      }
      const existingImages =
        (existing &&
          (existing.images || (existing.image ? [existing.image] : []))) ||
        [];
      const existingVideos =
        (existing &&
          (existing.videos || (existing.video ? [existing.video] : []))) ||
        [];

      const incomingFiles = [];
      for (let i = 1; i <= 3; i++) {
        let f = req.files?.[`file${i}`];
        if (!f && i === 1) {
          if (req.files?.image) f = req.files.image;
          else if (req.files?.video) f = req.files.video;
        }
        if (!f) continue;
        if (Array.isArray(f)) f = f[0];
        incomingFiles.push(f);
      }

      const newImages = [];
      const newVideos = [];
      for (const file of incomingFiles) {
        const d = new Date();
        const safeName = file.name.replace(/\s/g, "");
        const r = (Math.random() + 1).toString(36).substring(7);
        const imname = d.getSeconds() + "." + r + "." + safeName;
        const uploadPath = "./assets/companyprofile/" + imname;
        try {
          await new Promise((resolve, reject) =>
            file.mv(uploadPath, (err) => (err ? reject(err) : resolve()))
          );
        } catch (e) {
          console.error("Failed to save uploaded company file:", e);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save uploaded file" });
        }
        const mtype = file.mimetype || mime.getType(safeName) || "";
        if (String(mtype).startsWith("image"))
          newImages.push("companyprofile/" + imname);
        else if (String(mtype).startsWith("video"))
          newVideos.push("companyprofile/" + imname);
        else
          return res
            .status(422)
            .json({
              success: false,
              message: "Unsupported file type: " + safeName,
            });
      }

      // enforce max 3 attachments total
      if (
        existingImages.length +
          existingVideos.length +
          newImages.length +
          newVideos.length >
        3
      ) {
        return res
          .status(422)
          .json({
            success: false,
            message: "Maximum 3 total attachments allowed (images + videos)",
          });
      }

      if (newImages.length) doc.images = existingImages.concat(newImages);
      if (newVideos.length) doc.videos = existingVideos.concat(newVideos);
      // keep legacy single `image` / `video` fields pointing at first items for backward compatibility
      const finalImages = doc.images || existingImages || [];
      const finalVideos = doc.videos || existingVideos || [];
      if (finalImages.length) doc.image = finalImages[0];
      if (finalVideos.length) doc.video = finalVideos[0];

      // Update the company document
      try {
        await CompanyModel.findByIdAndUpdate(companyId, doc, {
          new: true,
          upsert: false,
        });
      } catch (e) {
        console.error(`Failed to update company ${companyId}:`, e);
        return res
          .status(500)
          .json({ success: false, message: "Failed to update company" });
      }

      // Notify contacts about the change (preserve existing behavior)
      let usercontact1 = await ContactModel.find({
        status: 1,
        contact_id: req.user._id,
      });
      for (var i = 0; i < usercontact1.length; i++) {
        var contact_id = usercontact1[i].contact_id;
        var user_id = usercontact1[i].user_id;
        const ndoc = {
          user_id: user_id,
          contact_id: contact_id,
          message: `${req.user.owner_name_english} has changed their company data`,
        };
        try {
          await NotificationModel.create(ndoc);
        } catch (e) {
          console.error("Failed creating company update notification:", e);
        }
      }

      return res
        .status(200)
        .json({ success: true, message: "Data Updated Successfully..." });
    } catch (error) {
      console.error("Updatecompanyprofile error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static video = async (req, res) => {
    try {
      let data = req.body;
      data.video = req.files?.video;
      const path = await makeDir("./assets/video/");
      let video = req.files?.video;
      var d = new Date();
      photo = video.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadphotoPath = path + "/" + imname;
      video.mv(uploadphotoPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      data["video"] = "video/" + imname;
      video = "video/" + imname;
      var photo = [
        {
          video: video,
        },
      ];
      return res.status(200).json({
        success: true,
        data: photo,
      });
    } catch (error) {}
  };

  static companyprofile = async (req, res) => {
    console.log("req.user._id", req.user._id);
    let company = await CompanyModel.find({ user_id: req.user._id });
    console.log("company", company);
    return res.status(200).json({
      success: true,
      data: company,
    });
  };

  static GetCompany = async (req, res) => {
    // Find user by username (checks both username and freeUsername)
    let user = await UserController.findUserByUsername(req.body.username);
    if (user) {
      let company = await CompanyModel.find({ user_id: user._id });
      if (company) {
        return res.status(200).json({
          success: true,
          data: company,
        });
      } else {
        return res.status(422).json({
          success: false,
          message: "Record not found...",
        });
      }
    } else {
      return res.status(422).json({
        success: false,
        message: "User not found...",
      });
    }
  };

  static Deletecompanyprofile = async (req, res) => {
    const id = req.params.id;
    if (!id) {
      return res.status(422).json({
        success: false,
        message: "Company ID is required...",
      });
    }
    let company1 = await CompanyModel.findById(id);
    if (!company1) {
      return res.status(404).json({
        success: false,
        message: "Company not found...",
      });
    }
    const folderPath = await makeDir("./assets/companyprofile/");
    // Delete any stored attachments (legacy single fields + arrays)
    const toDelete = [];
    if (company1.video) toDelete.push(company1.video);
    if (company1.image) toDelete.push(company1.image);
    if (Array.isArray(company1.images)) toDelete.push(...company1.images);
    if (Array.isArray(company1.videos)) toDelete.push(...company1.videos);
    for (const url of toDelete) {
      try {
        let filename = new URL(url).pathname.split("/").pop();
        let filePath = folderPath + "/" + filename;
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Error deleting attachment", url, e);
      }
    }

    let company = await CompanyModel.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Data Deleted Successfully...",
    });
  };

  static DeleteMyallcompany = async (req, res) => {
    try {
      let companydata = await CompanyModel.deleteMany({
        user_id: req.user._id,
      });
      const folder = "./assets/companyprofile";
      fsExtra.emptyDirSync(folder);
      return res.status(200).json({
        success: true,
        message: "Successfully Deleted...",
      });
    } catch (error) {}
  };

  static DeleteAllcompany = async (req, res) => {
    try {
      let companydata = await CompanyModel.deleteMany();
      const folder = "./assets/companyprofile";
      fsExtra.emptyDirSync(folder);
      return res.status(200).json({
        success: true,
        message: "Successfully Deleted...",
      });
    } catch (error) {}
  };

  // ................CHAMBER......................
  static Chamber = async (req, res) => {
    var data = req.body;
    data.video = req.files?.video;
    let validator = new Validator(data, {
      chamber_name_english: "required",
      chamber_name_chinese: "required",
      chamberdesignation: "required",
      chamberwebsite: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const path = await makeDir("./assets/chamber/");
      let pic = await UserModel.findById(req.user._id);
      // determine chamber_order: use provided value or auto-increment from max existing for this user
      let chamberOrder;
      if (
        req.body.chamber_order !== undefined &&
        req.body.chamber_order !== ""
      ) {
        chamberOrder = Number(req.body.chamber_order);
      } else {
        const last = await ChamberModel.findOne({ user_id: req.user._id })
          .sort({ chamber_order: -1 })
          .select("chamber_order")
          .lean();
        chamberOrder =
          last && last.chamber_order ? Number(last.chamber_order) + 1 : 1;
      }
      const doc = {
        chamber_name_english: req.body.chamber_name_english,
        chamber_name_chinese: req.body.chamber_name_chinese,
        chamberdesignation: req.body.chamberdesignation,
        detail: req.body.detail,
        WhatsApp: req.body.WhatsApp,
        WeChat: req.body.WeChat,
        Line: req.body.Line,
        Instagram: req.body.Instagram,
        Facebook: req.body.Facebook,
        Twitter: req.body.Twitter,
        Youtube: req.body.Youtube,
        Linkedin: req.body.Linkedin,
        SnapChat: req.body.SnapChat,
        Skype: req.body.Skype,
        TikTok: req.body.TikTok,
        tgchannel: req.body.tgchannel,
        chamberfanpage: req.body.chamberfanpage,
        chamberwebsite: req.body.chamberwebsite,
        chamber_order: chamberOrder,
        user_id: req.user._id,
        // video: imagename
      };
      if (req.files?.image != undefined) {
        let photo = path + "/" + req.files?.image;
        if (fs.existsSync(photo)) fs.unlinkSync(photo);

        let image = req.files?.image;
        var d = new Date();
        photo = image.name;
        photo = photo.replace(/\s/g, "");
        let r = (Math.random() + 1).toString(36).substring(7);
        var imname = d.getSeconds() + "." + r + "." + photo;
        let uploadPath = path + "/" + imname;
        image.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
        });
        doc["image"] = "chamber/" + imname;
        image = baseUrl + "assets/chamber/" + imname;
      }

      if (req.files?.video != undefined) {
        let photo = path + "/" + req.files?.video;
        if (fs.existsSync(photo)) fs.unlinkSync(photo);

        let video = req.files?.video;
        var d = new Date();
        photo = video.name;
        photo = photo.replace(/\s/g, "");
        let r = (Math.random() + 1).toString(36).substring(7);
        var imname = d.getSeconds() + "." + r + "." + photo;
        let uploadPath = path + "/" + imname;
        video.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
        });
        doc["video"] = "chamber/" + imname;
        video = baseUrl + "assets/chamber/" + imname;
      }

      let result = await ChamberModel.create(doc); // Send notification to all users who have added this user to their contacts
      try {
        const currentUser = await UserModel.findById(req.user._id);
        // Find all contacts where contact_id is the current user (people who added me)
        // and user_id is NOT the current user (don't notify myself)
        const myFollowers = await ContactModel.find({
          contact_id: req.user._id,
          user_id: { $ne: req.user._id },
          status: 1,
        });

        for (const follower of myFollowers) {
          const notificationDoc = {
            user_id: follower.user_id,
            contact_id: req.user._id,
            message: `${
              currentUser.owner_name_english || currentUser.username
            } has added a new chamber`,
          };
          await NotificationModel.create(notificationDoc);
        }
      } catch (notifError) {
        console.error(
          "Error sending chamber creation notifications:",
          notifError
        );
        // Don't fail the request if notification fails
      }

      return res.status(200).json({
        success: true,
        data: result,
        message: "Data Added Successfully..",
      });
    }
  };

  static UpdateChamber = async (req, res) => {
    try {
      // Accept only multipart/form-data for a single chamber update
      await makeDir("./assets/chamber/");

      const body = req.body || {};
      const chamberId = body._id;
      if (!chamberId) {
        return res.status(422).json({
          success: false,
          message: "_id (chamber id) is required in form fields",
        });
      }

      // Build update document from allowed fields
      const allowed = [
        "chamber_name_english",
        "chamber_name_chinese",
        "chamberdesignation",
        "detail",
        "WhatsApp",
        "WeChat",
        "Line",
        "Instagram",
        "Facebook",
        "Twitter",
        "Youtube",
        "Linkedin",
        "SnapChat",
        "Skype",
        "TikTok",
        "tgchannel",
        "chamberfanpage",
        "chamberwebsite",
        "user_id",
        "chamber_order",
      ];
      const doc = {};
      for (const k of allowed) {
        if (typeof body[k] !== "undefined") doc[k] = body[k];
      }

      // Reject base64/data URIs sent as form fields
      if (
        body.image &&
        (String(body.image).includes("base64") ||
          String(body.image).startsWith("data:"))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please upload image as a file (multipart/form-data). Do not send base64/data URIs.",
        });
      }
      if (
        body.video &&
        (String(body.video).includes("base64") ||
          String(body.video).startsWith("data:"))
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Please upload video as a file (multipart/form-data). Do not send base64/data URIs.",
        });
      }

      // Handle uploaded files
      if (req.files && req.files.image) {
        const image = req.files.image;
        const d = new Date();
        const safeName = image.name.replace(/\s/g, "");
        const r = (Math.random() + 1).toString(36).substring(7);
        const imname = d.getSeconds() + "." + r + "." + safeName;
        const uploadPath = "./assets/chamber/" + imname;
        try {
          await image.mv(uploadPath);
          doc.image = "chamber/" + imname;
        } catch (e) {
          console.error("Failed to save uploaded chamber image:", e);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save uploaded image" });
        }
      }

      if (req.files && req.files.video) {
        const video = req.files.video;
        const d = new Date();
        const safeName = video.name.replace(/\s/g, "");
        const r = (Math.random() + 1).toString(36).substring(7);
        const imname = d.getSeconds() + "." + r + "." + safeName;
        const uploadPath = "./assets/chamber/" + imname;
        try {
          await video.mv(uploadPath);
          doc.video = "chamber/" + imname;
        } catch (e) {
          console.error("Failed to save uploaded chamber video:", e);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save uploaded video" });
        }
      }

      // Update existing chamber
      try {
        await ChamberModel.findByIdAndUpdate(chamberId, doc, {
          new: true,
          upsert: false,
        });
      } catch (e) {
        console.error(`Failed to update chamber ${chamberId}:`, e);
        return res
          .status(500)
          .json({ success: false, message: "Failed to update chamber" });
      }

      // Notify contacts about the change (same behavior as before)
      let usercontact1 = await ContactModel.find({
        status: 1,
        contact_id: req.user._id,
      });
      for (var i = 0; i < usercontact1.length; i++) {
        var contact_id = usercontact1[i].contact_id;
        var user_id = usercontact1[i].user_id;
        const ndoc = {
          user_id: user_id,
          contact_id: contact_id,
          message: `${req.user.owner_name_english} has changed their chamber data`,
        };
        try {
          await NotificationModel.create(ndoc);
        } catch (e) {
          console.error("Failed creating chamber update notification:", e);
        }
      }

      return res
        .status(200)
        .json({ success: true, message: "Data Updated Successfully..." });
    } catch (error) {
      console.error("UpdateChamber error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static Chambervideo = async (req, res) => {
    try {
      let data = req.body;
      data.video = req.files?.video;
      const path = await makeDir("./assets/chambervideo/");
      let video = req.files?.video;
      var d = new Date();
      photo = video.name;
      photo = photo.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var imname = d.getSeconds() + "." + r + "." + photo;
      let uploadphotoPath = path + "/" + imname;
      video.mv(uploadphotoPath, function (err) {
        if (err) return res.status(500).send(err);
      });
      data["video"] = "chambervideo/" + imname;
      video = "chambervideo/" + imname;
      var photo = [
        {
          video: video,
        },
      ];
      return res.status(200).json({
        success: true,
        data: photo,
      });
    } catch (error) {}
  };

  static chamber = async (req, res) => {
    let chamber = await ChamberModel.find({ user_id: req.user._id });
    return res.status(200).json({
      success: true,
      data: chamber,
    });
  };

  static GetChamber = async (req, res) => {
    // Find user by username (checks both username and freeUsername)
    let user = await UserController.findUserByUsername(req.body.username);
    if (user) {
      let company = await ChamberModel.find({ user_id: user._id });
      if (company) {
        return res.status(200).json({
          success: true,
          data: company,
        });
      } else {
        return res.status(422).json({
          success: false,
          message: "Record not found...",
        });
      }
    } else {
      return res.status(422).json({
        success: false,
        message: "User not found...",
      });
    }
  };

  static DeleteChamber = async (req, res) => {
    let chamber1 = await ChamberModel.findById(req.params.id);
    const path = await makeDir("./assets/chamber/");
    if (chamber1.video) {
      const url = chamber1.video;
      let filename = new URL(url).pathname.split("/").pop();
      let image = path + "/" + filename;
      if (fs.existsSync(image)) fs.unlinkSync(image);
    }
    let chamber = await ChamberModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Data Deleted Successfully...",
    });
  };

  static DeleteMyallchamber = async (req, res) => {
    try {
      let chamberdata = await ChamberModel.deleteMany({
        user_id: req.user._id,
      });
      const folder = "./assets/chamber";
      fsExtra.emptyDirSync(folder);
      return res.status(200).json({
        success: true,
        message: "Successfully Deleted...",
      });
    } catch (error) {}
  };

  static DeleteAllchamber = async (req, res) => {
    try {
      let chamberdata = await ChamberModel.deleteMany();
      const folder = "./assets/chamber";
      fsExtra.emptyDirSync(folder);
      return res.status(200).json({
        success: true,
        message: "Successfully Deleted...",
      });
    } catch (error) {}
  };

  // .........................NOTIFICATION............................
  static GetNotification = async (req, res) => {
    let data = req.body;
    let Notification = await NotificationModel.aggregate([
      {
        $match: {
          user_id: req.user._id,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "contact_id",
          foreignField: "_id",
          as: "userDoc",
        },
      },
    ]).sort({ createdAt: -1 });
    console.log("Notification", req.user._id);
    return res.status(200).json({
      success: true,
      data: Notification,
    });
  };

  static ViewNotification = async (req, res) => {
    try {
      let Notification = await NotificationModel.findById(req.params.id);
      if (!Notification) {
        let notify = await NotificationModel.findById(req.params.id);
        return res.status(422).json({
          success: false,
          message: "Somthing Went Wrong",
        });
      } else {
        let notifys = await NotificationModel.findByIdAndUpdate(
          Notification._id,
          {
            view: 1,
          }
        );
        return res.status(200).json({
          success: true,
          result: notifys,
        });
      }
    } catch (error) {}
  };

  static MultipleNotification = async (req, res) => {
    try {
      let data = req.body;
      let Notification = await NotificationModel.find({
        update_userid: req.user._id,
      }).count();
      for (var i = 0; i < Notification.length; i++) {
        var update_userid = Notification[i].update_userid;
        let users = await UserModel.findById(update_userid);
        Notification[i].message = `${users.name} Updated their Profile`;
      }
      // console.log("vinit",Notification)
      return res.status(200).json({
        success: true,
        data: Notification,
      });
    } catch (error) {}
  };

  static DeleteNotification = async (req, res) => {
    try {
      let data = req.body;
      let Notification = await NotificationModel.findByIdAndDelete(
        req.params.id
      );
      return res.status(200).json({
        success: true,
        message: "Notification Deleted Successfully...",
      });
    } catch (error) {}
  };

  // ...................TONCOIN..........................
  static ToncoinPaypal = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        membershiperiod: "required",
        firstname: "required",
        lastname: "required",
        transactionid: "required",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }
      const doc = new ToncoinModel({
        membershiperiod: req.body.membershiperiod,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        address: req.body.address,
        transactionid: req.body.transactionid,
        toncoin: req.body.toncoin,
        paypal: req.body.paypal,
        amount: req.body.amount,
        paypalid: req.body.paypalid,
        paymenttype: req.body.paymenttype,
        transactiondate: req.body.transactiondate,
        user_id: req.user._id,
      });
      const result = await doc.save();
      let data1 = await UserModel.findByIdAndUpdate(req.user._id, {
        paymentstatus: 0,
      });
      return res.status(200).json({
        success: true,
        data: result,
        message: "Data Added Successfully...",
      });
    } catch (error) {}
  };

  // ..............PLANCHECK..........................
  static PlanCheck = async (req, res) => {
    var current = moment().format("MM/DD/YY");
    let toncoin = await ToncoinModel.find({ date: { $lt: current } });
    return res.status(200).json({
      success: true,
      data: toncoin,
    });
  };

  // .................Country.........................
  static Country = async (req, res) => {
    let country = await CountryModel.find({
      country_code: req.body.country_code,
    });
    return res.status(200).json({
      success: true,
      data: country,
    });
  };

  // ...........................USERS[FREE]...................
  static FreeUser = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        username: "required",
        tgid: "required",
        email: "required|email",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }
      const doc = new UserModel({
        memberid: req.body.memberid,
        username: req.body.username,
        tgid: req.body.tgid,
        email: req.body.email,
        country: req.body.country,
        joindate: req.body.joindate,
        usertype: req.body.usertype,
      });
      const result = await doc.save();
      return res.status(200).json({
        success: true,
        data: result,
        message: "Data Added successfully...",
      });
    } catch (error) {}
  };
  // ...........................USERS[PRIMIUM]...................
  static PremiumUser = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        user_id: "required",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }
      let user = await UserModel.findById(req.body.user_id);
      if (user) {
        var use = await UserModel.findByIdAndUpdate(
          { _id: user._id },
          {
            usertype: 1,
          }
        );
        var data1 = await UserModel.findById(user._id);
        return res.status(422).json({
          success: false,
          data: data1,
          message: "This User is Premium User",
        });
      } else {
        return res.status(422).json({
          success: false,
          message: "This User not register",
        });
      }
    } catch (error) {}
  };

  // ...........................USERS[DONATED]...................
  static DonatedUser = async (req, res) => {
    try {
      let data = req.body;
      console.log("DATA", data);
      let validator = new Validator(data, {
        user_id: "required",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }
      let user = await UserModel.findById(req.body.user_id);
      if (user) {
        var us = await UserModel.findByIdAndUpdate(
          { _id: user._id },
          {
            usertype: 2,
          }
        );
        var data1 = await UserModel.findById(user._id);
        return res.status(422).json({
          success: false,
          data: data1,
          message: "This User is Donators User",
        });
      } else {
        return res.status(422).json({
          success: false,
          message: "This User not register",
        });
      }
    } catch (error) {}
  };

  // ......................PAYPAL..........................
  static PayPal = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        firstname: "required",
        lastname: "required",
        address: "required",
      });
      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }

      const doc = new PaypalModel({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        country: req.body.country,
        address: req.body.address,
        transactionid: req.body.transactionid,
        status: req.body.status,
      });
      const result = await doc.save();
      return res.status(200).json({
        success: true,
        data: result,
        message: "Data Added successfully...",
      });
    } catch (error) {}
  };

  // ......................PURCHASE MEMBERSHIP.....................
  static PurchaseMembership = async (req, res) => {
    try {
      res.render("User/Purchasemembership", { baseUrl, session: req.session });
    } catch (error) {}
  };

  // ::::::::::::::::::::THEME::::::::::::::::::::::::::::
  static Theme = async (req, res) => {
    let system = await SystemModel.find({}).sort({ _id: -1 });
    system = await system.map((e) => {
      let a = JSON.parse(JSON.stringify(e));
      a["Thumbnail"] = a.Thumbnail.split(",");
      return a;
    });
    const background = await BackgroundModel.findOne({ user_id: req.user._id });
    var user = req.user;
    var session = req.session;
    res.render("User/Theme", {
      baseUrl,
      system,
      session: req.session,
      background,
    });
  };

  // ......................BACKGROUND IMAGE.....................
  static Backgroundimage = async (req, res) => {
    await BackgroundModel.updateOne(
      { user_id: req.user._id },
      { $set: { Thumbnail: req.body.Thumbnail } },
      { upsert: true }
    );
    const system = await SystemModel.findById(req.params.id);
    const background = await BackgroundModel.findOne({ user_id: req.user._id });
    res.redirect("Theme");
  };

  // ......................BACKGROUND-IMAGE........API::::::::::::::::::::::::
  static BackgroundImages = async (req, res) => {
    if (typeof req.body.Thumbnail != "undefined") {
      await BackgroundModel.updateOne(
        { user_id: req.user._id },
        { $set: { Thumbnail: req.body.Thumbnail } },
        { upsert: true }
      );
    }
    if (typeof req.body.fontcolor != "undefined") {
      await BackgroundModel.updateOne(
        { user_id: req.user._id },
        { $set: { fontcolor: req.body.fontcolor } },
        { upsert: true }
      );
    }
    if (typeof req.body.bgcolor != "undefined") {
      await BackgroundModel.updateOne(
        { user_id: req.user._id },
        { $set: { backgroundcolor: req.body.bgcolor } },
        { upsert: true }
      );
    }
    if (typeof req.body.iconcolor != "undefined") {
      await BackgroundModel.updateOne(
        { user_id: req.user._id },
        { $set: { iconcolor: req.body.iconcolor } },
        { upsert: true }
      );
    }
    const system = await SystemModel.findById(req.params.id);
    const background = await BackgroundModel.findOne({ user_id: req.user._id });
    return res.status(200).json({
      success: true,
      data: background,
      message: "Background Images Successfully Added...",
    });
  };

  static GetBackgroundimage = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {});
      var user = req.user;
      const result = await BackgroundModel.findOne({ user_id: user._id });
      if (result !== null) {
        return res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        return res.status(200).json({
          success: true,
        });
      }
    } catch (error) {}
  };

  // ......................BACKGROUND COLOR.....................
  static ColorBackground = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {});
      var user = req.user;
      if (typeof req.body.fontcolor != "undefined") {
        await BackgroundModel.updateOne(
          { user_id: req.user._id },
          { $set: { fontcolor: req.body.fontcolor } },
          { upsert: true }
        );
      }
      if (typeof req.body.bgcolor != "undefined") {
        await BackgroundModel.updateOne(
          { user_id: req.user._id },
          { $set: { backgroundcolor: req.body.bgcolor } },
          { upsert: true }
        );
      }
      if (typeof req.body.iconcolor != "undefined") {
        await BackgroundModel.updateOne(
          { user_id: req.user._id },
          { $set: { iconcolor: req.body.iconcolor } },
          { upsert: true }
        );
      }

      const result = await BackgroundModel.findOne({ user_id: user._id });
      return res.status(200).json({
        success: true,
        data: result,
        message: "Successfully updated.....",
      });
    } catch (error) {}
  };

  static Colorbackground = async (req, res) => {
    try {
      res.render("User/Colorbackground", { baseUrl, session: req.session });
    } catch (error) {}
  };

  // ......................SYSTEM-IMAGE..........API::::::::::::::::::::::::
  static SystemImage = async (req, res) => {
    let systemimage = await SystemModel.find({});
    return res.status(200).json({
      success: true,
      data: systemimage,
    });
  };

  // ......................BANNER..........API::::::::::::::::::::::::
  static Banners = async (req, res) => {
    let banner = await BannerModel.find({});
    return res.status(200).json({
      success: true,
      data: banner,
    });
  };

  // ......................FOLDER..........API::::::::::::::::::::::::
  static Folders = async (req, res) => {
    let folder = await FolderModel.find({});
    return res.status(200).json({
      success: true,
      data: folder,
    });
  };

  // ......................FOR-GET.....................
  static register = async (req, res) => {
    try {
      res.render("UserDetail/Registers", { baseUrl, session: req.session });
    } catch (error) {}
  };

  static checktg = async (req, res) => {
    try {
      const tgid = await UserModel.findOne({ username: req.body.tgname });
      return res.status(200).json({
        success: true,
        data: tgid,
      });
    } catch (error) {}
  };

  static login = async (req, res) => {
    try {
      res.render("UserDetail/Logins", { baseUrl, session: req.session });
    } catch (error) {}
  };

  static forgotpassword = async (req, res) => {
    try {
      res.render("UserDetail/Forgotpasswords", {
        baseUrl,
        session: req.session,
      });
    } catch (error) {}
  };

  static personalprofile = async (req, res) => {
    try {
      res.render("UserDetail/Personalprofile", {
        baseUrl,
        session: req.session,
      });
    } catch (error) {}
  };

  static addprofile = async (req, res) => {
    let user = await UserModel.find({}).sort({ _id: -1 });
    res.render("UserDetail/Addprofile", {
      baseUrl,
      user: user,
      session: req.session,
    });
  };

  // ...................MEMBERSHIP..................
  static membershiptenure = async (req, res) => {
    let membership = await MembershipModel.find({}).sort({ _id: -1 });
    return res.status(200).json({
      success: true,
      data: membership,
    });
  };

  // .....................................PURCHASE...............................
  static purchase = async (req, res) => {
    let membership = await MembershipModel.findById(req.params.id);
    let paymentOption = await PaymentConfigurationModel.find({});
    membership = JSON.parse(JSON.stringify(membership));
    let currency = await ConfigurationModel.findOne({
      Configvalue: req.body.configvalue,
    });
    let promotion_message = await ConfigurationModel.findOne({
      ConfigKey: "promotion_message",
    });
    membership.currency = currency.ConfigValue;
    membership.promotion_message = promotion_message.ConfigValue;
    membership.paymentOption = paymentOption[0].payment_id;
    console.log("memeber", paymentOption);
    return res.status(200).json({
      success: true,
      data: membership,
    });
  };

  // ...............................FOLDERS..................................
  static UserFolder = async (req, res) => {
    var data = req.body;
    const doc = new FolderModel({
      Folder: req.body.Folder,
      user_id: req.user._id,
    });
    let result = await FolderModel.create(doc);
    return res.status(200).json({
      success: true,
      data: result,
      message: "Data Added Successfully..",
    });
  };

  static DeleteFolder = async (req, res) => {
    let folder = await FolderModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      data: "",
      message: "Data Deleted Successfully..",
    });
  };

  static GetFolder = async (req, res) => {
    let data1 = [];
    let folder = await FolderModel.aggregate([
      {
        $match: {
          $or: [{ user_id: req.user._id }, { user_id: null }],
        },
      },
      {
        $lookup: {
          from: "contactfolders",
          let: { folder_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toObjectId: "$folder_id" }, "$$folder_id"] },
                $and: [{ user_id: req.user._id }],
              },
            },
            {
              $lookup: {
                from: "users",
                let: { contact_id: "$contact_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$_id", "$$contact_id"] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "companies",
                      let: { user_id: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$user_id", "$$user_id"] },
                          },
                        },
                        { $sort: { company_order: 1 } },
                        { $limit: 1 },
                      ],
                      as: "companydetails",
                    },
                  },
                  {
                    $lookup: {
                      from: "contacts",
                      let: { user_id: "$user_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$contact_id", "$$contact_id"] },
                            $and: [{ user_id: req.user._id }],
                          },
                        },
                        {
                          $project: {
                            _id: 1,
                            status: 1,
                            user_id: 1,
                            contact_id: 1,
                          },
                        },
                      ],
                      as: "contacts",
                    },
                  },
                ],
                as: "userdetails",
              },
            },
            {
              $unwind: {
                path: "$userdetails",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "folderdetails",
        },
      },
    ]);
    folder = await folder.map((e) => {
      let a = JSON.parse(JSON.stringify(e));
      a["profile_image"] = baseUrl + "assets/";
      return a;
    });
    return res.status(200).json({
      success: true,
      data: folder,
    });
  };

  static EditFolder = async (req, res) => {
    var data = req.body;
    let validator = new Validator(data, {
      Folder: "required",
    });
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      let folder = await FolderModel.findById(req.params.id);
      const doc = {
        Folder: req.body.Folder,
        user_id: req.user._id,
      };
      const result = await FolderModel.findByIdAndUpdate(req.params.id, doc);
      const user = await FolderModel.findById(result._id);
      return res.status(200).json({
        success: true,
        data: user,
        message: "Data Updated Successfully...",
      });
    }
  };

  static SystemImages = async (req, res) => {
    let image = await SystemModel.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "categoryname",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
    ]);
    // const userDetails = await UserModel.findById()
    console.log("image", image);
    image = await image.map((e) => {
      let a = JSON.parse(JSON.stringify(e));
      let im = a.Thumbnail.split(",");
      a["Thumbnail"] = im.map((e1) => {
        return baseUrl + "assets/systemimage/" + e1;
      });
      // a['categoryname'] = a.category.categoryname;
      return a;
    });
    console.log("image", image);
    //   image[0]['Thumbnail'] = baseUrl + 'assets/systemimage' + image[0]['Thumbnail'];
    return res.status(200).json({
      success: true,
      data: image,
    });
  };

  // ....................................CONTACT..................................
  static AddToContact = async (req, res) => {
    const targetId = req.body.contact_id;
    const meId = req.user._id;

    // Basic validation
    if (!targetId) {
      return res
        .status(422)
        .json({ success: false, message: "contact_id is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res
        .status(422)
        .json({ success: true, message: "Invalid contact_id" });
    }
    if (meId.toString() === targetId.toString()) {
      return res.status(400).json({
        success: true,
        message: "You cannot add yourself as contact",
      });
    }

    const me = await UserModel.findById(meId);
    const target = await UserModel.findById(targetId);
    if (!target)
      return res
        .status(404)
        .json({ success: true, message: "Target user not found" });

    try {
      // Check if there is already a contact record where target is recipient and I am the requester
      const pendingForTarget = await ContactModel.findOne({
        user_id: targetId,
        contact_id: meId,
      });
      if (pendingForTarget) {
        if (pendingForTarget.status === 0) {
          return res.status(200).json({
            success: true,
            message: "You already sent a contact request to this user",
          });
        }
        if (pendingForTarget.status === 1) {
          return res.status(200).json({
            success: true,
            message: "This user is already in your contacts",
          });
        }
        // status === 2 (previously rejected/removed) -> re-send request: set to pending and (re)create notification
        await ContactModel.findByIdAndUpdate(pendingForTarget._id, {
          status: 0,
        });
        // ensure notification exists
        const existingNotif = await NotificationModel.findOne({
          user_id: targetId,
          contact_id: meId,
        });
        if (!existingNotif) {
          await NotificationModel.create({
            user_id: targetId,
            contact_id: meId,
            message: `${me.owner_name_english} has sent you a contact request`,
          });
        }
        return res
          .status(200)
          .json({ success: true, message: "Contact request re-sent" });
      }

      // Check if target had already sent me a request earlier (i.e., reverse pending)
      const pendingFromTarget = await ContactModel.findOne({
        user_id: meId,
        contact_id: targetId,
      });
      if (pendingFromTarget) {
        if (pendingFromTarget.status === 0) {
          // target had requested me earlier; accepting their request now
          // mark their request as approved
          await ContactModel.findByIdAndUpdate(pendingFromTarget._id, {
            status: 1,
          });

          // create reciprocal approved contact if missing
          const reciprocal = await ContactModel.findOne({
            user_id: targetId,
            contact_id: meId,
          });
          if (!reciprocal) {
            await ContactModel.create({
              user_id: targetId,
              contact_id: meId,
              status: 1,
              flag: 1,
            });
          } else {
            await ContactModel.findByIdAndUpdate(reciprocal._id, { status: 1 });
          }

          // Add to folders: keep same logic as InvitationContact approve
          try {
            // Add to recipient's selected folder if provided in body
            if (req.body.folder_id) {
              await ContactFolderModel.create({
                user_id: meId,
                contact_id: targetId,
                folder_id: req.body.folder_id,
              });
            }
            // Ensure sender (target) has an 'All' folder and add me to it
            let senderAll = await FolderModel.findOne({
              user_id: targetId,
              Folder: "All",
            });
            if (!senderAll) {
              senderAll = await FolderModel.create({
                user_id: targetId,
                Folder: "All",
              });
            }
            await ContactFolderModel.create({
              user_id: targetId,
              contact_id: meId,
              folder_id: senderAll._id,
            });
          } catch (e) {
            console.error(
              "Failed adding contact to folders during auto-accept:",
              e
            );
          }

          // Remove pending notifications for this request
          try {
            await NotificationModel.deleteMany({
              user_id: meId,
              contact_id: targetId,
            });
          } catch (e) {
            console.error("Failed deleting notification after auto-accept", e);
          }

          // Notify target that their request was accepted
          try {
            await NotificationModel.create({
              user_id: targetId,
              contact_id: meId,
              message: `${me.owner_name_english} accepted your contact request`,
            });
          } catch (e) {
            console.error("Failed creating acceptance notification", e);
          }

          return res
            .status(200)
            .json({ success: true, message: "Contact request accepted" });
        }
        if (pendingFromTarget.status === 1) {
          return res.status(200).json({
            success: true,
            message: "This user is already in your contacts",
          });
        }
        // status === 2 -> they had been rejected earlier; proceed to create a fresh request below
      }

      // No existing records: create a new pending contact for the target
      const newDoc = await ContactModel.create({
        user_id: targetId,
        contact_id: meId,
        status: 0,
      });
      // Create notification for the recipient if not already present
      try {
        const existingNotif = await NotificationModel.findOne({
          user_id: targetId,
          contact_id: meId,
        });
        if (!existingNotif) {
          await NotificationModel.create({
            user_id: targetId,
            contact_id: meId,
            message: `${me.owner_name_english} has sent you a contact request`,
          });
        }
      } catch (e) {
        console.error("Failed creating contact notification", e);
      }

      return res
        .status(200)
        .json({ success: true, message: "Contact request sent" });
    } catch (err) {
      console.error("AddToContact error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  // :::::::::::::::::::::::::::::INVITATION CONTACT::::::::::::::::::::::::::::::::::
  static InvitationContact = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        status: "required",
      },
      {
        status: "status is required",
      }
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      var doc = await ContactModel.findByIdAndUpdate(
        { _id: req.body.id },
        {
          status: req.body.status,
        },
        { new: true }
      );
      let approve = "";
      // fetch the updated contact document
      const contactDoc = await ContactModel.findById(req.body.id);
      if (!contactDoc) {
        return res
          .status(422)
          .json({ success: false, message: "Contact record not found" });
      }
      if (req.body.status == 1) {
        // APPROVE: create reciprocal contact (if missing), add to recipient's selected folder and sender's 'All' folder, and remove notification
        approve = "Approved";
        // create reciprocal contact if not exists
        let add = await ContactModel.findOne({
          contact_id: contactDoc.user_id,
          user_id: contactDoc.contact_id,
        });
        if (!add) {
          await ContactModel.create({
            user_id: contactDoc.contact_id,
            contact_id: contactDoc.user_id,
            flag: 1,
          });
        }

        // Add to recipient's selected folder (folder_id passed in request)
        if (req.body.folder_id) {
          try {
            await ContactFolderModel.create({
              user_id: contactDoc.user_id,
              contact_id: contactDoc.contact_id,
              folder_id: req.body.folder_id,
            });
          } catch (e) {
            console.error("Failed to add contact to recipient folder", e);
          }
        }

        // Ensure sender has an 'All' folder; create if missing, then add recipient to it
        try {
          let senderAll = await FolderModel.findOne({
            user_id: contactDoc.contact_id,
            Folder: "All",
          });
          if (!senderAll) {
            senderAll = await FolderModel.create({
              user_id: contactDoc.contact_id,
              Folder: "All",
            });
          }
          await ContactFolderModel.create({
            user_id: contactDoc.contact_id,
            contact_id: contactDoc.user_id,
            folder_id: senderAll._id,
          });
        } catch (e) {
          console.error("Failed to add contact to sender All folder", e);
        }

        // Remove any pending notifications for this request
        try {
          await NotificationModel.deleteMany({
            user_id: contactDoc.user_id,
            contact_id: contactDoc.contact_id,
          });
        } catch (e) {
          console.error("Failed deleting notification after approval", e);
        }
      } else {
        // REJECT: delete contact records and any contact-folder entries and notifications
        approve = "Rejected";
        try {
          await ContactModel.deleteMany({
            $or: [
              { _id: contactDoc._id },
              {
                user_id: contactDoc.contact_id,
                contact_id: contactDoc.user_id,
              },
            ],
          });
          await ContactFolderModel.deleteMany({
            $or: [
              {
                user_id: contactDoc.user_id,
                contact_id: contactDoc.contact_id,
              },
              {
                user_id: contactDoc.contact_id,
                contact_id: contactDoc.user_id,
              },
            ],
          });
          await NotificationModel.deleteMany({
            user_id: contactDoc.user_id,
            contact_id: contactDoc.contact_id,
          });
        } catch (e) {
          console.error("Failed cleanup on rejection", e);
        }
      }
      return res.status(200).json({
        success: true,
        data: doc,
        message: "Contact " + approve + " Successfully.....",
      });
    }
  };

  static GetContact = async (req, res) => {
    let contact = await ContactModel.aggregate([
      {
        $match: {
          $and: [{ user_id: mongoose.Types.ObjectId(req.user._id) }],
        },
      },
      {
        $lookup: {
          from: "users",
          let: { contact_id: "$contact_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$contact_id"] }],
                },
              },
            },
            {
              $lookup: {
                from: "companies",
                let: { user_id: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$user_id", "$$user_id"] },
                    },
                  },
                  { $sort: { company_order: 1 } },
                  { $limit: 1 },
                ],
                as: "companydetails",
              },
            },
          ],
          as: "userdetails",
        },
      },
      {
        $lookup: {
          from: "contactfolders",
          let: { contact_id: "$contact_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$contact_id", "$$contact_id"] },
              },
            },
            {
              $project: { _id: 1, tag: 1 },
            },
          ],
          as: "contactfolders_data",
        },
      },
    ]);
    contact = await contact.map((e) => {
      let a = JSON.parse(JSON.stringify(e));
      a["profile_image"] = baseUrl + "assets/";
      return a;
    });
    return res.status(200).json({
      success: true,
      data: contact,
    });
  };

  // ::::::::::::::::::::::::::::::::: SEARCH CONTACT::::::::::::::::::::::::::::::::::::
  static SearchContact = async (req, res) => {
    try {
      const q = (req.body.search || "").trim();
      if (!q) {
        return res
          .status(422)
          .json({ success: false, message: "Search term required" });
      }

      // Build case-insensitive regex for partial matches
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      // Find users matching username/tgid exactly or name fields partially
      const usersByFields = await UserModel.find({
        $or: [
          { username: q },
          { tgid: q },
          { owner_name_english: { $regex: regex } },
          { owner_name_chinese: { $regex: regex } },
          { firstname: { $regex: regex } },
          { lastname: { $regex: regex } },
        ],
      });

      // Find companies matching company name fields and collect their user_ids
      const companies = await CompanyModel.find({
        $or: [
          { company_name_english: { $regex: regex } },
          { company_name_chinese: { $regex: regex } },
        ],
      });
      const companyUserIds = companies.map((c) => c.user_id).filter(Boolean);

      const usersFromCompanies = companyUserIds.length
        ? await UserModel.find({ _id: { $in: companyUserIds } })
        : [];

      // Combine users and deduplicate by _id
      const usersMap = new Map();
      usersByFields.concat(usersFromCompanies).forEach((u) => {
        usersMap.set(String(u._id), u);
      });

      const results = [];
      for (const user of usersMap.values()) {
        // Check if current authenticated user already has this user as contact
        const isContact = await ContactModel.exists({
          user_id: req.user._id,
          contact_id: user._id,
        });
        // Get first company for preview
        const company = await CompanyModel.findOne({ user_id: user._id }).sort({
          company_order: 1,
        });

        results.push({
          user: user,
          company: company || null,
          isContact: Boolean(isContact),
        });
      }

      if (results.length === 0) {
        return res
          .status(422)
          .json({ success: false, message: "No records found" });
      }

      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      console.error("SearchContact error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static isMyContact = async (req, res) => {
    try {
      const username = req.params.username;
      const meId = req.user._id;
      // Find user by username (checks both username and freeUsername)
      const targetUser = await UserController.findUserByUsername(username);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }
      const targetId = targetUser._id;

      const isContact = await ContactModel.exists({
        user_id: meId,
        contact_id: targetId,
        status: 1,
      });

      return res.status(200).json({
        success: true,
        isContact: Boolean(isContact),
      });
    } catch (err) {
      console.error("isMyContact error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static AddContactFolder = async (req, res) => {
    var data = req.body;
    let user = await UserModel.findById(req.user._id);
    let add = await ContactFolderModel.findOne({
      user_id: req.user._id,
      contact_id: req.body.contact_id,
      folder_id: req.body.folder_id,
    });

    if (add) {
    } else {
      const doc = {
        user_id: req.user._id,
        contact_id: req.body.contact_id,
        folder_id: req.body.folder_id,
      };
      let result = await ContactFolderModel.create(doc);
    }
    return res.status(200).json({
      success: true,
      data: data,
      message: " Added Successfully...",
    });
  };

  static GetContactFolder = async (req, res) => {
    // Return system folders (user_id: null) and user-specific folders
    try {
      let folders = await FolderModel.find({
        $or: [{ user_id: null }, { user_id: req.user._id }],
      }).sort({ _id: -1 });
      return res.status(200).json({ success: true, data: folders });
    } catch (err) {
      console.error("GetContactFolder error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  static DeleteContactFolder = async (req, res) => {
    let contact = await ContactFolderModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: " Delete successfully....",
    });
  };

  // ::::::::::::::::::::CONTACT-LIST::::::::::::::::::::::::
  static ContactList = async (req, res) => {
    let contact = await ContactModel.aggregate([
      {
        $match: {
          $and: [
            { user_id: mongoose.Types.ObjectId(req.params.id) },
            { status: 0 },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "contact_id",
          foreignField: "_id",
          as: "userdetails",
        },
      },
    ]);
    return res.status(200).json({
      success: true,
      data: contact,
    });
  };

  // ::::::::::::::::::: REMOVE FROM CONTACT :::::::::::::API::::::::::::::::
  static RemoveFromContact = async (req, res) => {
    await ContactFolderModel.find({
      contact_id: req.params.id,
      user_id: req.user._id,
    }).deleteMany();
    let contact = await ContactModel.find({
      contact_id: req.params.id,
      user_id: req.user._id,
    }).deleteMany();
    return res.status(200).json({
      success: true,
      data: contact,
      message: "Contact Remove successfully....",
    });
  };

  // ..................................IMAGES....................................
  static Images = async (req, res) => {
    var data = req.body;
    let img = "image[]";
    data.image = req.files?.[img];
    let validator = new Validator(
      data,
      {
        image: "required",
      },
      {
        image: "Images is necessary",
      }
    );
    await validator.check();
    let error = validatorError(res, validator.errors);
    const path = await makeDir("./assets/systemimage/");
    let image = req.files?.[img];
    const images = [];
    if (image) {
      if (Array.isArray(image)) {
        for (let i = 0; i < image.length; i++) {
          images.push(image[i].name);
          let uploadPath = path + "/" + image[i].name;
          image[i].mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err);
          });
        }
      } else {
        let uploadPath = path + "/" + image.name;
        image.mv(uploadPath, function (err) {
          if (err) return res.status(500).send(err);
        });
        images.push(image.name);
      }
    }
    if (error && JSON.stringify(error) != "{}") {
      let system = await ImageModel.find({});
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const doc = new ImageModel({
        image: images.join(),
        user_id: req.user._id,
      });
      const result = await doc.save();
      return res.status(200).json({
        success: true,
        data: result,
        message: "Image Uploaded Successfully...",
      });
    }
  };

  static GetImages = async (req, res) => {
    let image = await ImageModel.find({ user_id: req.user._id });
    image = await image.map((e) => {
      let a = JSON.parse(JSON.stringify(e));
      let im = a.image.split(",");
      a["image"] = im.map((e1) => {
        return baseUrl + "assets/systemimage/" + e1;
      });
      return a;
    });
    return res.status(200).json({
      success: true,
      data: image,
    });
  };

  static ReferralMembership = async (req, res) => {
    let referral = await ReferralMembershipModel.find({});
    return res.status(200).json({
      success: true,
      data: referral,
    });
  };

  static ReferralReport = async (req, res) => {
    let validator = new Validator(
      data,
      {
        freemember_tgid: "required",
        membership_period: "required",
        price: "required",
        join_date: "required",
      },
      {
        freemember_tgid: "FreeMemberTgId is required",
        membership_period: "MembershipDetail is required",
        price: "Price is required",
        join_date: "joindate is required",
      }
    );
    if (!(await validator.check())) {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const doc = new ReferralReportModel({
        referral_user_id: req.user._id,
        referral_user_tgid: req.user.telegramId,
        freemember_tgid: req.body.freemember_tgid,
        membership_period: req.body.membership_period,
        price: req.body.price,
        join_date: req.body.join_date,
      });
      let result = await ReferralReportModel.create(doc);
      return res.status(200).json({
        success: true,
        data: result,
        message: "Data Added Successfully..",
      });
    }
  };
  static ReferralReportList = async (req, res) => {
    let referral = await ReferralReportModel.find({
      referral_user_id: req.user._id,
    }).sort({ _id: -1 });
    return res.status(200).json({
      success: true,
      data: referral,
    });
  };
  static success = async (req, res) => {
    let dec = req.body;
    let validator = new Validator(dec, {
      user: "required",
      membership: "required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const userdetails = await UserModel.findById(dec.user);
      let membershipData = await ReferralMembershipModel.findById(
        dec.membership
      );
      const _startDate =
        userdetails.enddate === null ||
        moment(userdetails.enddate, "YYYY-MM-DD").isBefore(
          moment().format("YYYY-MM-DD")
        )
          ? moment().format("YYYY-MM-DD")
          : userdetails?.enddate;
      const _endDate = moment(_startDate, "YYYY-MM-DD")
        .add(membershipData.membershiperiod, "years")
        .format("YYYY-MM-DD");
      await UserModel.findByIdAndUpdate(dec.user, {
        usertype: 1,
        startdate: userdetails?.startdate,
        paymentstatus: 1,
        enddate: _endDate,
        referralType: 1,
        paymentBy: 1,
      });
      await ReferralMembershipStipePayment.create({
        membership: dec.membership,
        user: dec.user,
        referral_tgid: req.user.tgid,
        referral_id: req.user._id,
      });
      const doc = new ReferralReportModel({
        referral_user_id: req.user._id,
        referral_user_tgid: req.user.telegramId,
        freemember_tgid: userdetails.tgid,
        membership_period: membershipData.membershiperiod,
        price: membershipData.price,
        join_date: moment().format("DD-MM-yyyy"),
      });
      await ReferralReportModel.create(doc);

      const _notification = {
        freemember_id: userdetails._id,
        contact_id: userdetails._id,
        user_id: req.user._id,
        message: `your profile upgraded to premium membership , now you can create custom url for your profile`,
      };
      await NotificationModel.create(_notification);

      const AdminNotification = {
        user_id: req.user._id,
        referral_id: userdetails._id,
        user_tgid: req.user.tgid,
        referral_tgid: userdetails.tgid,
      };
      await AdminNotificationModel.create(AdminNotification);

      return res.status(200).json({
        success: true,
        message: "payment success",
      });
    }
  };

  static StripeCheckOutSession = async (req, res) => {
    try {
      const data = req.body;
      let validator = new Validator(data, {
        user: "required",
        membership: "required",
      });
      await validator.check();
      let error = validatorError(res, validator.errors);
      if (error && JSON.stringify(error) != "{}") {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      } else {
        let membershipData = await ReferralMembershipModel.findById(
          data.membership
        );
        if (!membershipData) {
          return res.status(500).json({
            status: false,
            message: "Membership not found",
          });
        }
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "HKD",
                product_data: {
                  name: membershipData.membershiperiod + " Year membership",
                },
                unit_amount: membershipData.price * 100,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          // success_url:  `http://${req.headers.host}/success/${link}`,
          success_url: `${req.headers.origin}/success/${req.user._id}/${data.user}/${data.membership}`,
          cancel_url: `${req.headers.origin}/failed/${req.user._id}/${data.user}/${data.membership}`,
        });
        return res.status(200).json({
          status: true,
          data: {
            user: data.user,
            membership: membershipData._id,
            amount: membershipData.price,
          },
          id: session.id,
          url: session.url,
          session,
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: true,
        error: "somthing wents wrong",
      });
    }
  };

  static getUserName = async (req, res) => {
    let doc = req.body;

    let validator = new Validator(doc, {
      tgid: "required",
      // amount: "required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const userdetails = await UserModel.find({
        tgid: doc.tgid,
      });
      return res.status(200).json({
        success: true,
        username: userdetails?.[0]?.username,
      });
    }
  };

  static getUserDetails = async (req, res) => {
    let doc = req.body;

    let validator = new Validator(doc, {
      id: "required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const userdetails = await UserModel.findById(req.body.id);

      return res.status(200).json({
        success: true,
        data: userdetails,
      });
    }
  };

  static PaymentconfigurationList = async (req, res) => {
    let payment = await PaymentConfigurationModel.find({});
    return res.status(200).json({
      success: true,
      data: payment,
    });
  };

  static MembershipCheckOutSession = async (req, res) => {
    try {
      const data = req.body;
      let validator = new Validator(data, {
        membership_period: "required",
        membership_amount: "required",
        membership_id: "required",
      });
      await validator.check();
      let error = validatorError(res, validator.errors);
      if (error && JSON.stringify(error) != "{}") {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      } else {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "HKD",
                product_data: {
                  name: data?.membership_period + " Year membership",
                },
                unit_amount: data?.membership_amount * 100,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          // success_url:  `http://${req.headers.host}/success/${link}`,
          success_url: `${req.headers.origin}/success/${req.body.membership_id}`,
          cancel_url: `${req.headers.origin}/failed/${req.body.membership_id}`,
        });
        return res.status(200).json({
          status: true,
          data: "",
          id: session.id,
          url: session.url,
          session,
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: true,
        error: "somthing wents wrong",
      });
    }
  };

  static SuccessMembershipStripe = async (req, res) => {
    let dec = req.body;
    let validator = new Validator(dec, {
      membership_id: "required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      return res.status(422).json({
        success: false,
        error: validator.errors,
      });
    } else {
      const userdetails = req.user;
      // const userdetails = await UserModel.findById(dec.user)
      let membershipData = await MembershipModel.findById(dec.membership_id);
      // Ensure freeUsername exists before upgrading
      if (!userdetails.freeUsername) {
        let generatedUsername = UserController.generateUsername();
        let isUnique = false;
        while (!isUnique) {
          const conflict = await UserModel.findOne({
            freeUsername: generatedUsername,
          });
          if (!conflict) {
            isUnique = true;
          } else {
            generatedUsername = UserController.generateUsername();
          }
        }
        await UserModel.findByIdAndUpdate(req.user._id, {
          freeUsername: generatedUsername,
        });
      }

      const _startDate =
        userdetails.enddate === null ||
        moment(userdetails.enddate, "YYYY-MM-DD").isBefore(
          moment().format("YYYY-MM-DD")
        )
          ? moment().format("YYYY-MM-DD")
          : userdetails?.enddate;
      const _endDate = moment(_startDate, "YYYY-MM-DD")
        .add(membershipData.membershiperiod, "years")
        .format("YYYY-MM-DD");

      // Prepare update object with premium username (tgid)
      let updateObj = {
        usertype: 1,
        startdate: userdetails?.startdate,
        paymentstatus: 1,
        enddate: _endDate,
        paymentBy: 3, // 3 for Stripe
        membertype: "premium",
      };

      // Set username to tgid for premium users (handle collisions)
      let desiredUsername = userdetails.tgid;
      if (userdetails.tgid) {
        const conflict = await UserModel.findOne({
          username: desiredUsername,
          _id: { $ne: req.user._id },
        });
        if (conflict) {
          desiredUsername =
            desiredUsername + "-" + crypto.randomBytes(2).toString("hex");
        }
        updateObj.username = desiredUsername;
      }

      await UserModel.findByIdAndUpdate(req.user._id, updateObj);
      const doc = new MembershipStrpiePaymentModel({
        user: req.user._id,
        telegram_id: req.user.tgid,
        membership_id: dec.membership_id,
        date: moment().format("DD-MM-yyyy"),
      });
      await MembershipStrpiePaymentModel.create(doc);
      return res.status(200).json({
        success: true,
        message: "Membership payment success",
      });
    }
  };

  static GetPaymentConfiguration = async (req, res) => {
    let payment = await PaymentConfigurationModel.find({});
    return res.status(200).json({
      success: true,
      data: payment,
    });
  };

  // Unsecured API - Get all user data by username (profile, companies, chambers)
  static GetUserData = async (req, res) => {
    try {
      let validator = new Validator(req.body, {
        username: "required",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }

      // Find user by username (checks both username and freeUsername)
      let user = await UserController.findUserByUsername(req.body.username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get profile data with background theme
      let profile = await UserModel.aggregate([
        {
          $match: {
            _id: user._id,
          },
        },
        {
          $lookup: {
            from: "backgrounds",
            localField: "_id",
            foreignField: "user_id",
            as: "theme",
          },
        },
        { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      ]);

      // Get all companies for this user
      let companies = await CompanyModel.find({ user_id: user._id }).sort({
        company_order: 1,
      });

      // Get all chambers for this user
      let chambers = await ChamberModel.find({ user_id: user._id });

      // Process profile images/videos
      let profileData = profile[0] || {};
      if (profileData.profile_image && profileData.profile_image !== "") {
        profileData.profile_image =
          baseUrl + "assets/" + profileData.profile_image;
        profileData.video = "";
      }
      if (profileData.video && profileData.video !== "") {
        profileData.video = baseUrl + "assets/" + profileData.video;
        profileData.profile_image = "";
      }

      // Process company images/videos
      companies = companies.map((company) => {
        company = company.toObject();
        if (company.image && company.image !== "") {
          company.image = baseUrl + "assets/" + company.image;
        }
        if (company.video && company.video !== "") {
          company.video = baseUrl + "assets/" + company.video;
        }
        return company;
      });

      // Process chamber images/videos
      chambers = chambers.map((chamber) => {
        chamber = chamber.toObject();
        if (chamber.image && chamber.image !== "") {
          chamber.image = baseUrl + "assets/" + chamber.image;
        }
        if (chamber.video && chamber.video !== "") {
          chamber.video = baseUrl + "assets/" + chamber.video;
        }
        return chamber;
      });

      return res.status(200).json({
        success: true,
        data: {
          profile: profileData,
          companies: companies,
          chambers: chambers,
        },
      });
    } catch (error) {
      console.error("Error in GetUserData:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Unsecured API - Get user profile data only
  static GetUserProfile = async (req, res) => {
    try {
      let validator = new Validator(req.body, {
        username: "required",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }

      // Find user by username
      let user =
        (await UserModel.findOne({ username: req.body.username })) ||
        (await UserModel.findOne({ freeUsername: req.body.username })) ||
        (await UserModel.findOne({ tgid: req.body.username }));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get profile data with background theme
      let profile = await UserModel.aggregate([
        {
          $match: {
            _id: user._id,
          },
        },
        {
          $lookup: {
            from: "backgrounds",
            localField: "_id",
            foreignField: "user_id",
            as: "theme",
          },
        },
        { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
      ]);

      // Process profile images/videos
      let profileData = profile[0] || {};
      if (profileData.profile_image && profileData.profile_image !== "") {
        profileData.profile_image =
          baseUrl + "assets/" + profileData.profile_image;
        profileData.video = "";
      }
      if (profileData.video && profileData.video !== "") {
        profileData.video = baseUrl + "assets/" + profileData.video;
        profileData.profile_image = "";
      }

      return res.status(200).json({
        success: true,
        data: profileData,
      });
    } catch (error) {
      console.error("Error in GetUserProfile:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Unsecured API - Get user companies only
  static GetUserCompanies = async (req, res) => {
    try {
      let validator = new Validator(req.body, {
        username: "required",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }

      // Find user by username
      let user = await UserController.findUserByUsername(req.body.username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get all companies for this user
      let companies = await CompanyModel.find({ user_id: user._id }).sort({
        company_order: 1,
      });

      // Normalize image/video fields to public URLs.
      // If a field contains a data URI (base64) - decode, save to assets/companyprofile and update DB.
      for (let i = 0; i < companies.length; i++) {
        const c = companies[i];
        // convert to plain object for manipulation
        let companyObj = c.toObject ? c.toObject() : { ...c };

        // Ensure assets directory exists
        try {
          await makeDir("./assets/companyprofile/");
        } catch (e) {
          // ignore - directory may already exist or creation failed later when writing
        }

        // Helper to handle a file-like field (image/video)
        const handleField = async (fieldName, defaultFolder) => {
          const val = companyObj[fieldName];
          if (!val) return;
          const str = String(val);
          // already an absolute url
          if (str.startsWith("http") || str.startsWith("/")) {
            // if it starts with '/', prefix baseUrl
            if (str.startsWith("/") && !str.startsWith("/assets/")) {
              companyObj[fieldName] = baseUrl.replace(/\/$/, "") + str;
            } else {
              companyObj[fieldName] = str;
            }
            return;
          }

          // data URI (base64)
          if (str.indexOf("base64") !== -1 || str.startsWith("data:")) {
            const matches = str.match(
              /^data:([A-Za-z-+\/]+\/[A-Za-z0-9-.+]+);base64,(.+)$/
            );
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              const data = matches[2];
              const extension =
                mime.getExtension(mimeType) ||
                (fieldName === "video" ? "mp4" : "png");
              const r = (Math.random() + 1).toString(36).substring(7);
              const fileName = r + "." + extension;
              try {
                // write file
                fs.writeFileSync(
                  "./assets/" + defaultFolder + "/" + fileName,
                  Buffer.from(data, "base64")
                );
                // update DB to saved relative path
                const relativePath = defaultFolder + "/" + fileName;
                await CompanyModel.findByIdAndUpdate(c._id, {
                  [fieldName]: relativePath,
                });
                companyObj[fieldName] = baseUrl + "assets/" + relativePath;
                return;
              } catch (e) {
                console.error(
                  `Failed to save base64 ${fieldName} for company ${c._id}:`,
                  e
                );
              }
            }
          }

          // otherwise assume a stored relative path like 'companyprofile/xyz.mp4' and prefix with assets URL
          companyObj[fieldName] = baseUrl + "assets/" + str;
        };

        await handleField("image", "companyprofile");
        await handleField("video", "companyprofile");

        companies[i] = companyObj;
      }

      return res.status(200).json({
        success: true,
        data: companies,
      });
    } catch (error) {
      console.error("Error in GetUserCompanies:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // Unsecured API - Get user chambers only
  static GetUserChambers = async (req, res) => {
    try {
      let validator = new Validator(req.body, {
        username: "required",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          error: validator.errors,
        });
      }

      // Find user by username
      let user = await UserController.findUserByUsername(req.body.username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get all chambers for this user
      let chambers = await ChamberModel.find({ user_id: user._id });

      // Return raw data without URL manipulation

      return res.status(200).json({
        success: true,
        data: chambers,
      });
    } catch (error) {
      console.error("Error in GetUserChambers:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}
export default UserController;
