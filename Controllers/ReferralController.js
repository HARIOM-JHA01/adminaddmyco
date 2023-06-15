import express from "express";
import CategoryModel from "../Models/Category.js";
import ToncoinModel from "../Models/Toncoinpaypal.js";
import MembershipModel from "../Models/Membership.js";
import { Validator } from "node-input-validator";
import SystemModel from "../Models/Systemimage.js";
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import makeDir from "make-dir";
import moment from "moment/moment.js";
import "dotenv/config";
import fs from "fs";
import UserModel from "../Models/User.js";
import jwt from "jsonwebtoken";

import { validatorError } from "../Common.js";
import NotificationModel from "../Models/Notification.js";
const app = express()

class ReferralController {

    static ReferralRequest = async (req, res) => {
        var data = req.user._id;
        await UserModel.findByIdAndUpdate({ _id: data }, {
            isReferral: 3,
        })
        const result1 = await UserModel.findById(data);
        return res.status(200).json({
            success: true,
            data: result1,
            message: "Data Added Successfully..."
        });
    }



    static Categorylist = async (req, res) => {
        let categories = await CategoryModel.find({});
        return res.status(200).json({
            success: true,
            data: categories,
        });
    }

    static RefImageUpload = async (req, res) => {

        var data = req.body;
        data.image = req.files?.['image[]'];
        let validator = new Validator(data, {
            image: "required",
            category: "required"
        }, {
            image: "Images is necessary",
            category: "Category is necessary"
        });
        await validator.check();
        let error = validatorError(res, validator.errors);
        const path = await makeDir("./assets/systemimage/");
        let image = req.files?.['image[]'];
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
            return res.status(422).json({
                success: false,
                error: validator.errors,
            })
        } else {
            const doc = new SystemModel({
                Thumbnail: images.join(),
                categoryname: req.body.category,
                user_id: req.user._id,
                type: 1
            });
            const result = await doc.save();
            return res.status(200).json({
                success: true,
                data: result,
                message: "Image Uploaded Successfully...",
            });
        }
    }

  
    static EditRefImage = async (req, res) => {
        let id = req.params.id;
        let timestamp = Date.now();
        let data = req.body;

        data.image = req.files?.['image[]'];
        let validator = new Validator(data, {
            image: "required",
        }, {
            image: "Images is necessary",
        });
        await validator.check();
        let error = validatorError(res, validator.errors);
        const path = await makeDir("./assets/systemimage/");
        let image = req.files?.['image[]'];
        const images = [];
        if (image) {
            await SystemModel.findByIdAndUpdate(id, {
                Thumbnail: ''
            });
            let extension = image.name.split('.').pop();
            var imname = timestamp + "1." + extension;
            images.push(imname)
            let uploadPath = path + "/" + imname;
            image.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
            });
            // }
            // }
            let oldimage = path + "/" + req.body.name;
            if (fs.existsSync(oldimage)) fs.unlinkSync(oldimage);

        }
        if (error && JSON.stringify(error) != "{}") {
            return res.status(422).json({
                success: false,
                error: validator.errors,
            })
        } else {
            let pic = images.filter(function (item) {
                return item !== req.body.name
            })
            const doc = await SystemModel.findByIdAndUpdate(id, {
                Thumbnail: pic.join()
            });

            return res.status(200).json({
                success: true,
                data: doc,
                message: "Image Uploaded Successfully...",
            });
        }
    }


    static GetRefImageUpload = async (req, res) => {
        let imageupload = await SystemModel.find({ user_id: req.user._id });
        imageupload = await imageupload.map((e) => {
            let a = JSON.parse(JSON.stringify(e))
            let im = a.Thumbnail.split(",");
            a['Thumbnail'] = im.map((e1) => {
                return baseUrl + 'assets/systemimage/' + e1;
            });
            return a;
        });
        let totalImage = imageupload.map(e => e.Thumbnail).flat(1).length
        return res.status(200).json({
            success: true,
            data: {
                data: imageupload,
                totalImage: totalImage
            },
        });
    }

    // ............TONCOIN........................
    static ApproveReferral = async (req, res) => {
        await UserModel.updateOne(
            { tgid: req.query.id },
            { $set: { isReferral: 1 } },
            { upsert: true }
        );
        const userDetails = await UserModel.find({ "tgid": req.query.id })
        const doc = {
            contact_id: userDetails[0].id,
            message: `congrats! You are a referral member now.`
        }
        await NotificationModel.create(doc)
        return res.status(200).json({
            status: true,
        });
    }

    static ApprovePrimium = async (req, res) => {
        await UserModel.updateOne(
            { tgid: req.query.id },
            { $set: { usertype: 1 } },
            { upsert: true }
        );
        let Membershp = await MembershipModel.find({ membershiperiod: 1 });
        let user = await UserModel.find({ tgid: req.query.id });
        const doc = new ToncoinModel({
            membershiperiod: 1,
            firstname: user[0].username,
            address: req.body.address,
            toncoin: Membershp[0].toncoin,
            paypal: Membershp[0].paypal,
            amount: Membershp[0].toncoin,
            paypalid: req.body.paypalid,
            user_id: user[0]._id,
            transactionid: 'admin',
            paymenttype: 2,
            transactiondate: new Date().toISOString(),
            paymentstatus: 1,
            status: 1,
        })
        const result = await doc.save();
        let date = moment().format('YYYY-MM-DD');
        let enddate = moment(date).add(1, 'y').format('YYYY-MM-DD');
        let data = await UserModel.findByIdAndUpdate(user[0]._id, {
            usertype: 1,
            startdate: date,
            paymentstatus: 1,
            enddate: enddate,
            referralType: 0,
            paymentBy :0
        });
        return res.status(200).json({
            status: true,
            data: data
        });
    }



    // ......................DELETEUSERS[FREEUSER,PREMIUM,DONATED].....................
    static DeleteRefer = async (req, res) => {
        await UserModel.findByIdAndUpdate(req.query.id, {
            isReferral: 0,
            refstatue: 0,
            refimgstatue: 0
        });
        return res.status(200).json({
            status: true,
            message: "Remove successfully.",
            Url: `${baseUrl}admin/referral`,
        });
    }


    static DeleteRerPic = async (req, res) => {
        var id = req.params.id;
        var name = req.params.name;
        const path = await makeDir("./assets/systemimage/")
        let system = await SystemModel.findById(id);
        var gT = system.Thumbnail;
        var gt1 = gT.split(',');
        gt1 = gt1.filter(function (item) {
            return item !== name
        })
        if (system.Thumbnail) {
            let image = path + "/" + name;
            if (fs.existsSync(image)) fs.unlinkSync(image);
        }
        if (gt1.length === 0) {
            await SystemModel.findByIdAndDelete(id);
        } else {
            await SystemModel.findByIdAndUpdate(id, {
                Thumbnail: gt1.join(','),
            });
        }

        return res.status(200).json({
            status: true,
            message: "deleted successfully.",
        });
    }

    static CheckTelegramId = async (req, res) => {
        try {
            var data = req.body;
            let validator = new Validator(data, {
                search: "required",
            });
            if (!(await validator.check())) {
                return res.status(422).json({
                    success: false,
                    error: validator.errors,
                });
            } else {
                let result
                if (req.body.search.indexOf("http://") === 0 || req.body.search.indexOf("https://") === 0) {
                    const str = req.body.search.split('/')
                    result = str[str.length - 1]
                } else {
                    result = req.body.search
                }


                let where = {};
                where['tgid'] = result
                let check = await UserModel.find(where)
                return res.status(200).json({
                    success: true,
                    data: check,
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: error,
                message: "Something went wrong..."
            });
        }
    }


}

export default ReferralController