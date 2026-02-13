import express from "express";
const admin = express.Router();
import DashboardController from "../Controllers/DashboardController.js";
import ReferralController from "../Controllers/ReferralController.js";
import AdminController from "../Controllers/AdminController.js";
import MasterAdminController from "../Controllers/MasterAdminController.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";
import PartnerAdminController from "../Controllers/PartnerAdminController.js";
import DonatorAdminController from "../Controllers/DonatorAdminController.js";
import DonatorController from "../Controllers/DonatorController.js";

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
admin.get("/donateduser/view/:id", isAdmin, DashboardController.ViewDonator);

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
  DashboardController.ReferralMembershipTenure,
);
admin.get(
  "/addreferralmembership",
  isAdmin,
  DashboardController.AddReferralMembershipTenure,
);
admin.get(
  "/editreferralmembership",
  isAdmin,
  DashboardController.EditReferralMembershipTenure,
);

// .....................MEMEBRSHIP[CONFIGURATION].........................
admin.post("/referralmembership", AdminController.ReferralMembershipTenure);
admin.post(
  "/editreferralmembership",
  AdminController.EditReferralMembershipTenure,
);
admin.get(
  "/deletereferralmembership",
  AdminController.DeleteReferralMembershipTenure,
);

// :::::::::::::::::::REFERRAL-DETAIL:::::::::::::::::::::

// Partner admin views
admin.get("/partner/list", isAdmin, PartnerAdminController.PartnerList);
admin.get("/partner/view/:id", isAdmin, PartnerAdminController.PartnerView);
admin.get("/partner/reports", isAdmin, PartnerAdminController.PartnerReports);
admin.get("/partner/delete/:id", isAdmin, PartnerAdminController.DeletePartner);
// Also accept query param for older or external links
admin.get("/partner/delete", isAdmin, PartnerAdminController.DeletePartner);

// Package views
admin.get("/package/list", isAdmin, PartnerAdminController.PackageList);
admin.get("/package/create", isAdmin, PartnerAdminController.PackageCreate);
admin.post(
  "/package/create",
  isAdmin,
  PartnerAdminController.PackageCreatePost,
);
admin.get("/package/edit/:id", isAdmin, PartnerAdminController.PackageEdit);
admin.post("/package/edit", isAdmin, PartnerAdminController.PackageEditPost);
// also support sending id in URL for clients that POST to /package/edit/:id
admin.post(
  "/package/edit/:id",
  isAdmin,
  PartnerAdminController.PackageEditPost,
);
admin.get("/package/delete/:id", isAdmin, PartnerAdminController.PackageDelete);
admin.get("/package/delete", isAdmin, PartnerAdminController.PackageDelete);
admin.get(
  "/package/activate/:id",
  isAdmin,
  PartnerAdminController.PackageActivate,
);
// also accept query param for backward compatibility
admin.get("/package/activate", isAdmin, PartnerAdminController.PackageActivate);
admin.get(
  "/package/deactivate/:id",
  isAdmin,
  PartnerAdminController.PackageDeactivate,
);
// also accept query param for backward compatibility
admin.get(
  "/package/deactivate",
  isAdmin,
  PartnerAdminController.PackageDeactivate,
);

// Payment admin view
admin.get("/payment/list", isAdmin, PartnerAdminController.PaymentList);
// Support both GET (UI calls) and POST for approving payments
admin.get("/payment/approve", isAdmin, PartnerAdminController.ApprovePayment);
admin.post("/payment/approve", isAdmin, PartnerAdminController.ApprovePayment);
admin.post("/payment/reject", isAdmin, PartnerAdminController.RejectPayment);

// Renewal price admin pages removed per request
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
  DashboardController.AddPaymentConfiguration,
);
admin.get(
  "/editpaymentconfiguration",
  DashboardController.EditPaymentConfiguration,
);

admin.post("/addpaymentconfiguration", AdminController.PaymentConfiguration);
admin.post(
  "/editpaymentconfiguration",
  AdminController.EditPaymentconfiguration,
);

admin.get("/membershipstripe", DashboardController.MembershipStripePayment);
admin.get("/usdtmembership", isAdmin, DashboardController.USDTPayment);
admin.get(
  "/telegramcoinmembership",
  isAdmin,
  DashboardController.TelegramCoinPayment,
);
admin.get("/deletestripepayment", AdminController.DeleteStripePayment);
admin.get("/exportstripedetail", AdminController.ExportStripeDetail);
admin.get("/exportusdtpayment", AdminController.ExportUSDTPayment);
admin.get(
  "/exporttelegramcoinpayment",
  AdminController.ExportTelegramCoinPayment,
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
  AdminController.CheckExpiredMemberships,
);

// ........................ADVERTISEMENT...................................
admin.get("/advertisements", isAdmin, AdminController.advertisementDashboard);
admin.get(
  "/advertisements/manage",
  isAdmin,
  AdminController.manageAdvertisements,
);
admin.get("/advertisements/packages", isAdmin, AdminController.managePackages);
admin.get(
  "/advertisements/packages/create",
  isAdmin,
  AdminController.createPackagePage,
);
admin.get("/advertisements/rates", isAdmin, AdminController.manageCouponRates);
admin.post(
  "/advertisements/rates/update",
  isAdmin,
  AdminController.updateCouponRate,
);
admin.get(
  "/advertisements/credit-payments",
  isAdmin,
  AdminController.manageCreditPayments,
);

// Advertisement country-level configurations removed; manage system-wide setting at /admin/configuration (ConfigKey = ADVERTISEMENTS_COUNTRY_FILTER).
admin.get(
  "/advertisement/sponsor/:sponsorId",
  isAdmin,
  AdminController.sponsorDetails,
);

// ======================== DONATOR MODULE ========================
admin.get("/donator/packages", isAdmin, DonatorAdminController.PackageList);

admin.get(
  "/donator/package/create",
  isAdmin,
  DonatorAdminController.PackageForm,
);

admin.get(
  "/donator/package/edit/:id",
  isAdmin,
  DonatorAdminController.PackageForm,
);

admin.post("/donator/package/create", isAdmin, DonatorController.CreatePackage);

admin.post(
  "/donator/package/edit/:id",
  isAdmin,
  DonatorController.UpdatePackage,
);

admin.delete("/donator/package/:id", isAdmin, DonatorController.DeletePackage);

admin.get("/donator/purchases", isAdmin, DonatorAdminController.PurchaseList);

admin.post(
  "/donator/purchase/approve/:id",
  isAdmin,
  DonatorController.ApprovePurchase,
);

admin.post(
  "/donator/purchase/reject/:id",
  isAdmin,
  DonatorController.RejectPurchase,
);

admin.get("/donator/operators", isAdmin, DonatorAdminController.OperatorList);

// Admin API: get donator operators + employees (JSON)
admin.get(
  "/donator/operators-employees",
  isAdmin,
  AdminController.DonatorOperatorsEmployees,
);

admin.get(
  "/donator/operator/create",
  isAdmin,
  DonatorAdminController.OperatorForm,
);

admin.post(
  "/donator/operator/create",
  isAdmin,
  DonatorController.CreateOperator,
);

admin.post(
  "/donator/operator/deactivate/:id",
  isAdmin,
  DonatorAdminController.DeactivateOperator,
);

admin.post(
  "/donator/operator/activate/:id",
  isAdmin,
  DonatorAdminController.ActivateOperator,
);

admin.post(
  "/donator/operator/add-credits/:id",
  isAdmin,
  DonatorAdminController.AddCredits,
);

export default admin;
