import express from "express"
import { Validator } from "node-input-validator"
import { baseUrl, view, assetsUrl, __dirname } from "../Config.js";
import SendEmail from "../Utils/SendEmail.js";
import fs from "fs"
import AdminModel from "../Models/Admin.js";
import bcrypt from "bcrypt";
import { validatorError } from "../Common.js";
import path from "path";
import handlebars from "handlebars";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { validate } from "uuid";
const app = express()

const accessTokenSecret = process.env["JWT_SECRET_KEY"];
const accessTokenLife = process.env["ACCESS_TOKEN_LIFE"];
class MasterAdminController {



    //.........MASTERADMIN-LOGIN............

    static CreateAdmin = async (req, res) => {

        var data = req.body
        let validator = new Validator(data, {
            email: "required|email",
            name: "required|alpha",
            password: "required",
            confirmpassword: "required|same:password",
        })
        if (!(await validator.check())) {
            let errors = validatorError(res, validator.errors)
            return res.render("MasterAdmin/Createadmin", { baseUrl, errors, path: "" });
        }
        const user = await AdminModel.findOne({ email: data.email })
        if (user) {
            res.render("MasterAdmin/Createadmin", {
                baseUrl,
                message: "This User is already register"
            })
        } else {
            const { name, email, password } = req.body;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const doc = new AdminModel({
                name: name,
                email: email,
                password: hashedPassword,
            });
            const filePath = path.join(__dirname, '/Views/MasterAdmin/email.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            // var transporter = nodemailer.createTransport({
            //     host: 'tgt-tko-m815.pointdnshere.com',
            //     port: 587,
            //     auth: {
            //         user: "info@addmy.co",
            //         pass: "noreply@addmy.com"
            //     }
            // });

            var transporter = nodemailer.createTransport({
                host: 'sandbox.smtp.mailtrap.io',
                port: 2525,
                auth: {
                    user: "6e6cbf25219481",
                    pass: "b2d9c14a58f35d"
                }
            });

            const replacements = {
                email: req.body.email,
                password: req.body.password,
                message: 'Hello  \n Greetings from addmy.co \n You have successfully registered to our portal and ready to create your digital contact card. \n Please use below details to login',
            };
            let htmltoSend = template(replacements);
            let sendMail = await transporter.sendMail({
                from: 'info@addmy.co',
                to: req.body.email,
                subject: 'You have Registered successfully',
                html: htmltoSend
            })
            const result = await doc.save();

            req.session.tostMsg = "Create Admin Successfully..."
            req.session.tostBackground = "#0b6a3c"
            req.session.isTost = true
            res.redirect("dashboard");
        }
    }


    static EditAdminUser = async (req, res) => {
        let data = req.body;
        let validator = new Validator({
            name: "required",
            email: "required",
        }, {
            name: "Name is necessary",
            email: "Email is necessary",
        });
        let adminuserlist = await AdminModel.findById(req.body.id)
        // await validator.check();
        let error = validatorError(res, validator.errors);
        if (error && JSON.stringify(error) != "{}") {
            let adminuserlist = await AdminModel.findByIdAndUpdate(req.body.id);
            res.render("MasterAdmin/Editadminuser", {
                baseUrl,
                errors: error,
                adminuserlist: adminuserlist,
                path: "adminuserlist",
            });
        } else {
            const doc = await AdminModel.findByIdAndUpdate(req.body.id, {
                name: req.body.name,
                email: req.body.email,
            });
            req.session.tostMsg = "AdminUser Updated Successfully..."
            req.session.tostBackground = "#0b6a3c"
            req.session.isTost = true
            res.redirect(`${baseUrl}admin/adminuserlist`);
        }
    }


    // static AddRole = async (req, res) => {
    //     var data = req.body;

    //     let validator = new Validator(data, {
    //       name: "required",
    //       role: "required|url",
    //     }, {
    //       title: "Name is necessary",
    //       link: "Role is necessary",
    //     });
    //     await validator.check();
    //     let error = validatorError(res, validator.errors);
    //     if (error && JSON.stringify(error) != "{}") {
    //       res.render("Role/AddRole", { baseUrl, errors: error, path: "addrole" })
    //     } else {
    //       const doc = new BannerModel({
    //         Name: req.body.name,
    //         Role: req.body.role,
    //       })
    //       const result = await doc.save();
    //       req.session.tostMsg = "Role Added Successfully..."
    //       req.session.tostBackground = "#0b6a3c"
    //       req.session.isTost = true
    //       res.redirect(`${baseUrl}admin/role`);
    //     }
    //   }


}




export default MasterAdminController