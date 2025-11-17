import express from "express";
const partner = express.Router();
import PartnerController from "../Controllers/PartnerController.js";
import { isPartner } from "../Middleware/PartnerAuthentication.js";

// Authentication
partner.post("/telegram-login", PartnerController.TelegramLogin);

// Profile
partner.get("/profile", isPartner, PartnerController.GetProfile);

// Packages
partner.get("/packages", isPartner, PartnerController.GetPackages);
partner.post("/purchase-package", isPartner, PartnerController.PurchasePackage);

// Payment History
partner.get("/payment-history", isPartner, PartnerController.GetPaymentHistory);

// Dashboard
partner.get("/dashboard", isPartner, PartnerController.GetDashboard);

// Users Management
partner.get("/users", isPartner, PartnerController.GetMyUsers);
partner.get(
  "/users/:partnerUserId",
  isPartner,
  PartnerController.GetUserDetails
);

// Renewal
partner.get("/renewal-prices", isPartner, PartnerController.GetRenewalPrices);
partner.post(
  "/renew-membership",
  isPartner,
  PartnerController.RenewUserMembership
);

export default partner;
