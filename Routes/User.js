import express from "express";
const user = express.Router();
import UserController from "../Controllers/UserController.js";
import { isUser } from "../Middleware/UserAuthentication.js";
import ReferralController from "../Controllers/ReferralController.js";
// import DashboardController from "../Controllers/DashboardController.js";
import multer from "multer";
import PaymentController from "../Controllers/paymentController.js";

user.post("/register", UserController.Register);
user.post("/username", UserController.Username);
user.post("/login", UserController.Login);
user.post("/telegram-login", UserController.TelegramLogin);
// user.post("/forgotpassword", UserController.ForgotPassword);
user.post("/language", isUser, UserController.Language);

// ................................CONTACT....................................
user.post("/addtocontact", isUser, UserController.AddToContact);
user.get("/getcontact", isUser, UserController.GetContact);
user.post("/invitationcontact", isUser, UserController.InvitationContact);
user.get("/contactlist/:id", isUser, UserController.ContactList);
user.delete("/removefromcontact/:id", isUser, UserController.RemoveFromContact);
user.post("/searchcontact", isUser, UserController.SearchContact);
user.post("/iscontactexist", isUser, UserController.isMyContact);

// ..........................CONTACT-FOLDER...................................
user.post("/addcontactfolder", isUser, UserController.AddContactFolder);
user.get("/getcontactfolder", isUser, UserController.GetContactFolder);
user.delete(
  "/deletecontactfolder/:id",
  isUser,
  UserController.DeleteContactFolder,
);

// ..........................USERS[FREE,PRIMIUMUSER,DONATED]...................
user.post("/freeuser", UserController.FreeUser);
user.post("/premiumuser", isUser, UserController.PremiumUser);
user.post("/enterpriseuser", isUser, UserController.EnterpriseUser);

// ..........................PURCHASE MEMBERSHIP...............................
user.get("/purchasemembership", UserController.PurchaseMembership);

// ................................FOR-GET.....................................
user.get("/registeruser", UserController.register);
user.get("/loginuser", UserController.login);
user.get("/forgotpassworduser", UserController.forgotpassword);
user.get("/personalprofileuser", UserController.personalprofile);
user.get("/addprofileuser", isUser, UserController.addprofile);

// .................................THEME......................................
user.get("/theme", isUser, UserController.Theme);
user.post("/addbackground", isUser, UserController.Backgroundimage);
user.post("/backgroundimage", isUser, UserController.BackgroundImages);
// Multipart upload endpoint for background images (premium users only)
user.post("/uploadBackground", isUser, UserController.UploadBackground);
user.get("/getbackground", isUser, UserController.GetBackgroundimage);
// Host generated QR PNG so it can be saved inside Telegram WebView
user.post("/uploadqr", isUser, UserController.UploadQrCode);
user.post("/colorbackground", isUser, UserController.ColorBackground);
user.get("/getcolorbackground", UserController.Colorbackground);
user.get("/system", UserController.SystemImages);

//....................................API......................................
user.get("/systemimage", UserController.SystemImage);
user.get("/folder", UserController.Folders);
user.get("/banner", UserController.Banners);

//...............................USERS PROFILE.................................
user.post("/addprofile", isUser, UserController.AddProfile);
user.post("/updateprofile/:id", isUser, UserController.UpdateProfile);
user.get("/getprofile", isUser, UserController.GetProfile);
user.get("/getprofile/:id", UserController.Getprofile);
user.post("/getprofiles", UserController.Getprofiles);
user.delete("/deleteprofile/:id", isUser, UserController.DeleteProfile);
user.get("/landingpage", isUser, UserController.Landingpage);
user.post("/getlandingpage", UserController.GetLandingpage);

// .................................COMPANY....................................
user.post("/companyprofile", isUser, UserController.Companyprofile);
user.post("/updatecompany", isUser, UserController.Updatecompanyprofile);
user.post("/video", isUser, UserController.video);
user.get("/getcompanyprofile", isUser, UserController.companyprofile);
user.post("/getcompany", UserController.GetCompany);
user.delete("/deletecompany/:id", isUser, UserController.Deletecompanyprofile);
user.delete("/deletemyallcompany", isUser, UserController.DeleteMyallcompany);
user.delete("/deleteallcompany", UserController.DeleteAllcompany);

// ....................................CHAMBER.................................
user.post("/chamber", isUser, UserController.Chamber);
user.post("/updatechamber", isUser, UserController.UpdateChamber);
user.post("/chambervideo", isUser, UserController.Chambervideo);
user.get("/getchamber", isUser, UserController.chamber);
user.post("/getchambers", UserController.GetChamber);
user.delete("/deletechamber/:id", isUser, UserController.DeleteChamber);
user.delete("/deletemyallchamber", isUser, UserController.DeleteMyallchamber);
user.delete("/deleteallchamber", UserController.DeleteAllchamber);

//...................................NOTIFICATION..............................
user.get("/getnotification", isUser, UserController.GetNotification);
user.get("/viewnotification/:id", isUser, UserController.ViewNotification);
user.get("/multiplenotification", isUser, UserController.MultipleNotification);
user.delete("/deletenotification/:id", UserController.DeleteNotification);

// ..............................TONCOIN & PAYPAL..............................
user.post("/toncoinpaypal", isUser, UserController.ToncoinPaypal);
user.post("/plancheck", UserController.PlanCheck);

// ..............................COUNTRY.......................................
user.post("/country", UserController.Country);

// ......................USERS[FREE,PRIMIUMUSER,DONATED].......................
user.post("/freeuser", UserController.FreeUser);
user.post("/premiumuser", UserController.PremiumUser);
user.post("/enterpriseuser", UserController.EnterpriseUser);

// ...............................MEMBERSHIP...................................
user.get("/membershiptenure", UserController.membershiptenure);
user.get("/purchase/:id", UserController.purchase);

// ...............................FOLDERS......................................
user.post("/addfolder", isUser, UserController.UserFolder);
user.post("/editfolder/:id", isUser, UserController.EditFolder);
user.get("/getfolder", isUser, UserController.GetFolder);
user.delete("/deletefolder/:id", isUser, UserController.DeleteFolder);

// ...............................IMAGES.......................................
user.post("/image", isUser, UserController.Images);
user.get("/getimage", isUser, UserController.GetImages);

// ...............................REFERRAL.......................................
user.post("/addReferral", isUser, ReferralController.ReferralRequest);
user.post("/refimageupload", isUser, ReferralController.RefImageUpload);
user.get("/categorylist", isUser, ReferralController.Categorylist);
user.get("/getrefimageupload", isUser, ReferralController.GetRefImageUpload);
// user.post("/refimageupload", isUser, ReferralController.RefImageUpload1);
user.post("/refimageupload/:id", isUser, ReferralController.EditRefImage);
user.delete("/deleteimage/:id/:name", isUser, ReferralController.DeleteRerPic);
// user.get("/referralmembership", isUser, ReferralController.ReferralMembershipList);
user.post("/searchtelegramid", isUser, ReferralController.CheckTelegramId);

// ...............................REFERRAL-MEMBERSHIP.......................................
user.get("/referralmembershiplist", isUser, UserController.ReferralMembership);

// ...............................REFERRAL-MEMBERSHIP.......................................
user.post("/referralreport", isUser, UserController.ReferralReport);
user.get("/referralReportlist", isUser, UserController.ReferralReportList);

// .............................. STRIPE,,,,..................
user.post(
  "/create-checkout-session",
  isUser,
  UserController.StripeCheckOutSession,
);
user.post("/success", isUser, UserController.success);

// ::::::::::::::::::::::::::GET-USERNAME::::::::::::::::::::::::
user.post("/getusername", isUser, UserController.getUserName);
user.post("/getuserdetails", isUser, UserController.getUserDetails);

user.post("/stripe_payment", isUser, UserController.MembershipCheckOutSession);

user.post(
  "/success_stripe_payment",
  isUser,
  UserController.SuccessMembershipStripe,
);
user.get("/getpaymentconfiguration", UserController.GetPaymentConfiguration);

// ...............................telegram stars.......................................
user.post("/telegram/payment", isUser, PaymentController.TelegramPayment);
user.post(
  "/telegram/payment/complete",
  isUser,
  PaymentController.CompleteTelegramCoinPayment,
);
user.post("/usdt/payment", isUser, PaymentController.USDTPayment);

// Membership history for authenticated user
user.get("/membership/history", isUser, PaymentController.MembershipHistory);

// ...............................UNSECURED APIs - Get User Data.......................................
user.post("/getuserdata", UserController.GetUserData);
user.post("/getuserprofile", UserController.GetUserProfile);
user.post("/getusercompanies", UserController.GetUserCompanies);
user.post("/getuserchambers", UserController.GetUserChambers);
user.post("/getbackgroundbyusername", UserController.GetUserBackground);

// Public: check whether a username exists (no authentication required)
// Example: GET /user-exists/johndoe
user.get("/user-exists/:username", UserController.CheckUserExist);

// Staff login with verification code (public)
// POST /staff/login
user.post("/staff/login", UserController.staffLogin);

// ...............................CREATE ENTERPRISE.......................................
user.post("/create-enterprise", UserController.CreateEnterprise);

// ...............................TEMPLATES & EMPLOYEE NAMECARDS.......................................
// Get accessible company templates (for dropdown selection)
user.get("/company-templates", isUser, UserController.getCompanyTemplates);

// Get accessible chamber templates (for dropdown selection)
user.get("/chamber-templates", isUser, UserController.getChamberTemplates);

// Create employee namecard with template selection
user.post("/employee-namecard", isUser, UserController.createEmployeeNamecard);

// Get all employee namecards for authenticated user
user.get("/employee-namecards", isUser, UserController.getEmployeeNamecards);

// Update employee namecard
user.post(
  "/update-employee-namecard",
  isUser,
  UserController.updateEmployeeNamecard,
);

// Delete employee namecard
user.delete(
  "/employee-namecard/:id",
  isUser,
  UserController.deleteEmployeeNamecard,
);

export default user;
