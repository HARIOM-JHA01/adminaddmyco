import express from "express"
const admin = express.Router();
import DashboardController from "../Controllers/DashboardController.js";
import ReferralController from "../Controllers/ReferralController.js";
import AdminController from '../Controllers/AdminController.js'
import { isAdmin } from "../Middleware/AdminAuthentication.js";


// .........................DASHBOARD-CONTROLLER........................
admin.get("/",DashboardController.signIn);
admin.get("/signup",DashboardController.signUp);
admin.get("/signin",DashboardController.signIn);
admin.get("/dashboard",isAdmin,DashboardController.home);
admin.get("/forgotpassword",DashboardController.ForgotPassword);
admin.get("/resetpassword",DashboardController.ResetPassword);
admin.get("/changepassword",DashboardController.ChangePassword);
admin.get("/myaccount",isAdmin,DashboardController.MyAccount);

// .................................USERS................................   
admin.get("/freeuser",isAdmin,DashboardController.FreeUser);
admin.get("/premium",isAdmin,DashboardController.PremiumUser);
admin.get("/donateduser",isAdmin,DashboardController.DonatedUser);

// .............................BANNERS..................................
admin.get("/banner",isAdmin,DashboardController.Banner);
admin.get("/addbanner",isAdmin,DashboardController.AddBanner);
admin.get("/editbanner",isAdmin,DashboardController.EditBanner);
admin.get("/view-banner",isAdmin,DashboardController.Viewbanner);

// ..........................MEMBERSHIP[CONFIGURATION]...................
admin.get("/membership",isAdmin,DashboardController.MembershipTenure);
admin.get("/addmembership",isAdmin,DashboardController.AddMembershipTenure);
admin.get("/editmembership",isAdmin,DashboardController.EditMembershipTenure);

// .........................SYSTEM[CONFIGURATION]........................
admin.get("/system",isAdmin, DashboardController.SystemImages);
admin.get("/addsystem",isAdmin, DashboardController.AddsystemImages);
admin.get("/editsystem",isAdmin, DashboardController.EditsystemImages);

// .........................FOLDERS[CONFIGURATION]........................
admin.get("/folder",isAdmin,DashboardController.Folder);
admin.get("/addfolder",isAdmin,DashboardController.AddFolder);
admin.get("/editfolder",isAdmin,DashboardController.EditFolder);

// .........................CURRENCY......................................
// admin.get("/currency",DashboardController.Currency);

// .......................PAYMENT[PAYPAL].................................
admin.get("/paypal",isAdmin,DashboardController.Paypal);

// .......................PAYMENT[TONCOIN]................................
admin.get("/toncoin",isAdmin,DashboardController.Toncoin);


// ..........................ADMIN-CONTROLLER.............................
admin.post("/Register",AdminController.Adminregister);
admin.post("/login",AdminController.Adminlogin);
admin.get("/Logout",AdminController.Adminlogout);
admin.post("/ForgotPassword",AdminController.ForgotPassword);
admin.post("/OtpVarify",AdminController.OtpVarify);
admin.post("/ResetPassword",AdminController.ResetPassword);
admin.post("/ChangePassword",isAdmin,AdminController.ChangePassword);
admin.post("/MyAccount",AdminController.MyAccount);

// ..........................BANNERS......................................
admin.post("/banner",AdminController.Banner);
admin.post("/editbanner",AdminController.EditBanner);
admin.get("/deletebanner",AdminController.DeleteBanner);

// .....................MEMEBRSHIP[CONFIGURATION].........................
admin.post("/membership",AdminController.MembershipTenure);
admin.post("/editmembership",AdminController.EditMembershipTenure);
admin.get("/deletemembership",AdminController.DeleteMembershipTenure)

// .........................SYSTEM[CONFIGURATION].........................
admin.post("/system", AdminController.SystemImages);
admin.post("/updatesystem", AdminController.EditSystemImages);
admin.get("/deletesystem", AdminController.DeletesystemImages);
admin.get("/deletesystempic", AdminController.Deletesystempic);

// .........................FOLDERS[CONFIGURATION]........................
admin.post("/folder",AdminController.Folder);
admin.post("/editfolder",AdminController.EditFolder);
admin.get("/deletefolder",AdminController.DeleteFolder)

// .......................DELETUSERS[FREE,PREMIUM,DONATED]................
admin.get("/deleteuser",AdminController.DeleteUser)
admin.get("/viewuser",AdminController.ViewUser)
admin.get("/updatefreeuser",AdminController.UpdateUser)
admin.get("/deletepremiumuser",AdminController.DeletePremiumUser)
admin.get("/updatepremiumuser",AdminController.UpdatePremiumUser)
admin.get("/viewpremiumuser",AdminController.ViewPremiumUser)
admin.get("/deletedonateduser",AdminController.DeleteDonatedUser)
admin.get("/viewdonateduser",AdminController.ViewDonatedUser)

// ........................TONCOIN & PAYPAL...............................
admin.get("/approvetoncoin",AdminController.ApproveToncoin)
admin.get("/rejecttoncoin",AdminController.RejectToncoin)
admin.get("/deletetoncoin",AdminController.DeleteToncoin)

// ....................CONFIGURATION......................................
admin.get("/configuration",AdminController.Configuration);
admin.get("/addconfiguration",AdminController.add_configuration);
admin.get("/editconfiguration",AdminController.edit_configuration);
admin.post("/configuration",AdminController.configuration);
admin.post("/editconfiguration",AdminController.editconfiguration);
admin.get("/deleteconfiguration",AdminController.deleteconfiguration);

// .....................CATEGORIES........................................
admin.get("/categories",AdminController.Categories);
admin.get("/addcategories",AdminController.Addcategories);
admin.get("/editcategories",AdminController.Editcategories);
admin.post("/category",AdminController.Category);
admin.post("/editcategory",AdminController.Editcategory);
admin.get("/deletecategories",AdminController.Deletecategory);


// ..........................REFERRAL..............................
admin.get("/referral",DashboardController.Referral);
admin.get("/deletereferraluser",ReferralController.DeleteRefer);
admin.get("/approvereferral",ReferralController.ApproveReferral);
admin.get("/approvepremium",ReferralController.ApprovePrimium);
admin.put("/update-referral/:id",DashboardController.UpdateReferral);
// admin.get("/referralrequest",DashboardController.ReferralRequest);


// .............................BANNERS..................................
admin.get("/logo",isAdmin,DashboardController.Logo);
admin.get("/addlogo",isAdmin,DashboardController.AddLogo);
admin.get("/editlogo",isAdmin,DashboardController.EditLogo);

// ..........................BANNERS......................................
admin.post("/logo", AdminController.Logo);
admin.post("/editlogo", AdminController.EditLogo);

// ..........................REFERRALMEMBERSHIP[CONFIGURATION]...................
admin.get("/referralmembership",isAdmin,DashboardController.ReferralMembershipTenure);
admin.get("/addreferralmembership",isAdmin,DashboardController.AddReferralMembershipTenure);
admin.get("/editreferralmembership",isAdmin,DashboardController.EditReferralMembershipTenure);

// .....................MEMEBRSHIP[CONFIGURATION].........................
admin.post("/referralmembership",AdminController.ReferralMembershipTenure);
admin.post("/editreferralmembership",AdminController.EditReferralMembershipTenure);
admin.get("/deletereferralmembership",AdminController.DeleteReferralMembershipTenure)



export default admin