import express, { response } from "express"
import { Validator } from "node-input-validator";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { validatorError } from "../Common.js";
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import makeDir from "make-dir";
import fs from "fs"
import SendEmail from "../Utils/SendEmail.js";
import AdminModel from "../Models/Admin.js";
import UserModel from "../Models/User.js";
import MembershipModel from "../Models/Membership.js";
import BannerModel from "../Models/Banner.js";
import SystemModel from "../Models/Systemimage.js";
import FolderModel from "../Models/Folder.js";
import PaypalModel from "../Models/Paypal.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import ConfigurationModel from "../Models/Configuration.js";
import ReferralMembershipModel from "../Models/ReferralMembership.js";
import AdminNotificationModel from "../Models/AdminNotification.js";
import CategoryModel from "../Models/Category.js";
import moment from "moment/moment.js";
import { log } from "console";
import AdminTokenModel from "../Models/AdminToken.js";
import localStorage from 'localStorage'
import LogoModel from "../Models/Logo.js";
import ReferralMembershipStipePayment from "../Models/ReferralMembershipStipePayment.js";

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
const app = express()

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
      })
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors)
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
    } catch (error) {
    }
  };

  //.........ADMIN-LOGIN............
  static Adminlogin = async (req, res) => {
    var data = req.body;
    let validator = new Validator(data, {
      email: "required|email",
      password: "required",
    }, {
      email: "Email Is Necessary",
      password: "Password Is Necessary"
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      console.log(1);
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
          process.env.JWT_SECRET_KEY, { expiresIn: process.env.ACCESS_TOKEN_LIFE }
        );
        let tokendata = await AdminTokenModel.create({ token: token, User: user._id });
        await AdminModel.findByIdAndUpdate({ _id: user._id }, {
          fcmtoken: req.body.fcmtoken,
        });
        let user1 = await AdminModel.findById(user._id)
        localStorage.setItem('token', token)
        console.log("localStorage",)
        req.session.token = token
        req.session.tostMsg = "You Are Logged in Successfully..."
        req.session.tostBackground = "#0b6a3c"
        req.session.isTost = true
        return res.redirect("dashboard");
      }
    }
  }

  // ...........ADMIN-FORGOTPASSWORD............
  static ForgotPassword = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        email: "required|email",
      }, {
        email: "Enter your Email",
      });
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors)
        return res.render("Admin/ForgotPassword", { baseUrl, errors, path: "", });
      }
      const user = await AdminModel.findOne({ email: req.body.email });
      if (!user)
        return res.render("Admin/ForgotPassword", {
          baseUrl,
          errors: { email: "Your email may be wrong" },
          id: req.body.id,
        });
      let otp = Math.floor((Math.random() * 1000000) + 1) + " ";
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
      const result = otp1.concat("", otp2, "", otp3, "", otp4, "", otp5, "", otp6);
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
      console.log("error", error);
    }
  };

  // ............ADMIN-PASSWORDRESET...........
  static ResetPassword = async (req, res) => {
    try {
      let data = req.body;
      let validator = new Validator(data, {
        new_password: "required|minLength:7|maxLength:15",
        confirm_password: "required|same:new_password",
      })
      if (!(await validator.check())) {
        let errors = validatorError(res, validator.errors)
        return res.render("Admin/ChangePasswords", { baseUrl, errors, path: "", id: req.body.id, session: req.session });
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
        confirm_password: "required|same:new_password"
      })
      const matched = await validator.check()
      if (!matched) {
        let errors = validatorError(res, validator.errors)
        return res.render("Admin/Changepassword", { baseUrl, errors, path: "" });
      }

      let user = req.user
      const hashedPassword = bcrypt.hashSync(req.body.new_password, 10)
      await AdminModel.updateOne({
        _id: user._id
      }, {
        password: hashedPassword
      })
      console.log("hashedPassword", hashedPassword)
      const userData = await AdminModel.findOne({ _id: user._id })
      let jwt_secret = process.env.JWT_SECRET || 'mysecret'
      let token = jwt.sign({ data: userData }, jwt_secret, { expiresIn: '12h' })
      return res.redirect('signin')
    } catch (error) {
      return res.status(400).send({
        message: error.message,
        data: error
      })
    }
  }

  //..........ADMIN-LOGOUT...........
  static Adminlogout = async (req, res) => {
    var data = req.body;
    let tokenData = await AdminModel.findByIdAndUpdate(data._id, { token: req.session.token });
    req.session.token = null
    return res.status(200).send("User logout successfully.");
  }

  // ................MY-ACCOUNT..................
  static MyAccount = async (req, res) => {
    let data = req.body
    let validator = new Validator(
      data,
      {
        email: "required|email",
      });
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let myaccount = await UserModel.find({})
      res.render("Admin/Myaccount", {
        baseUrl,
        errors: error,
        myaccount: myaccount,
        path: "myaccount",
      });
    } else {
      if (req.body.myaccount_id != '') {
        const doc = await UserModel.findByIdAndUpdate(req.body.myaccount_id, {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          username: req.body.username,
          email: req.body.email,
          password: req.body.password
        })
      } else {
        const doc = new UserModel({
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          username: req.body.username,
          email: req.body.email,
          password: req.body.password
        })
        const result = await doc.save()
      }
      req.session.isTost = true
      req.session.tostMsg = "Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}dashboard`);
    }
  }

  // .........BANNER.............
  static Banner = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(data, {
      title: "required",
      link: "required|url",
      thumbnail: "required",

    }, {
      title: "Title is necessary",
      link: "Link is necessary",
      thumbnail: "Thumbnail is necessary",
    });

    const path = await makeDir("./assets/bannerimage/")
    let thumbnail = req.files?.thumbnail;
    let imagename;

    if (req.files?.thumbnail) {
      thumbnail = req.files?.thumbnail;
      var d = new Date()
      var photo = thumbnail.name
      photo = photo.replace(/\s/g, '')
      let r = (Math.random() + 1).toString(36).substring(7)
      var imname = d.getSeconds() + "." + r + "." + photo
      imagename = 'bannerimage/' + imname;
      let uploadPath = path + "/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Banner/AddBanner", { baseUrl, errors: error, path: "banner" })
    } else {
      const doc = new BannerModel({
        Title: req.body.title,
        Link: req.body.link,
        Banner: imagename
      })
      const result = await doc.save();
      req.session.tostMsg = "Banner Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/banner`);
    }
  }

  static EditBanner = async (req, res) => {
    let data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator({
      title: "required",
      link: "required|url",
      thumbnail: "required",

    }, {
      title: "Title is necessary",
      link: "Link is necessary",
      thumbnail: "Thumbnail is necessary",

    });
    let banner = await BannerModel.findById(req.body.id)
    const path = await makeDir("./assets/bannerimage/");
    let thumbnail;
    let imagename;
    if (req.files?.thumbnail != undefined) {
      const url = banner.Banner
      let filename = new URL(url).pathname.split('/').pop();
      let photo = path + "/" + filename;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      thumbnail = req.files?.thumbnail;
      var d = new Date()
      photo = thumbnail.name
      photo = photo.replace(/\s/g, '')
      let r = (Math.random() + 1).toString(36).substring(7)
      var imname = d.getSeconds() + "." + r + "." + photo
      let uploadPath = path + "/" + imname;
      imagename = 'bannerimage/' + imname;
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
        Banner: imagename
        ,
      });
      req.session.tostMsg = "Banner Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/banner`);
    }
  }

  static DeleteBanner = async (req, res) => {
    const banner1 = await BannerModel.findById(req.query.id)
    const path = await makeDir("./assets/bannerimage/");
    if (banner1.Banner) {
      const url = banner1.Banner;
      let filename = new URL(url).pathname.split('/').pop();
      let image = path + "/" + filename;
      if (fs.existsSync(image)) fs.unlinkSync(image);
    }
    const banner = await BannerModel.findByIdAndDelete(req.query.id)
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/banner`,
    });
  }


  // .....................MEMEBRSHIP[CONFIGURATION]...............
  static MembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        paypal: "required",
        // toncoin: "required",
      },
      {
        membershiperiod: " This Field is necessary",
        paypal: " This Field is necessary",
        // toncoin: " This Field is necessary",
      }
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
    }
    else {
      const doc = new MembershipModel({
        membershiperiod: req.body.membershiperiod,
        paypal: req.body.paypal,
        // toncoin: req.body.toncoin,
      });
      const result = await doc.save();
      req.session.tostMsg = "Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/membership`);
    }
  };

  static EditMembershipTenure = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        membershiperiod: "required",
        paypal: "required",
        // toncoin: "required",
      },
      {
        membershiperiod: " This Field is necessary",
        paypal: " This Field is necessary",
        // toncoin: " This Field is necessary",
      }
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let membership = await MembershipModel.findByIdAndUpdate(
        data.id
      );
      res.render("Configuration/EditMembership", {
        baseUrl,
        errors: error,
        membership: membership,
        path: "membership",
      });
    } else {
      const doc = await MembershipModel.findByIdAndUpdate(data.id, {
        membershiperiod: req.body.membershiperiod,
        paypal: req.body.paypal,
        // toncoin: req.body.toncoin,
      });
      req.session.isTost = true
      req.session.tostMsg = "Data Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}admin/membership`);
    }
  };

  static DeleteMembershipTenure = async (req, res) => {
    let membership = await MembershipModel.findByIdAndDelete(
      req.query.id
    );
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/membership`,
    });
  };

  // ............TONCOIN........................
  static ApproveToncoin = async (req, res) => {
    let toncoin = await ToncoinModel.findById(req.query.id)
    const user = await UserModel.findById(toncoin.user_id)
    var current = moment().format('YYYY-MM-DD');
    let date = null;
    if (user.enddate == null || user.enddate <= current) {
      date = current
    } else {
      date = user.enddate
    }
    let enddate = moment(date).add(toncoin.membershiperiod, 'y').format('YYYY-MM-DD');
    let users = await ToncoinModel.findByIdAndUpdate(toncoin._id, {
      status: 1,
      paymentstatus: 1,

    })
    let data = await UserModel.findByIdAndUpdate(user._id, {
      usertype: 1,
      startdate: current,
      paymentstatus: 1,
      enddate: enddate
    });
    return res.status(200).json({
      status: true,
    });
  }

  static RejectToncoin = async (req, res) => {
    let toncoin = await ToncoinModel.findById(req.query.id)
    const user = await UserModel.findById(toncoin.user_id)
    if (toncoin.status == 1) {
      var current = moment().format('YYYY-MM-DD');
      let enddate = moment(user.enddate).subtract(toncoin.membershiperiod, 'y').format('YYYY-MM-DD');
      let users = await UserModel.findByIdAndUpdate(user._id, {
        enddate: enddate
      })
    }
    await ToncoinModel.findByIdAndUpdate(toncoin._id, {
      status: 2,
      paymentstatus: 2,
    })
    let data = await UserModel.findByIdAndUpdate(user._id, {
      paymentstatus: 2
    });
    return res.status(200).json({
      status: true,
    });

  }

  static DeleteToncoin = async (req, res) => {
    let toncoin = await ToncoinModel.findById(req.query.id)
    const user = await UserModel.findById(toncoin.user_id)
    if (toncoin.status == 1) {
      var current = moment().format('YYYY-MM-DD');
      let enddate = moment(user.enddate).subtract(toncoin.membershiperiod, 'y').format('YYYY-MM-DD');
      let users = await UserModel.findByIdAndUpdate(user._id, {
        enddate: enddate
      })
    }
    let toncoins = await ToncoinModel.findByIdAndDelete(req.query.id)
    let data = await UserModel.findByIdAndUpdate(user._id, {
      paymentstatus: 2
    });
    return res.status(200).json({
      status: true,
    });
  }

  // .........................SYSTEM[CONFIGURATION]............................
  static SystemImages = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(data, {
      thumbnail: "required",
      categoryname: "required",
    }, {
      thumbnail: "Image is necessary",
      categoryname: " Category Selection is required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);

    const path = await makeDir("./assets/systemimage/");

    let details = {}
    if (error && JSON.stringify(error) != "{}") {

      let system = await SystemModel.find({});
      let categories = await CategoryModel.find({});

      res.render("Configuration/Addsystemimage", { baseUrl, errors: error, categories: categories, system: system, path: "system" })
    } else {
      let category = await SystemModel.findOne({ categoryname: req.body.categoryname });
      let image = req.files?.thumbnail;
      const images = []
      if (image) {
        if (Array.isArray(image)) {
          for (let i = 0; i < image.length; i++) {
            var d = new Date();
            let extension = image[i].name.split('.').pop();
            let r = (Math.random() + 1).toString(36).substring(7);
            var imname = d.getSeconds() + "." + r + "." + extension;
            images.push(imname)
            let uploadPath = path + "/" + imname;
            image[i].mv(uploadPath, function (err) {
              if (err) return res.status(500).send(err);
            });
          }
        } else {
          var d = new Date();
          let extension = image.name.split('.').pop();
          let r = (Math.random() + 1).toString(36).substring(7);
          var imname = d.getSeconds() + "." + r + "." + extension;
          let uploadPath = path + "/" + imname;
          image.mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err);
          });
          images.push(imname)
        }
      }
      // console.log("vinit",images);
      if (category != null) {
        if (category.Thumbnail != '') images.push(category.Thumbnail);
        details['Thumbnail'] = images.join();
        const doc = await SystemModel.findByIdAndUpdate(category._id, details);
      } else {
        const doc = new SystemModel({
          categoryname: req.body.categoryname,
          Thumbnail: images.join(),
        });
        const result = await doc.save();
      }
      req.session.tostMsg = "SystemImage Update Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/system`);
    }
  }


  static EditSystemImages = async (req, res) => {
    var data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(data, {
      categoryname: "required",
    }, {
      categoryname: " Category Selection is required",
    });
    await validator.check();
    let error = validatorError(res, validator.errors);
    const path = await makeDir("./assets/systemimage/");

    let details = {}
    if (error && JSON.stringify(error) != "{}") {

      let system = await SystemModel.find({});
      let categories = await CategoryModel.find({});
      res.redirect('back');

      res.render("Configuration/Editsystemimage", { baseUrl, errors: error, categories: categories, system: system, path: "system" })
    } else {
      let category = await SystemModel.findOne({ categoryname: req.body.categoryname });
      let image = req.files?.thumbnail;
      const images = []
      if (image) {
        if (Array.isArray(image)) {
          for (let i = 0; i < image.length; i++) {
            var d = new Date();
            let extension = image[i].name.split('.').pop();
            let r = (Math.random() + 1).toString(36).substring(7);
            var imname = d.getSeconds() + "." + r + "." + extension;
            images.push(imname)
            let uploadPath = path + "/" + imname;
            image[i].mv(uploadPath, function (err) {
              if (err) return res.status(500).send(err);
            });
          }
        } else {
          var d = new Date();
          let extension = image.name.split('.').pop();
          let r = (Math.random() + 1).toString(36).substring(7);
          var imname = d.getSeconds() + "." + r + "." + extension;
          let uploadPath = path + "/" + imname;
          image.mv(uploadPath, function (err) {
            if (err) return res.status(500).send(err);
          });
          images.push(imname)
        }
      }
      if (category != '') {
        if (category.Thumbnail != '') images.push(category.Thumbnail);
        details['Thumbnail'] = images.join();
        const doc = await SystemModel.findByIdAndUpdate(category._id, details);
      } else {
        const doc = new SystemModel({
          categoryname: req.body.categoryname,
          Thumbnail: images.join(),
        });
        const result = await doc.save();
      }

      req.session.tostMsg = "SystemImage Update Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/system`);
    }
  }



  static Deletesystempic = async (req, res) => {
    var id = req.query.id;
    var newarray = id.split('-');
    var uid = newarray[0];
    var uname = newarray[1];
    const path = await makeDir("./assets/systemimage/")
    let system = await SystemModel.findById(uid);
    var gT = system.Thumbnail;
    var gt1 = gT.split(',');
    gt1 = gt1.filter(function (item) {
      return item !== uname
    })
    if (system.Thumbnail) {
      const url = system.Thumbnail
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
  }



  static DeletesystemImages = async (req, res) => {
    let systems = await SystemModel.findById(req.query.id);
    const path = await makeDir("./assets/systemimage/");
    if (systems.Thumbnail) {
      let thumbnail = req.files?.thumbnail;
      let photo = path + "/" + thumbnail;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
    const system = await SystemModel.findByIdAndDelete(req.query.id)
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
      }
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
      req.session.tostMsg = "Data Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
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
      }
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let folder = await FolderModel.findByIdAndUpdate(
        req.body.id
      )
      res.render("Configuration/Editfolder", {
        baseUrl,
        errors: error,
        folder: folder,
        path: "folder",
      });
    } else {
      const doc = await FolderModel.findByIdAndUpdate(req.body.id, {
        Folder: req.body.folder,
      })
      req.session.isTost = true
      req.session.tostMsg = " Data Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}admin/folder`);
    }
  }

  static DeleteFolder = async (req, res) => {
    let folder = await FolderModel.findByIdAndDelete(
      req.query.id
    );
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/folder`,
    });

  }

  // ......................DELETEUSERS[FREEUSER,PREMIUM,DONATED].....................
  static DeleteUser = async (req, res) => {
    let user = await UserModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/freeuser`,
    });
  }

  static UpdateUser = async (req, res) => {
    try {
      const user = await UserModel.findById(req.query.id)
      await UserModel.findByIdAndUpdate(user._id, {
        status: 1
      });
      req.session.tostMsg = " Switched Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      return res.status(200).json({
        status: true,
        Url: `${baseUrl}admin/premium`,
      });
    } catch (error) {
    }
  }

  static ViewUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id)
    res.render("User/Viewuser", { baseUrl, user: user, path: "user", })
  }

  static DeletePremiumUser = async (req, res) => {
    let user = await UserModel.findByIdAndDelete(req.query.id);
    let premium = await ToncoinModel.deleteMany({ user_id: req.query.id })
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/premium`,
    });

  }

  static UpdatePremiumUser = async (req, res) => {
    try {
      const user = await UserModel.findById(req.query.id)
      await UserModel.findByIdAndUpdate(user._id, {
        usertype: 2
      });
      req.session.tostMsg = "Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      return res.status(200).json({
        status: true,
        Url: `${baseUrl}admin/premium`,
      });
    } catch (error) {
    }
  }

  static ViewPremiumUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id)
    res.render("User/Viewpremium", { baseUrl, user: user, path: "user", })
  }

  static DeleteDonatedUser = async (req, res) => {
    let user = await UserModel.findByIdAndDelete(req.query.id);
    let premium = await ToncoinModel.deleteMany({ user_id: req.query.id })
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
      Url: `${baseUrl}admin/donateduser`,
    });

  }

  static ViewDonatedUser = async (req, res) => {
    let user = await UserModel.findById(req.query.id)
    res.render("User/Viewdonate", { baseUrl, user: user, path: "user", })

  }

  // ....................CONFIGURATION(KEY-VALUE)...................
  static Configuration = async (req, res) => {
    let configuration = await ConfigurationModel.find({});
    res.render('Configuration/Configuration', { baseUrl, configuration: configuration, path: 'configuration', session: req.session });
  }

  static add_configuration = async (req, res) => {
    res.render('Configuration/Addconfiguration', { baseUrl, data: {}, path: 'configuration' });
  }

  static edit_configuration = async (req, res) => {
    let configuration = await ConfigurationModel.findById(req.query.id)
    res.render('Configuration/Editconfiguration', { baseUrl, configuration: configuration, path: 'configuration' });
  }

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
      }
    );
    if (!(await validator.check())) {
      let errors = validatorError(res, validator.errors)
      return res.render("Configuration/Addconfiguration", { baseUrl, errors, path: "configuration" });
    }
    let data1 = await ConfigurationModel.findOne({ ConfigKey: data.configkey })
    if (data1) {
      res.render("Configuration/Addconfiguration", {
        baseUrl,
        message: "Choose Different Key",
        path: "configuration"
      })
    } else {
      const doc = new ConfigurationModel({
        ConfigKey: req.body.configkey,
        ConfigValue: req.body.configvalue,
        Status: req.body.status,
      });
      const result = await doc.save();
      req.session.tostMsg = "Data Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
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
      }
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let configuration = await ConfigurationModel.findByIdAndUpdate(
        req.body.id
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
      req.session.isTost = true
      req.session.tostMsg = " Data Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}admin/configuration`);
    }
  };

  static deleteconfiguration = async (req, res) => {
    let configuration = await ConfigurationModel.findByIdAndDelete(
      req.query.id
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
    res.render("Configuration/Category", { baseUrl, categories: categories, path: 'categories', session: req.session })
  }

  static Addcategories = async (req, res) => {
    let categories = await CategoryModel.find({});
    res.render('Configuration/AddCategory', { baseUrl, data: {}, categories: categories, path: 'categories' });
  }

  static Editcategories = async (req, res) => {
    let categories = await CategoryModel.findById(req.query.id)
    res.render('Configuration/EditCategory', { baseUrl, categories: categories, path: 'categories' });
  }

  static Category = async (req, res) => {
    let data = req.body;
    let validator = new Validator(
      data,
      {
        categoryname: "required",
      },
      {
        title: "The Category  is necessary",
      }
    );
    if (!(await validator.check())) {
      let errors = validatorError(res, validator.errors)
      return res.render("Configuration/AddCategory", { baseUrl, errors, path: "categories" });
    }
    let data1 = await CategoryModel.findOne({ categoryname: data.categoryname })
    if (data1) {
      res.render("Configuration/AddCategory", {
        baseUrl,
        message: "Choose Different Category Name",
        path: "categories"
      })
    } else {
      const doc = new CategoryModel({
        categoryname: req.body.categoryname,
      });
      const result = await doc.save();
      req.session.tostMsg = "Data Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
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
      }
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
      req.session.isTost = true
      req.session.tostMsg = " Data Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}admin/categories`);
    }
  }

  static Deletecategory = async (req, res) => {
    let categories = await CategoryModel.findByIdAndDelete(req.query.id)
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/categories`,
    });
  };
  // .........LOGO.............
  static Logo = async (req, res) => {
    var data = req.body;
    console.log("DATA", data)
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator(data, {
      link: "required|url",
      thumbnail: "required",

    }, {
      link: "Link is necessary",
      thumbnail: "Thumbnail is necessary",
    });

    const path = await makeDir("./assets/logoimage/")
    let thumbnail = req.files?.thumbnail;
    let imagename;

    if (req.files?.thumbnail) {
      thumbnail = req.files?.thumbnail;
      var d = new Date()
      var photo = thumbnail.name
      photo = photo.replace(/\s/g, '')
      let r = (Math.random() + 1).toString(36).substring(7)
      var imname = d.getSeconds() + "." + r + "." + photo
      imagename = 'logoimage/' + imname;
      let uploadPath = path + "/" + imname;
      thumbnail.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
      });
    }
    await validator.check();
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      res.render("Configuration/AddLogo", { baseUrl, errors: error, path: "logo" })
    } else {
      const doc = new LogoModel({
        Link: req.body.link,
        Banner: imagename
      })
      const result = await doc.save();
      req.session.tostMsg = "Logo Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/logo`);
    }
  }

  static EditLogo = async (req, res) => {
    let data = req.body;
    data.thumbnail = req.files?.thumbnail;
    let validator = new Validator({
      link: "required|url",
      thumbnail: "required",
    }, {
      link: "Link is necessary",
      thumbnail: "Thumbnail is necessary",
    });
    let logo = await LogoModel.findById(req.body.id)
    const path = await makeDir("./assets/logoimage/");
    let thumbnail;
    let imagename;
    if (req.files?.thumbnail != undefined) {
      const url = logo.Banner
      let filename = new URL(url).pathname.split('/').pop();
      let photo = path + "/" + filename;
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
      thumbnail = req.files?.thumbnail;
      var d = new Date()
      photo = thumbnail.name
      photo = photo.replace(/\s/g, '')
      let r = (Math.random() + 1).toString(36).substring(7)
      var imname = d.getSeconds() + "." + r + "." + photo
      let uploadPath = path + "/" + imname;
      imagename = 'logoimage/' + imname;
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
        Banner: imagename
        ,
      });
      req.session.tostMsg = "Logo Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
      res.redirect(`${baseUrl}admin/logo`);
    }
  }

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
      }
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
    }
    else {
      const doc = new ReferralMembershipModel({
        membershiperiod: req.body.membershiperiod,
        price: req.body.price,
        // toncoin: req.body.toncoin,
      });
      const result = await doc.save();
      req.session.tostMsg = "Added Successfully..."
      req.session.tostBackground = "#0b6a3c"
      req.session.isTost = true
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
      }
    );
    await validator.check();
    // validation error
    let error = validatorError(res, validator.errors);
    if (error && JSON.stringify(error) != "{}") {
      let referralmembership = await ReferralMembershipModel.findByIdAndUpdate(
        data.id
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
      req.session.isTost = true
      req.session.tostMsg = "Data Updated Successfully..."
      req.session.tostBackground = "#0b6a3c"
      res.redirect(`${baseUrl}admin/referralmembership`);
    }
  };

  static DeleteReferralMembershipTenure = async (req, res) => {
    let referralmembership = await ReferralMembershipModel.findByIdAndDelete(
      req.query.id
    );
    return res.status(200).json({
      status: true,
      message: "deleted successfully.",
      Url: `${baseUrl}admin/referralmembership`,
    });
  };

  static Notificationcount = async (req, res) => {
    let notification = await AdminNotificationModel.find({ "status": 0 }).count();
    return res.status(200).json({
      success: true,
      data: notification,
    });
  }

  static DeletNotifaction = async (req, res) => {
    let user = await AdminNotificationModel.findByIdAndDelete(req.query.id);
    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  }

  static DeleteStripeDetail = async (req, res) => {
    await ReferralMembershipStipePayment.findByIdAndDelete(req.query.id);

    return res.status(200).json({
      status: true,
      message: "Deleted successfully.",
    });
  }


}

export default AdminController


