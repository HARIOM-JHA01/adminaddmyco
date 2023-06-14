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
    //   static MasterAdminLogin = async (req, res) => {
    //     try {
    //       var data = req.body;
    //       let validator = new Validator(data, {
    //         email: "required|email",
    //         password: "required",
    //       }, {
    //         email: "Enter your email",
    //         password: "Enter your password"
    //       });
    //       await validator.check();
    //       // validation error
    //       let error = validatorError(res, validator.errors);
    //       if (error && JSON.stringify(error) != "{}") {
    //         return res.render("Admin/Login", { baseUrl, error, path: "" });
    //       } else {
    //         let user = await MasterAdminModel.findOne({ email: data.email.toLowerCase() });
    //         if (!user) {
    //             res.render("Admin/Login", { baseUrl, message: "User Not Found" });
    //         } else {
    //           let match = bcrypt.compareSync(data.password, user.password);
    //           // console.log("match: " + match);
    //           if (!match) {
    //             return res.render("Admin/Login", {
    //                 baseUrl,
    //                 message: "Your Password May Be Wrong",
    //               });
    //           }
    //           const token = jwt.sign(
    //             { email: user.email, id: user._id },
    //             process.env.JWT_SECRET_KEY, { expiresIn: process.env.ACCESS_TOKEN_LIFE }
    //           );
    //           // console.log("MasterAdminToken :", token);
    //           await MasterAdminTokenModel.create({ token: token, User: user._id });
    //           let result = await MasterAdminModel.findById(user._id);
    //           return res.status(200).json({
    //             success: true,
    //             data: result,
    //             token: token,
    //             message: "MasterAdmin login successfully..."
    //           })
    //         }
    //       }
    //     } catch (error) {
    //       console.log(error);
    //       return res.status(500).json({
    //         success: false,
    //         error: error,
    //         message: "Something went wrong..."
    //       });
    //     }
    //   }

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


    static AddRole = async (req, res) => {
        var data = req.body;
       
        let validator = new Validator(data, {
          name: "required",
          role: "required|url",
        }, {
          title: "Name is necessary",
          link: "Role is necessary",
        });
        await validator.check();
        let error = validatorError(res, validator.errors);
        if (error && JSON.stringify(error) != "{}") {
          res.render("Role/AddRole", { baseUrl, errors: error, path: "addrole" })
        } else {
          const doc = new BannerModel({
            Name: req.body.name,
            Role: req.body.role,
          })
          const result = await doc.save();
          req.session.tostMsg = "Role Added Successfully..."
          req.session.tostBackground = "#0b6a3c"
          req.session.isTost = true
          res.redirect(`${baseUrl}admin/role`);
        }
      }


}




export default MasterAdminController