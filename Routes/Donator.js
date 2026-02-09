import express from "express";
import DonatorController from "../Controllers/DonatorController.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";
import isOperator from "../Middleware/OperatorAuthentication.js";

const donator = express.Router();

// ======================== PUBLIC ROUTES ========================

// List all active packages
donator.get("/packages", DonatorController.ListPackages);

// ======================== OPERATOR ROUTES ========================

// Operator registration
donator.post("/operator/register", DonatorController.OperatorRegister);

// Operator login
donator.post("/operator/login", DonatorController.OperatorLogin);

// Operator: Get profile (protected)
donator.get(
  "/operator/profile",
  isOperator,
  DonatorController.GetOperatorProfile,
);

// Operator: Get current credits (protected)
donator.get(
  "/operator/credits",
  isOperator,
  DonatorController.GetOperatorCredits,
);

// Operator: Get list of sub-operators (protected)
donator.get(
  "/operator/operators",
  isOperator,
  DonatorController.GetOperatorsList,
);

// Operator: Get list of users/employees (protected)
donator.get("/operator/users", isOperator, DonatorController.GetOperatorUsers);

// Operator: Buy package (protected)
donator.post("/buy", isOperator, DonatorController.BuyPackage);

// Operator: Create employee account (protected)
donator.post(
  "/operator/create-employee",
  isOperator,
  DonatorController.CreateEmployee,
);

// ======================== ADMIN ROUTES ========================

// Admin: Create package
donator.post("/admin/package/create", isAdmin, DonatorController.CreatePackage);

// Admin: Update package
donator.post(
  "/admin/package/edit/:id",
  isAdmin,
  DonatorController.UpdatePackage,
);

// Admin: Approve purchase
donator.post(
  "/admin/purchase/approve/:id",
  isAdmin,
  DonatorController.ApprovePurchase,
);

// Admin: Reject purchase
donator.post(
  "/admin/purchase/reject/:id",
  isAdmin,
  DonatorController.RejectPurchase,
);

export default donator;
