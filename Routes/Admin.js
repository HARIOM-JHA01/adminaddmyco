import express from "express";
const admin = express.Router();
import DashboardController from "../Controllers/DashboardController.js";
import ReferralController from "../Controllers/ReferralController.js";
import AdminController from "../Controllers/AdminController.js";
import MasterAdminController from "../Controllers/MasterAdminController.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";
import PartnerAdminController from "../Controllers/PartnerAdminController.js";

// .........................DASHBOARD-CONTROLLER........................
admin.get("/", DashboardController.signIn);
admin.get("/signup", DashboardController.signUp);
admin.get("/signin", DashboardController.signIn);
admin.get("/dashboard", isAdmin, DashboardController.home);
admin.get("/forgotpassword", DashboardController.ForgotPassword);
admin.get("/resetpassword", DashboardController.ResetPassword);
admin.get("/changepassword", DashboardController.ChangePassword);
admin.get("/myaccount", isAdmin, DashboardController.MyAccount);

// .................................USERS................................
admin.get("/freeuser", isAdmin, DashboardController.FreeUser);
admin.get("/premium", isAdmin, DashboardController.PremiumUser);
admin.get("/donateduser", isAdmin, DashboardController.DonatedUser);

// .............................BANNERS..................................
admin.get("/banner", isAdmin, DashboardController.Banner);
admin.get("/addbanner", isAdmin, DashboardController.AddBanner);
admin.get("/editbanner", isAdmin, DashboardController.EditBanner);
admin.get("/view-banner", isAdmin, DashboardController.Viewbanner);

// ..........................MEMBERSHIP[CONFIGURATION]...................
admin.get("/membership", isAdmin, DashboardController.MembershipTenure);
admin.get("/addmembership", isAdmin, DashboardController.AddMembershipTenure);
admin.get("/editmembership", isAdmin, DashboardController.EditMembershipTenure);

// .........................SYSTEM[CONFIGURATION]........................
admin.get("/system", isAdmin, DashboardController.SystemImages);
admin.get("/addsystem", isAdmin, DashboardController.AddsystemImages);
admin.get("/editsystem", isAdmin, DashboardController.EditsystemImages);

// .........................FOLDERS[CONFIGURATION]........................
admin.get("/folder", isAdmin, DashboardController.Folder);
admin.get("/addfolder", isAdmin, DashboardController.AddFolder);
admin.get("/editfolder", isAdmin, DashboardController.EditFolder);

// .........................CURRENCY......................................
// admin.get("/currency",DashboardController.Currency);

// .......................PAYMENT[PAYPAL].................................
admin.get("/paypal", isAdmin, DashboardController.Paypal);

// ..........................ADMIN-CONTROLLER.............................
admin.post("/Register", AdminController.Adminregister);
admin.post("/login", AdminController.Adminlogin);
admin.get("/getProfile", AdminController.GetProfile);
admin.get("/Logout", AdminController.Adminlogout);
admin.post("/ForgotPassword", AdminController.ForgotPassword);
admin.post("/OtpVarify", AdminController.OtpVarify);
admin.post("/ResetPassword", AdminController.ResetPassword);
admin.post("/ChangePassword", isAdmin, AdminController.ChangePassword);
admin.post("/MyAccount", AdminController.MyAccount);
// ..........................BANNERS......................................
admin.post("/banner", AdminController.Banner);
admin.post("/editbanner", AdminController.EditBanner);
admin.get("/deletebanner", AdminController.DeleteBanner);

// .....................MEMEBRSHIP[CONFIGURATION].........................
admin.post("/membership", AdminController.MembershipTenure);
admin.post("/editmembership", AdminController.EditMembershipTenure);
admin.get("/deletemembership", AdminController.DeleteMembershipTenure);

// .........................SYSTEM[CONFIGURATION].........................
admin.post("/system", AdminController.SystemImages);
admin.post("/updatesystem", AdminController.EditSystemImages);
admin.get("/deletesystem", AdminController.DeletesystemImages);
admin.get("/deletesystempic", AdminController.Deletesystempic);

// .........................FOLDERS[CONFIGURATION]........................
admin.post("/folder", AdminController.Folder);
admin.post("/editfolder", AdminController.EditFolder);
admin.get("/deletefolder", AdminController.DeleteFolder);

// .......................DELETUSERS[FREE,PREMIUM,DONATED]................
admin.get("/deleteuser", AdminController.DeleteUser);
admin.get("/viewuser", AdminController.ViewUser);
admin.get("/updatefreeuser", AdminController.UpdateUser);
admin.get("/deletepremiumuser", AdminController.DeletePremiumUser);
admin.get("/updatepremiumuser", AdminController.UpdatePremiumUser);
admin.get("/viewpremiumuser", AdminController.ViewPremiumUser);
admin.get("/deletedonateduser", AdminController.DeleteDonatedUser);
admin.get("/viewdonateduser", AdminController.ViewDonatedUser);

// ........................TONCOIN & PAYPAL...............................

// ....................CONFIGURATION......................................
admin.get("/configuration", AdminController.Configuration);
admin.get("/addconfiguration", AdminController.add_configuration);
admin.get("/editconfiguration", AdminController.edit_configuration);
admin.post("/configuration", AdminController.configuration);
admin.post("/editconfiguration", AdminController.editconfiguration);
admin.get("/deleteconfiguration", AdminController.deleteconfiguration);

// .....................CATEGORIES........................................
admin.get("/categories", AdminController.Categories);
admin.get("/addcategories", AdminController.Addcategories);
admin.get("/editcategories", AdminController.Editcategories);
admin.post("/category", AdminController.Category);
admin.post("/editcategory", AdminController.Editcategory);
admin.get("/deletecategories", AdminController.Deletecategory);

// ..........................REFERRAL..............................
// admin.get("/referral", DashboardController.Referral); // Method missing
admin.get("/deletereferraluser", ReferralController.DeleteRefer);
admin.get("/approvereferral", ReferralController.ApproveReferral);
admin.get("/approvepremium", ReferralController.ApprovePrimium);
// admin.put("/update-referral/:id", DashboardController.UpdateReferral); // Method missing
// admin.get("/referralrequest",DashboardController.ReferralRequest);

// .............................BANNERS..................................
admin.get("/logo", isAdmin, DashboardController.Logo);
admin.get("/addlogo", isAdmin, DashboardController.AddLogo);
admin.get("/editlogo", isAdmin, DashboardController.EditLogo);

// ..........................BANNERS......................................
admin.post("/logo", AdminController.Logo);
admin.post("/editlogo", AdminController.EditLogo);

// ..........................REFERRALMEMBERSHIP[CONFIGURATION]...................
admin.get(
  "/referralmembership",
  isAdmin,
  DashboardController.ReferralMembershipTenure
);
admin.get(
  "/addreferralmembership",
  isAdmin,
  DashboardController.AddReferralMembershipTenure
);
admin.get(
  "/editreferralmembership",
  isAdmin,
  DashboardController.EditReferralMembershipTenure
);

// .....................MEMEBRSHIP[CONFIGURATION].........................
admin.post("/referralmembership", AdminController.ReferralMembershipTenure);
admin.post(
  "/editreferralmembership",
  AdminController.EditReferralMembershipTenure
);
admin.get(
  "/deletereferralmembership",
  AdminController.DeleteReferralMembershipTenure
);

// :::::::::::::::::::REFERRAL-DETAIL:::::::::::::::::::::

// Partner admin views
admin.get("/partner/list", isAdmin, PartnerAdminController.PartnerList);
admin.get("/partner/view/:id", isAdmin, PartnerAdminController.PartnerView);
admin.get("/partner/reports", isAdmin, PartnerAdminController.PartnerReports);

// Package views
admin.get("/package/list", isAdmin, PartnerAdminController.PackageList);
admin.get("/package/create", isAdmin, PartnerAdminController.PackageCreate);
admin.get("/package/edit/:id", isAdmin, PartnerAdminController.PackageEdit);

// Payment admin view
admin.get("/payment/list", isAdmin, PartnerAdminController.PaymentList);

// Renewal price view
admin.get(
  "/renewal-price/list",
  isAdmin,
  PartnerAdminController.RenewalPriceList
);
admin.get("/referralreport/:id", isAdmin, DashboardController.ReferralDetail);
admin.get("/referralreport", isAdmin, DashboardController.ReferralReport);

// :::::::::::::::::::STRIPE:::::::::::::::::::::
admin.get("/stripedetail", isAdmin, DashboardController.Stripe);

// :::::::::::::::::::NOTIFICATION:::::::::::::::::::::
admin.get("/notification", isAdmin, DashboardController.AdminNotification);
admin.get("/notificationcount", isAdmin, AdminController.Notificationcount);
admin.get("/deletnotifaction", AdminController.DeletNotifaction);

admin.get("/deletestripedetail", isAdmin, AdminController.DeleteStripeDetail);

// ::::::::::::::::::::::::::::::EXPORT:::::::::::::::::::::::::::::::
admin.get("/exportdata", isAdmin, AdminController.ExportDataReferral);
admin.get("/exportstrapedata", isAdmin, AdminController.ExportDataStrape);
admin.get("/exportrefreport", isAdmin, AdminController.ExportDataRefReport);
admin.get("/exportrefdetail", isAdmin, AdminController.ExportDataRefDetail);

admin.post("/createadmin", MasterAdminController.CreateAdmin);
admin.get("/createadmin", DashboardController.CreateAdmin);

// admin.post("/addrol",MasterAdminController.AddRole);

admin.get("/paymentconfiguration", DashboardController.PaymentConfiguration);
admin.get(
  "/addpaymentconfiguration",
  DashboardController.AddPaymentConfiguration
);
admin.get(
  "/editpaymentconfiguration",
  DashboardController.EditPaymentConfiguration
);

admin.post("/addpaymentconfiguration", AdminController.PaymentConfiguration);
admin.post(
  "/editpaymentconfiguration",
  AdminController.EditPaymentconfiguration
);

admin.get("/membershipstripe", DashboardController.MembershipStripePayment);
admin.get("/usdtmembership", isAdmin, DashboardController.USDTPayment);
admin.get(
  "/telegramcoinmembership",
  isAdmin,
  DashboardController.TelegramCoinPayment
);
admin.get("/deletestripepayment", AdminController.DeleteStripePayment);
admin.get("/exportstripedetail", AdminController.ExportStripeDetail);
admin.get("/exportusdtpayment", AdminController.ExportUSDTPayment);
admin.get(
  "/exporttelegramcoinpayment",
  AdminController.ExportTelegramCoinPayment
);

// USDT Payment Actions
admin.get("/approveusdtpayment", AdminController.ApproveUSDTPayment);
admin.get("/rejectusdtpayment", AdminController.RejectUSDTPayment);
admin.get("/deleteusdtpayment", AdminController.DeleteUSDTPayment);

admin.get("/adminuserlist", DashboardController.AdminUser);
admin.get("/editadminuser", DashboardController.EditAdminUser);
admin.post("/editadminusers", MasterAdminController.EditAdminUser);
admin.get("/deleteadminuser", AdminController.DeleteAdminUser);
admin.post("/set-telegram-premium", AdminController.setTelegramPremium);

// Membership Expiry Check
admin.get(
  "/check-expired-memberships",
  isAdmin,
  AdminController.CheckExpiredMemberships
);

export default admin;
