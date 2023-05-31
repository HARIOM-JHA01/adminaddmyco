import express from "express";
import { Validator } from "node-input-validator";
import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { validatorError, createRandomLink, decrypt, assets } from "../Common.js";
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import makeDir from "make-dir";
import fs from "fs";
import fsExtra from 'fs-extra';
import path from "path";
import handlebars from "handlebars";
import nodemailer from "nodemailer";
import SystemModel from "../Models/Systemimage.js";
import UserModel from "../Models/User.js";
import PaypalModel from "../Models/Paypal.js";
import CountryModel from "../Models/Country.js";
import MembershipModel from "../Models/Membership.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import CompanyModel from "../Models/Company.js";
import ChamberModel from "../Models/Chamber.js";
import BackgroundModel from "../Models/Background.js"
import NotificationModel from "../Models/Notification.js"
import BannerModel from "../Models/Banner.js";
import ContactModel from "../Models/Contact.js"
import FolderModel from "../Models/Folder.js";
import ConfigurationModel from "../Models/Configuration.js";
import ContactFolderModel from "../Models/ContactFolder.js";
import ImageModel from "../Models/Image.js";
import moment from "moment";
import mime from "mime"
import mongoose from "mongoose";
// import LogoModel from "../Models/Logo.js";
import crypto from "crypto"
// import UserTokenModel from "../Models/UserToken.js"
import user from "../Routes/User.js"

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
const app = express();

class UserController {

    // ...............USER-REGISTER...............
    static Register1 = async (req, res) => {
        try {
            var transporter = nodemailer.createTransport({
                host: 'smtp-relay.sendinblue.com',
                port: 587,
                auth: {
                    user: "gaumji009@gmail.com",
                    pass: "zHwtvEd0XVT4xhaO"
                }
            });
            let mailOptions = {
                from: "info@addmy.co",
                to: 'ankit.borad93@gmail.com',
                subject: "Testing purpose email for otp",
                text: `Hello This is your otp:`,
            };
            transporter.sendMail(mailOptions, (err, info) => {
                let f;
                if (err) console.log("message", err);
                if (info) {
                    console.log("email send successfully:", info);
                }
                console.log('asd');
            });
            console.log("send");
        } catch (err) {
            console.log(err);
        }
    }

    static Register = async (req, res) => {
        try {
            let data = req.body;
            let validator = new Validator(data, {
                username: "required|maxLength:16|minLength:5",
                tgid: "required",
                email: "required|email",
                country: "required"
            })
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
                    message: "This User is Already Register..."
                });
            }
            let mail = await UserModel.findOne({ email: data.email });
            if (mail) {
                return res.status(422).json({
                    success: false,
                    message: "This Email is Already in Use..."
                });
            }
            const { username, email, tgid, country, status, } = req.body;
            const doc = new UserModel({
                username: username,
                email: email,
                tgid: tgid,
                country: country,
                status: status
                // password: hashedPassword,
            });

            const filePath = path.join(__dirname, '/Views/User/email.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            try {
                var transporter = nodemailer.createTransport({
                    host: 'smtp-relay.sendinblue.com',
                    port: 587,
                    auth: {
                        user: "gaumji009@gmail.com",
                        pass: "zHwtvEd0XVT4xhaO"
                    }
                });


                var randomstring = Math.floor(Math.random() * (100000 - 999999 + 1) + 999999);;
                const replacements = {
                    username: tgid,
                    password: randomstring,
                    message: 'Hello  \n Greetings from addmy.co \n You have successfully registered to our portal and ready to create your digital contact card. \n Please use below details to login',
                };
                let htmltoSend = template(replacements);
                let sendMail = await transporter.sendMail({
                    from: 'info@addmy.co',
                    to: req.body.email,
                    subject: 'You have Registered successfully',
                    html: htmltoSend
                })
            } catch (error) {
            }
            var countrycount = await UserModel.find({ country: data.country }).count();
            var srt2 = countrycount + 1;
            var srt = srt2.toString();
            var srt1 = "000000000000";
            var id = req.body.countryCode + '-' + srt1.slice(0, -srt.length) + srt;
            const result = await doc.save();
            const salt = await bcrypt.genSalt(10);
            const passwordToString = randomstring.toString()
            const hashedPassword = await bcrypt.hash(passwordToString, salt);
            await UserModel.findByIdAndUpdate({ _id: result._id }, {
                password: hashedPassword,
                memberid: id
            })
            const result1 = await UserModel.findById(result._id);
            return res.status(200).json({
                success: true,
                data: result1,
                message: "Register successfully..."
            });
        } catch (error) {
        }
    };

    // ...................USERNAME....................
    static Username = async (req, res) => {
        try {
            let data = req.body;
            var username = crypto.randomBytes(4).toString('hex')
            return res.status(200).json({
                success: true,
                username: username,
            })
        } catch (error) {
        }
    }


    static Login = async (req, res) => {
        var data = req.body;
        let validator = new Validator(data, {
            username: "required",
            password: "required",
        })
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
            await UserModel.findByIdAndUpdate({ _id: user._id }, {
                token: accessToken,
                fcmtoken: req.body.fcmtoken,
            });
            req.session.token = accessToken
            // console.log("req.session", req.session.token);
            let user1 = await UserModel.findById(user._id)
            return res.status(200).json({
                success: true,
                data: user1,
                message: "AddProfile Login Successfully..."
            })
        }
    }

    static Language = async (req, res) => {
        const user = await UserModel.findById(req.user._id)
        let language = await UserModel.findByIdAndUpdate(user._id, {
            languagetype: req.body.languagetype
        });
        return res.status(200).json({
            success: true,
        });
    }

    static ForgotPassword = async (req, res) => {
        let data = req.body;
        let validator = new Validator(data, {
            email: "required",
        })
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        }
        var email = req.body.email;
        if (email.indexOf('@') == -1) {
            var users = await UserModel.findOne({ username: req.body.email });
            var message = "Your User Name may be wrong...";
        } else {
            var users = await UserModel.findOne({ email: req.body.email });
            var message = "Your email may be wrong...";
        }
        if (!users) {
            return res.status(422).json({
                success: false,
                message: message
            });
        }
        const filePath = path.join(__dirname, '/Views/User/email.html');
        const source = fs.readFileSync(filePath, 'utf-8').toString();
        const template = handlebars.compile(source);
        var transporter = nodemailer.createTransport({
            host: 'smtp-relay.sendinblue.com',
            port: 587,
            auth: {
                user: "gaumji009@gmail.com",
                pass: "zHwtvEd0XVT4xhaO"
            }
        });
        var randomstring = Math.floor(Math.random() * (100000 - 999999 + 1) + 999999);
        const replacements = {
            username: users.tgid,
            password: randomstring,
            message: 'We have received your request to reset your password.\n Please find your new login details as below',
        };

        let htmltoSend = template(replacements);
        let info = await transporter.sendMail({
            from: 'info@addmy.co',
            to: req.body.email,
            subject: 'Your password request on addmy.co',
            html: htmltoSend
        })

        const salt = await bcrypt.genSalt(10);
        const passwordToString = randomstring.toString()
        const hashedPassword = await bcrypt.hash(passwordToString, salt);
        const result = await UserModel.findByIdAndUpdate({ _id: users._id }, {
            password: hashedPassword,
        })
        const result1 = await UserModel.findById(result._id);
        return res.status(200).json({
            success: true,
            data: result1,
        });
    }

    // ......................USERSPROFILE......................
    static AddProfile = async (req, res) => {
        var data = req.body;
        data.profile_image = req.files?.profile_image;
        data.video = req.files?.video;
        let validator = new Validator(data, {
            owner_name_english: "required",
            owner_name_chinese: "required",
            telegramId: "required",
            email: "required|email",
            contact: "required",
            address1: "required",
            address2: "required",
            address3: "required",
        })
        console.log("validator", validator)
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        }
        let mail = await UserModel.findOne({ email: data.email });
        const path = await makeDir("./assets/profileimage/")
        let pic = await UserModel.findById(req.user._id)
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
        }
        // .....image......

        if (req.files?.profile_image !== undefined && req.files?.profile_image !== null) {
            let photo = path + "/" + req.files?.profile_image;
            if (fs.existsSync(photo)) fs.unlinkSync(photo);
            let profile_image = req.files?.profile_image;
            var d = new Date()
            photo = profile_image.name
            photo = photo.replace(/\s/g, ' ')
            let r = (Math.random() + 1).toString(36).substring(7)
            var imname = d.getSeconds() + "." + r + "." + photo
            let uploadPath = path + "/" + imname;
            profile_image.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
            });
            doc['profile_image'] = "profileimage/" + imname
        }

        //....................video................  
        if (req.files?.video != undefined && req.files?.video != null) {
            let photo = path + "/" + req.files?.video;
            if (fs.existsSync(photo)) fs.unlinkSync(photo);
            let video = req.files?.video;
            var d = new Date()
            photo = video.name
            photo = photo.replace(/\s/g, '')
            let r = (Math.random() + 1).toString(36).substring(7)
            var imname = d.getSeconds() + "." + r + "." + photo
            let uploadPath = path + "/" + imname;
            video.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
            });
            doc['video'] = "profileimage/" + imname
        }
        const result = await UserModel.findByIdAndUpdate(req.user._id, doc)
        let user = await UserModel.findByIdAndUpdate(result._id, {
            profilestatus: 1
        });
        let data1 = await UserModel.findById(user._id)
        return res.status(200).json({
            success: true,
            data: data1,
            message: "Data Added Successfully..."
        })
    }

    static UpdateProfile = async (req, res) => {
        var data = req.body;
        data.profile_image = req.files?.profile_image;
        data.video = req.files?.video;
        let validator = new Validator(data, {
            owner_name_english: "required",
            owner_name_chinese: "required",
            telegramId: "required",
            email: "required",
            contact: "required",
            address1: "required",
            address2: "required",
            address3: "required",
        })
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        } else {
            const path = await makeDir("./assets/profileimage/")
            let pic = await UserModel.findById(req.params.id)
            const doc = {
                username: req.body.username,
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
                tags: req.body.tags,
                user_id: req.user._id,
                // image: imagename
            }

            // .................image.....................
            if (req.files?.profile_image != undefined) {
                let photo = path + "/" + req.files?.profile_image;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);
                let profile_image = req.files?.profile_image;
                var d = new Date()
                photo = profile_image.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo
                let uploadPath = path + "/" + imname;
                profile_image.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['profile_image'] = "profileimage/" + imname
                doc['video'] = ""
            }

            //...video......  
            if (req.files?.video != undefined) {
                let photo = path + "/" + req.files?.video;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);
                let video = req.files?.video;
                var d = new Date()
                photo = video.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo
                let uploadPath = path + "/" + imname;
                video.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['video'] = "profileimage/" + imname
                doc['profile_image'] = ""
            }
            const result = await UserModel.findByIdAndUpdate(req.params.id, doc)
            console.log("123", result)
            const user1 = await UserModel.findById(result._id)
            let usercontact1 = await ContactModel.find({ status: 1, contact_id: req.user._id })
            for (var i = 0; i < usercontact1.length; i++) {
                var contact_id = usercontact1[i].contact_id
                var user_id = usercontact1[i].user_id
                const doc = {
                    user_id: contact_id,
                    contact_id: user_id,
                    message: `${req.user.owner_name_english} has changed their Profile data`
                }
                let notification = await NotificationModel.create(doc)
            }
            return res.status(200).json({
                success: true,
                data: user1,
                message: "Data Updated Successfully..."
            })
        }
    }

    static GetProfile = async (req, res) => {
        let logoDetails = await LogoModel.findOne()
        console.log("logoDetails", logoDetails);
        let profile = await UserModel.aggregate([
            {
                $match: {
                    _id: req.user._id
                }
            },
            {
                "$lookup": {
                    "from": "backgrounds",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "theme"
                }
            },
            { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
            // {
            //     "$lookup": {
            //         "from": "logos",
            //         "localField": "_id",
            //         "foreignField": "user_id",
            //         "as": "logo"
            //     }
            // },
            // { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "companydata"
                }
            },
            { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } }
        ])
        console.log("?", profile[0]['refstatue']);
        profile[0]['logoImage'] = logoDetails.Banner
        profile[0]['logoTelegramUrl'] = logoDetails.Link
        if (profile[0]['profile_image'] != '') {
            profile[0]['profile_image'] = baseUrl + 'assets/' + profile[0]['profile_image'];
            profile[0]['video'] = ''
        }
        if (profile[0]['video'] != '') {
            profile[0]['video'] = baseUrl + 'assets/' + profile[0]['video'];
            profile[0]['profile_image'] = ''
        }
        if (!profile[0]['refstatue']) {
            profile[0]['refstatue'] = 0
        }
        if (!profile[0]['refimgstatue']) {
            profile[0]['refimgstatue'] = 0
        }
        if (!profile[0]['logoImage']) {
            profile[0]['logoImage'] = ''
        }
        if (!profile[0]['logoTelegramUrl']) {
            profile[0]['logoTelegramUrl'] = ''
        }
        console.log(" profile[0]", profile[0]);
        return res.status(200).json({
            success: true,
            data: profile[0],
        });
    }

    static Getprofile = async (req, res) => {
        let profile = await UserModel.aggregate([
            {
                $match: {
                    username: req.params.id
                }
            },
            {
                "$lookup": {
                    "from": "backgrounds",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "theme"
                }
            },
            { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "companydata"
                }
            },
            { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } }
        ])
        if (profile != '') {
            if (profile[0]['profile_image'] != '') {
                profile[0]['profile_image'] = baseUrl + 'assets/' + profile[0]['profile_image'];
                profile[0]['video'] = ''
            }
            if (profile[0]['video'] != '') {
                profile[0]['video'] = baseUrl + 'assets/' + profile[0]['video'];
                profile[0]['profile_image'] = ''
            }
            var profiledata = profile[0];
        } else {
            var profiledata = '';
        }
        console.log("Profile", profile)

        return res.status(200).json({
            success: true,
            data: profiledata,
        });
    }

    static Getprofiles = async (req, res) => {
        //console.log("username",req.params.id)
        let profile = await UserModel.aggregate([
            {
                $match: {
                    username: req.body.username
                }
            },
            {
                "$lookup": {
                    "from": "backgrounds",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "theme"
                }
            },
            { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } },
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "companydata"
                }
            },
            { $unwind: { path: "$companydata", preserveNullAndEmptyArrays: true } }
        ])
        if (profile != '') {
            if (profile[0]['profile_image'] != '') {
                profile[0]['profile_image'] = baseUrl + 'assets/' + profile[0]['profile_image'];
                profile[0]['video'] = ''
            }
            if (profile[0]['video'] != '') {
                profile[0]['video'] = baseUrl + 'assets/' + profile[0]['video'];
                profile[0]['profile_image'] = ''
            }
            var profiledata = profile[0];
        } else {
            var profiledata = '';
        }
        console.log("Profile", profile)

        return res.status(200).json({
            success: true,
            data: profiledata,
        });
    }

    static DeleteProfile = async (req, res) => {
        let profile1 = await UserModel.findById(req.params.id)
        const path = await makeDir("./assets/profileimage/")
        if (profile1.image) {
            const url = profile1.image
            let filename = new URL(url).pathname.split('/').pop();
            let image = path + "/" + filename;
            if (fs.existsSync(image)) fs.unlinkSync(image);
        }
        let profile = await UserModel.findByIdAndDelete(req.params.id)
        return res.status(200).json({
            success: true,
            message: "Data Deleted Successfully...",
        });
    }

    static Landingpage = async (req, res) => {
        let company = await UserModel.aggregate([
            {
                $match: {
                    _id: req.user._id
                }
            },
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "userDoc"
                }
            }
        ])
        if (company[0]['profile_image'] != '' && company[0]['profile_image'] != undefined && company[0]['profile_image'] != null) {
            company[0]['profile_image'] = baseUrl + 'assets/' + company[0]['profile_image'];
            company[0]['video'] = ''
        }
        if (company[0]['video'] != '' && company[0]['video'] != undefined && company[0]['video'] != null) {
            company[0]['video'] = baseUrl + 'assets/' + company[0]['video'];
            company[0]['profile_image'] = ''
        }
        return res.status(200).json({
            success: true,
            data: company,
        });
    }

    static GetLandingpage = async (req, res) => {
        let user = await UserModel.findOne({ "username": req.body.username })
        if (user) {
            let company = await UserModel.aggregate([
                {
                    $match: {
                        _id: user._id
                    }
                },
                {
                    "$lookup": {
                        "from": "companies",
                        "localField": "_id",
                        "foreignField": "user_id",
                        "as": "userDoc"
                    }
                },
                {
                    "$lookup": {
                        "from": "backgrounds",
                        "localField": "_id",
                        "foreignField": "user_id",
                        "as": "theme"
                    }
                },
                { $unwind: { path: "$theme", preserveNullAndEmptyArrays: true } }
            ])
            if (company[0]['profile_image'] != '') {
                company[0]['profile_image'] = baseUrl + 'assets/' + company[0]['profile_image'];
                company[0]['video'] = ''
            }
            if (company[0]['video'] != '') {
                company[0]['video'] = baseUrl + 'assets/' + company[0]['video'];
                company[0]['profile_image'] = ''
            }
            if (company) {
                return res.status(200).json({
                    success: true,
                    data: company,
                });
            } else {
                return res.status(422).json({
                    success: false,
                    message: 'Record not found...',
                });
            }
        } else {
            return res.status(422).json({
                success: false,
                message: 'User not found...',
            });
        }
    };

    static Companyprofile = async (req, res) => {
        var data = req.body;

        data.image = req.files?.image;
        let validator = new Validator(data, {
            company_name_english: "required",
            company_name_chinese: "required",
            companydesignation: "required",
            telegramId: "required",
        })
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        } else {
            const path = await makeDir("./assets/companyprofile/")
            let pic = await UserModel.findById(req.user._id)
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
                company_order: req.body.company_order,
                user_id: req.user._id,
                // video: imagename
            }

            if (req.files?.image != undefined) {
                let photo = path + "/" + req.files?.image;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);

                let image = req.files?.image;
                var d = new Date()
                photo = image.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo
                // imagename = 'profileimage/' + imname;
                let uploadPath = path + "/" + imname;
                image.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['image'] = "companyprofile/" + imname
                image = baseUrl + "assets/companyprofile/" + imname
            }

            if (req.files?.video != undefined) {
                let photo = path + "/" + req.files?.video;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);

                let video = req.files?.video;
                var d = new Date()
                photo = video.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo

                let uploadPath = path + "/" + imname;
                video.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['video'] = "companyprofile/" + imname
                video = baseUrl + "assets/companyprofile/" + imname
            }


            let result = await CompanyModel.create(doc);
            let user = await UserModel.findByIdAndUpdate(req.user._id, {
                companystatus: 1
            });
            let data = await CompanyModel.findById(result._id)
            return res.status(200).json({
                success: true,
                data: data,
                message: "Data Added Successfully.."
            })
        }
    }

    static Updatecompanyprofile = async (req, res) => {
        var data = req.body;
        let datas = []
        var newdata = data.data;
        newdata.forEach(function (err, devices) {
            err.user_id = req.body.user_id;
            if (err.image != undefined) {
                if (err.image !== "") {
                    let result = err.image.search('base64');
                    if (result != -1) {
                        var matches = err.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/), response = {};
                        delete err['image']
                        response.type = matches[1];
                        response.data = new Buffer(matches[2], 'base64');
                        let decodedImg = response;
                        let imageBuffer = decodedImg.data;
                        let type = decodedImg.type;
                        let extension = mime.getExtension(type);
                        let r = (Math.random() + 1).toString(36).substring(7);
                        let fileName = r + '.' + extension;
                        try {
                            fs.writeFileSync("./assets/companyprofile/" + fileName, imageBuffer, 'utf8');
                            err['image'] = "companyprofile/" + fileName;
                        } catch (e) {
                        }
                    }
                }
            }

            if (err._id) {
                let id = err._id;
                CompanyModel.findByIdAndUpdate(id, err).then(doc => { }).then(data => { });
            } else {
                CompanyModel.create(err);
            }
        });


        let usercontact1 = await ContactModel.find({ status: 1, contact_id: req.user._id })
        for (var i = 0; i < usercontact1.length; i++) {
            var contact_id = usercontact1[i].contact_id
            var user_id = usercontact1[i].user_id
            const doc = {
                user_id: contact_id,
                contact_id: user_id,
                message: `${req.user.owner_name_english} has changed their company data`
            }
            let notification = await NotificationModel.create(doc)
        }
        return res.status(200).json({
            success: true,
            message: "Data Updated Successfully..."
        })
    }

    static video = async (req, res) => {
        try {
            let data = req.body;
            data.video = req.files?.video;
            const path = await makeDir("./assets/video/")
            let video = req.files?.video
            var d = new Date()
            photo = video.name;
            photo = photo.replace(/\s/g, '')
            let r = (Math.random() + 1).toString(36).substring(7)
            var imname = d.getSeconds() + "." + r + "." + photo
            let uploadphotoPath = path + "/" + imname;
            video.mv(uploadphotoPath, function (err) {
                if (err) return res.status(500).send(err);
            });
            data['video'] = "video/" + imname
            video = "video/" + imname
            var photo = [{
                'video': video,
            }];
            return res.status(200).json({
                success: true,
                data: photo
            })
        } catch (error) {
        }
    }

    static companyprofile = async (req, res) => {
        let company = await CompanyModel.find({ user_id: req.user._id })
        return res.status(200).json({
            success: true,
            data: company,
        });
    }

    static GetCompany = async (req, res) => {
        let user = await UserModel.findOne({ "username": req.body.username })
        if (user) {
            let company = await CompanyModel.find({ user_id: user._id })
            if (company) {
                return res.status(200).json({
                    success: true,
                    data: company,
                });
            } else {
                return res.status(422).json({
                    success: false,
                    message: 'Record not found...',
                });
            }
        } else {
            return res.status(422).json({
                success: false,
                message: 'User not found...',
            });
        }
    };


    static Deletecompanyprofile = async (req, res) => {
        let company1 = await CompanyModel.findById(req.params.id)
        const path = await makeDir("./assets/companyprofile/")
        if (company1.video) {
            const url = company1.video
            let filename = new URL(url).pathname.split('/').pop();
            let image = path + "/" + filename;
            if (fs.existsSync(image)) fs.unlinkSync(image);
        }
        let company = await CompanyModel.findByIdAndDelete(req.params.id)
        return res.status(200).json({
            success: true,
            message: "Data Deleted Successfully...",
        });
    }

    static DeleteMyallcompany = async (req, res) => {
        try {
            let companydata = await CompanyModel.deleteMany({ user_id: req.user._id })
            const folder = './assets/companyprofile'
            fsExtra.emptyDirSync(folder)
            return res.status(200).json({
                success: true,
                message: "Successfully Deleted...",
            })
        }
        catch (error) {
        }
    }

    static DeleteAllcompany = async (req, res) => {
        try {
            let companydata = await CompanyModel.deleteMany()
            const folder = './assets/companyprofile'
            fsExtra.emptyDirSync(folder)
            return res.status(200).json({
                success: true,
                message: "Successfully Deleted...",
            })
        }
        catch (error) {
        }
    }

    // ................CHAMBER......................
    static Chamber = async (req, res) => {
        var data = req.body;
        data.video = req.files?.video;
        let validator = new Validator(data, {
            chamber_name_english: "required",
            chamber_name_chinese: "required",
            chamberdesignation: "required",
            chamberwebsite: "required",
        })
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        } else {
            const path = await makeDir("./assets/chamber/")
            let pic = await UserModel.findById(req.user._id)
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
                user_id: req.user._id,
                // video: imagename 
            }
            if (req.files?.image != undefined) {
                let photo = path + "/" + req.files?.image;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);

                let image = req.files?.image;
                var d = new Date()
                photo = image.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo
                let uploadPath = path + "/" + imname;
                image.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['image'] = "chamber/" + imname
                image = baseUrl + "assets/chamber/" + imname
            }

            if (req.files?.video != undefined) {
                let photo = path + "/" + req.files?.video;
                if (fs.existsSync(photo)) fs.unlinkSync(photo);

                let video = req.files?.video;
                var d = new Date()
                photo = video.name
                photo = photo.replace(/\s/g, '')
                let r = (Math.random() + 1).toString(36).substring(7)
                var imname = d.getSeconds() + "." + r + "." + photo
                let uploadPath = path + "/" + imname;
                video.mv(uploadPath, function (err) {
                    if (err) return res.status(500).send(err);
                });
                doc['video'] = "chamber/" + imname
                video = baseUrl + "assets/chamber/" + imname
            }

            let result = await ChamberModel.create(doc);
            return res.status(200).json({
                success: true,
                data: result,
                message: "Data Added Successfully.."
            })
        }
    }

    static UpdateChamber = async (req, res) => {
        var data = req.body;
        let datas = []
        var newdata = data.data;
        newdata.forEach(function (err, devices) {
            err.user_id = req.body.user_id;
            if (err.image != undefined) {
                if (err.image !== "") {
                    let result = err.image.search('base64');
                    if (result != -1) {
                        var matches = err.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/), response = {};
                        delete err['image']
                        response.type = matches[1];
                        response.data = new Buffer(matches[2], 'base64');
                        let decodedImg = response;
                        let imageBuffer = decodedImg.data;
                        let type = decodedImg.type;
                        let extension = mime.getExtension(type);
                        let r = (Math.random() + 1).toString(36).substring(7);
                        let fileName = r + '.' + extension;
                        try {
                            fs.writeFileSync("./assets/chamber/" + fileName, imageBuffer, 'utf8');
                            err['image'] = "chamber/" + fileName;
                        } catch (e) {
                        }
                    }
                }
            }
            if (err._id) {
                let id = err._id;
                ChamberModel.findByIdAndUpdate(id, err).then(doc => { }).then(data => { });
            } else {
                ChamberModel.create(err);
            }
        });
        let usercontact1 = await ContactModel.find({ status: 1, contact_id: req.user._id })
        for (var i = 0; i < usercontact1.length; i++) {
            var contact_id = usercontact1[i].contact_id
            var user_id = usercontact1[i].user_id
            const doc = {
                user_id: contact_id,
                contact_id: user_id,
                message: `${req.user.owner_name_english} has changed their chamber data`
            }
            let notification = await NotificationModel.create(doc)
        }
        return res.status(200).json({
            success: true,
            message: "Data Updated Successfully..."
        })
    }

    static Chambervideo = async (req, res) => {
        try {
            let data = req.body;
            data.video = req.files?.video;
            const path = await makeDir("./assets/chambervideo/")
            let video = req.files?.video
            var d = new Date()
            photo = video.name;
            photo = photo.replace(/\s/g, '')
            let r = (Math.random() + 1).toString(36).substring(7)
            var imname = d.getSeconds() + "." + r + "." + photo
            let uploadphotoPath = path + "/" + imname;
            video.mv(uploadphotoPath, function (err) {
                if (err) return res.status(500).send(err);
            });
            data['video'] = "chambervideo/" + imname
            video = "chambervideo/" + imname
            var photo = [{
                'video': video,
            }];
            return res.status(200).json({
                success: true,
                data: photo
            })
        } catch (error) {
        }
    }

    static chamber = async (req, res) => {
        let chamber = await ChamberModel.find({ user_id: req.user._id })
        return res.status(200).json({
            success: true,
            data: chamber,
        });
    }

    static GetChamber = async (req, res) => {
        let user = await UserModel.findOne({ "username": req.body.username })
        if (user) {
            let company = await ChamberModel.find({ user_id: user._id })
            if (company) {
                return res.status(200).json({
                    success: true,
                    data: company,
                });
            } else {
                return res.status(422).json({
                    success: false,
                    message: 'Record not found...',
                });
            }
        } else {
            return res.status(422).json({
                success: false,
                message: 'User not found...',
            });
        }
    };

    static DeleteChamber = async (req, res) => {
        let chamber1 = await ChamberModel.findById(req.params.id)
        const path = await makeDir("./assets/chamber/")
        if (chamber1.video) {
            const url = chamber1.video
            let filename = new URL(url).pathname.split('/').pop();
            let image = path + "/" + filename;
            if (fs.existsSync(image)) fs.unlinkSync(image);
        }
        let chamber = await ChamberModel.findByIdAndDelete(req.params.id)
        return res.status(200).json({
            success: true,
            message: "Data Deleted Successfully...",
        });
    }

    static DeleteMyallchamber = async (req, res) => {
        try {
            let chamberdata = await ChamberModel.deleteMany({ user_id: req.user._id })
            const folder = './assets/chamber'
            fsExtra.emptyDirSync(folder)
            return res.status(200).json({
                success: true,
                message: "Successfully Deleted...",
            })
        }
        catch (error) {
        }
    }

    static DeleteAllchamber = async (req, res) => {
        try {
            let chamberdata = await ChamberModel.deleteMany()
            const folder = './assets/chamber'
            fsExtra.emptyDirSync(folder)
            return res.status(200).json({
                success: true,
                message: "Successfully Deleted...",
            })
        }
        catch (error) {
        }
    }

    // .........................NOTIFICATION............................
    static GetNotification = async (req, res) => {
        let data = req.body
        let Notification = await NotificationModel.aggregate([
            {
                $match: {
                    contact_id: req.user._id
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "userDoc"
                }
            }
        ]).sort({ _id: -1 });
        return res.status(200).json({
            success: true,
            data: Notification,
        });
    }

    static ViewNotification = async (req, res) => {
        try {
            let Notification = await NotificationModel.findById(req.params.id)
            if (!Notification) {
                let notify = await NotificationModel.findById(req.params.id)
                return res.status(422).json({
                    success: false,
                    message: "Somthing Went Wrong",
                });
            } else {
                let notifys = await NotificationModel.findByIdAndUpdate(Notification._id, {
                    view: 1
                })
                return res.status(200).json({
                    success: true,
                    result: notifys
                });
            }
        } catch (error) {
        }
    }

    static MultipleNotification = async (req, res) => {
        try {
            let data = req.body
            let Notification = await NotificationModel.find({ update_userid: req.user._id }).count()
            for (var i = 0; i < Notification.length; i++) {
                var update_userid = Notification[i].update_userid
                let users = await UserModel.findById(update_userid)
                Notification[i].message = `${users.name} Updated their Profile`
            }
            // console.log("vinit",Notification)
            return res.status(200).json({
                success: true,
                data: Notification
            })
        } catch (error) {
        }
    }

    static DeleteNotification = async (req, res) => {
        try {
            let data = req.body
            let Notification = await NotificationModel.findByIdAndDelete(req.params.id);
            return res.status(200).json({
                success: true,
                message: "Notification Deleted Successfully..."
            })
        } catch (error) {
        }
    }

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
            })
            const result = await doc.save();
            let data1 = await UserModel.findByIdAndUpdate(req.user._id, {
                paymentstatus: 0
            });
            return res.status(200).json({
                success: true,
                data: result,
                message: "Data Added Successfully..."
            });
        } catch (error) {
        }
    }

    // ..............PLANCHECK..........................
    static PlanCheck = async (req, res) => {
        var current = moment().format("MM/DD/YY");
        let toncoin = await ToncoinModel.find({ date: { $lt: current } })
        return res.status(200).json({
            success: true,
            data: toncoin
        })
    }


    // .................Country.........................
    static Country = async (req, res) => {
        let country = await CountryModel.find({ country_code: req.body.country_code })
        return res.status(200).json({
            success: true,
            data: country
        })
    }

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
                usertype: req.body.usertype

            });
            const result = await doc.save();
            return res.status(200).json({
                success: true,
                data: result,
                message: "Data Added successfully..."
            });
        } catch (error) {

        }
    }
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
                var use = await UserModel.findByIdAndUpdate({ _id: user._id }, {
                    usertype: 1,
                });
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
        } catch (error) {
        }
    }


    // ...........................USERS[DONATED]...................
    static DonatedUser = async (req, res) => {
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
                var us = await UserModel.findByIdAndUpdate({ _id: user._id }, {
                    usertype: 2,
                });
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
        } catch (error) {
        }
    }


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
            })
            const result = await doc.save();
            return res.status(200).json({
                success: true,
                data: result,
                message: "Data Added successfully..."
            });

        } catch (error) {
        }
    }


    // ......................PURCHASE MEMBERSHIP.....................
    static PurchaseMembership = async (req, res) => {
        try {
            res.render('User/Purchasemembership', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    // ::::::::::::::::::::THEME::::::::::::::::::::::::::::
    static Theme = async (req, res) => {
        let system = (await SystemModel.find({}).sort({ _id: -1 }));
        system = await system.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            a['Thumbnail'] = a.Thumbnail.split(",");
            return a;
        });
        const background = await BackgroundModel.findOne({ user_id: req.user._id })
        var user = req.user;
        var session = req.session;
        res.render('User/Theme', { baseUrl, system, session: req.session, background });
    }

    // ......................BACKGROUND IMAGE.....................
    static Backgroundimage = async (req, res) => {
        await BackgroundModel.updateOne(
            { user_id: req.user._id },
            { $set: { Thumbnail: req.body.Thumbnail } },
            { upsert: true }
        );
        const system = await SystemModel.findById(req.params.id)
        const background = await BackgroundModel.findOne({ user_id: req.user._id });
        res.redirect("Theme")
    }

    // ......................BACKGROUND-IMAGE........API::::::::::::::::::::::::
    static BackgroundImages = async (req, res) => {
        if (typeof req.body.Thumbnail != 'undefined') {
            await BackgroundModel.updateOne(
                { user_id: req.user._id },
                { $set: { Thumbnail: req.body.Thumbnail } },
                { upsert: true }
            );
        }
        if (typeof req.body.fontcolor != 'undefined') {
            await BackgroundModel.updateOne(
                { user_id: req.user._id },
                { $set: { fontcolor: req.body.fontcolor } },
                { upsert: true }
            );
        }
        if (typeof req.body.bgcolor != 'undefined') {
            await BackgroundModel.updateOne(
                { user_id: req.user._id },
                { $set: { backgroundcolor: req.body.bgcolor } },
                { upsert: true }
            );
        }
        if (typeof req.body.iconcolor != 'undefined') {
            await BackgroundModel.updateOne(
                { user_id: req.user._id },
                { $set: { iconcolor: req.body.iconcolor } },
                { upsert: true }
            );
        }
        const system = await SystemModel.findById(req.params.id)
        const background = await BackgroundModel.findOne({ user_id: req.user._id });
        return res.status(200).json({
            success: true,
            data: background,
            message: "Background Images Successfully Added...",
        });
    }

    static GetBackgroundimage = async (req, res) => {
        try {
            let data = req.body;
            let validator = new Validator(data, {
            });
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
                    data: {
                        fontcolor: '#00A3CC',
                    },
                });
            }
        } catch (error) {
        }
    }

    // ......................BACKGROUND COLOR.....................
    static ColorBackground = async (req, res) => {
        try {
            let data = req.body;
            let validator = new Validator(data, {
            });
            var user = req.user;

            if (typeof req.body.fontcolor != 'undefined') {
                await BackgroundModel.updateOne(
                    { user_id: req.user._id },
                    { $set: { fontcolor: req.body.fontcolor } },
                    { upsert: true }
                );
            }
            if (typeof req.body.bgcolor != 'undefined') {
                await BackgroundModel.updateOne(
                    { user_id: req.user._id },
                    { $set: { backgroundcolor: req.body.bgcolor } },
                    { upsert: true }
                );
            }
            if (typeof req.body.iconcolor != 'undefined') {
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
        } catch (error) {
        }
    }

    static Colorbackground = async (req, res) => {
        try {
            res.render('User/Colorbackground', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    // ......................SYSTEM-IMAGE..........API::::::::::::::::::::::::
    static SystemImage = async (req, res) => {
        let systemimage = await SystemModel.find({})
        return res.status(200).json({
            success: true,
            data: systemimage,
        });
    }

    // ......................BANNER..........API::::::::::::::::::::::::
    static Banners = async (req, res) => {
        let banner = await BannerModel.find({})
        return res.status(200).json({
            success: true,
            data: banner,
        });
    }

    // ......................FOLDER..........API::::::::::::::::::::::::
    static Folders = async (req, res) => {
        let folder = await FolderModel.find({})
        return res.status(200).json({
            success: true,
            data: folder,
        });
    }

    // ......................FOR-GET.....................
    static register = async (req, res) => {
        try {
            res.render('UserDetail/Registers', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    static checktg = async (req, res) => {
        try {
            const tgid = await UserModel.findOne({ username: req.body.tgname })
            return res.status(200).json({
                success: true,
                data: tgid,
            })
        } catch (error) {
        }
    }

    static login = async (req, res) => {
        try {
            res.render('UserDetail/Logins', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    static forgotpassword = async (req, res) => {
        try {
            res.render('UserDetail/Forgotpasswords', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    static personalprofile = async (req, res) => {
        try {
            res.render('UserDetail/Personalprofile', { baseUrl, session: req.session });
        } catch (error) {
        }
    }

    static addprofile = async (req, res) => {
        let user = await UserModel.find({}).sort({ _id: -1 });
        res.render('UserDetail/Addprofile', { baseUrl, user: user, session: req.session });

    }

    // ...................MEMBERSHIP..................
    static membershiptenure = async (req, res) => {
        let membership = await MembershipModel.find({}).sort({ _id: -1 });
        return res.status(200).json({
            success: true,
            data: membership,
        });
    }

    // .....................................PURCHASE...............................
    static purchase = async (req, res) => {
        let membership = await MembershipModel.findById(req.params.id);
        membership = JSON.parse(JSON.stringify(membership))
        let currency = await ConfigurationModel.findOne({ Configvalue: req.body.configvalue })
        let promotion_message = await ConfigurationModel.findOne({ ConfigKey: 'promotion_message' })
        membership.currency = currency.ConfigValue
        membership.promotion_message = promotion_message.ConfigValue
        return res.status(200).json({
            success: true,
            data: membership
        });
    }

    // ...............................FOLDERS..................................
    static UserFolder = async (req, res) => {
        var data = req.body;
        const doc = new FolderModel({
            Folder: req.body.Folder,
            user_id: req.user._id
        })
        let result = await FolderModel.create(doc)
        return res.status(200).json({
            success: true,
            data: result,
            message: "Data Added Successfully.."
        })
    }

    static DeleteFolder = async (req, res) => {
        let folder = await FolderModel.findByIdAndDelete(req.params.id);
        return res.status(200).json({
            success: true,
            data: '',
            message: "Data Deleted Successfully.."
        })

    }

    static GetFolder = async (req, res) => {
        let data1 = []
        let folder = await FolderModel.aggregate([
            {
                $match: {
                    $or: [{ user_id: req.user._id }, { user_id: null }]
                }
            },
            {
                $lookup: {
                    from: "contactfolders",
                    let: { folder_id: "$_id" }, pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [{ "$toObjectId": "$folder_id" }, "$$folder_id"] },
                                $and: [{ user_id: req.user._id }]
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                let: { "contact_id": "$contact_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [{ $eq: ["$_id", "$$contact_id"] }],
                                            },
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "companies",
                                            let: { "user_id": "$_id" },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ["$user_id", "$$user_id"] }

                                                    }
                                                },
                                                { $sort: { company_order: 1 } },
                                                { $limit: 1 }
                                            ],
                                            as: "companydetails"
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'contacts',
                                            let: { user_id: '$user_id' },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $eq: ['$contact_id', '$$contact_id'] },
                                                        $and: [{ user_id: req.user._id }]
                                                    }
                                                },
                                                {
                                                    $project: { _id: 1, status: 1, user_id: 1, contact_id: 1 }
                                                }
                                            ],
                                            as: 'contacts'
                                        }
                                    },
                                ],
                                as: "userdetails"
                            }
                        },
                        { $unwind: { path: "$userdetails", preserveNullAndEmptyArrays: true } },
                    ],
                    as: "folderdetails"
                },
            },
        ])
        folder = await folder.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            a['profile_image'] = baseUrl + 'assets/';
            return a;
        });
        return res.status(200).json({
            success: true,
            data: folder
        })
    }

    static EditFolder = async (req, res) => {
        var data = req.body;
        let validator = new Validator(data, {
            Folder: "required",
        })
        if (!(await validator.check())) {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            });
        } else {
            let folder = await FolderModel.findById(req.params.id)
            const doc = {
                Folder: req.body.Folder,
                user_id: req.user._id
            }
            const result = await FolderModel.findByIdAndUpdate(req.params.id, doc)
            const user = await FolderModel.findById(result._id)
            return res.status(200).json({
                success: true,
                data: user,
                message: "Data Updated Successfully..."
            })
        }
    }

    static SystemImages = async (req, res) => {
        let image = await SystemModel.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: 'categoryname',
                    foreignField: '_id',
                    as: "category"
                }
            }
        ]);
        image = await image.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            let im = a.Thumbnail.split(",");
            a['Thumbnail'] = im.map((e1) => {
                return baseUrl + 'assets/systemimage/' + e1;
            });
            // a['categoryname'] = a.category.categoryname;
            return a;
        });
        //   image[0]['Thumbnail'] = baseUrl + 'assets/systemimage' + image[0]['Thumbnail'];
        return res.status(200).json({
            success: true,
            data: image,
        });
    }

    // ....................................CONTACT..................................
    static AddToContact = async (req, res) => {
        var data = req.body;
        let user = await UserModel.findById(req.user._id)
        let add = await ContactModel.findOne({ contact_id: req.user._id, user_id: req.body.contact_id })

        if (add) {
            let add1 = await ContactModel.findOne({ user_id: req.body.contact_id, contact_id: req.user._id })
            console.log('add1', add1);
            if (add1) {
                if (add1.status == 2) {
                    await ContactModel.findByIdAndUpdate({ _id: add1._id }, {
                        status: 0,
                    });
                    return res.status(200).json({
                        success: true,
                        message: "Contact Added Successfully...",
                    });
                } else {
                    const doc = {
                        contact_id: req.body.contact_id,
                        user_id: req.user._id,
                        flag: 1
                    };
                    let result1 = await ContactModel.create(doc)
                    return res.status(422).json({
                        success: false,
                        message: "This Contact Is Already Present...",
                        data: result1
                    })
                }
            } else {
                const doc = {
                    contact_id: req.body.contact_id,
                    user_id: req.user._id,
                    flag: 1
                };
                let result = await ContactModel.create(doc)
                return res.status(422).json({
                    success: false,
                    message: "This Contact Is Already Present...",
                    data: result
                })
            }

        } else {
            const doc = {
                user_id: req.body.contact_id,
                contact_id: req.user._id
            };
            let result = await ContactModel.create(doc)
            let data = await ContactModel.findById(result._id)
            data = JSON.parse(JSON.stringify(data))
            let user = await UserModel.findById(data.contact_id)
            data.owner_name_english = `${user.owner_name_english}`
            data.owner_name_chinese = `${user.owner_name_chinese}`
            data.profile_image = `${user.profile_image}`
            return res.status(200).json({
                success: true,
                message: "Contact Added Successfully...",
            });
        }
    }
    // :::::::::::::::::::::::::::::INVITATION CONTACT::::::::::::::::::::::::::::::::::
    static InvitationContact = async (req, res) => {
        let data = req.body;
        let validator = new Validator(
            data,
            {
                status: "required"
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
            var doc = await ContactModel.findByIdAndUpdate({ _id: req.body.id }, {
                status: req.body.status,

            });
            let approve = '';
            if (req.body.status == 1) {
                approve = 'Approved';
                var user = await ContactModel.findById(req.body.id);
                let add = await ContactModel.findOne({ contact_id: user.user_id, user_id: user.contact_id })
                if (add) {
                } else {
                    const doc1 = {
                        user_id: user.contact_id,
                        contact_id: user.user_id,
                        flag: 1
                    };
                    await ContactModel.create(doc1)
                }
            } else {
                approve = 'Rejected';
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
                    $and: [{ user_id: mongoose.Types.ObjectId(req.user._id) },]
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { "contact_id": "$contact_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ["$_id", "$$contact_id"] }],
                                },
                            }
                        },
                        {
                            $lookup: {
                                from: "companies",
                                let: { "user_id": "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ["$user_id", "$$user_id"] }

                                        }
                                    },
                                    { $sort: { company_order: 1 } },
                                    { $limit: 1 }
                                ],
                                as: "companydetails"
                            }
                        }
                    ],
                    as: "userdetails"
                }
            },
            {
                $lookup: {
                    from: "contactfolders",
                    let: { "contact_id": "$contact_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$contact_id", "$$contact_id"] },
                            }
                        },
                        {
                            $project: { _id: 1, tag: 1 }
                        },
                    ],
                    as: 'contactfolders_data'
                }
            },
        ])
        contact = await contact.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            a['profile_image'] = baseUrl + 'assets/';
            return a;
        });
        return res.status(200).json({
            success: true,
            data: contact,
        });
    }



    // ::::::::::::::::::::::::::::::::: SEARCH CONTACT::::::::::::::::::::::::::::::::::::
    static SearchContact = async (req, res) => {
        let user = await UserModel.findOne({ $or: [{ "username": req.body.search }, { "tgid": req.body.search }] });
        if (user) {
            let contact = await ContactModel.findOne({ contact_id: user._id });
            if (contact) {
                return res.status(200).json({
                    success: true,
                    data: contact,
                });
            } else {
                return res.status(422).json({
                    success: false,
                    message: 'Record not found...',
                });
            }
        } else {
            return res.status(422).json({
                success: false,
                message: 'User not found...',
            });
        }
    };


    static AddContactFolder = async (req, res) => {
        var data = req.body;
        let user = await UserModel.findById(req.user._id)
        let add = await ContactFolderModel.findOne({ user_id: req.user._id, contact_id: req.body.contact_id, folder_id: req.body.folder_id })

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
    }

    static GetContactFolder = async (req, res) => {
        let contact = await ContactFolderModel.find({ user_id: req.user._id })
        return res.status(200).json({
            success: true,
            data: contact,
        });
    }

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
                    $and: [{ user_id: mongoose.Types.ObjectId(req.params.id) }, { status: 0 }]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: 'contact_id',
                    foreignField: '_id',
                    as: "userdetails"
                },
            },
        ])
        return res.status(200).json({
            success: true,
            data: contact,
        });
    }

    // ::::::::::::::::::: REMOVE FROM CONTACT :::::::::::::API::::::::::::::::
    static RemoveFromContact = async (req, res) => {
        await ContactFolderModel.find({ contact_id: req.params.id, user_id: req.user._id }).deleteMany();
        let contact = await ContactModel.find({ contact_id: req.params.id, user_id: req.user._id }).deleteMany();
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
        let validator = new Validator(data, {
            image: "required",
        }, {
            image: "Images is necessary",
        });
        await validator.check();
        let error = validatorError(res, validator.errors);
        const path = await makeDir("./assets/systemimage/");
        let image = req.files?.[img];
        const images = []
        if (image) {
            if (Array.isArray(image)) {
                for (let i = 0; i < image.length; i++) {
                    images.push(image[i].name)
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
                images.push(image.name)
            }
        }
        if (error && JSON.stringify(error) != "{}") {
            let system = await ImageModel.find({});
            return res.status(422).json({
                success: false,
                error: validator.errors,
            })
        } else {
            const doc = new ImageModel({
                image: images.join(),
                user_id: req.user._id
            });
            const result = await doc.save();
            return res.status(200).json({
                success: true,
                data: result,
                message: "Image Uploaded Successfully...",
            });
        }
    }

    static GetImages = async (req, res) => {
        let image = await ImageModel.find({ user_id: req.user._id });
        image = await image.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            let im = a.image.split(",");
            a['image'] = im.map((e1) => {
                return baseUrl + 'assets/systemimage/' + e1;
            });
            return a;
        });
        return res.status(200).json({
            success: true,
            data: image,
        });
    }
}
export default UserController;