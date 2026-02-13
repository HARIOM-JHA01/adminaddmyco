import express from "express";
import DonatorController from "../Controllers/DonatorController.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";
import isOperator from "../Middleware/OperatorAuthentication.js";
import { isUser } from "../Middleware/UserAuthentication.js";
import isDonator from "../Middleware/DonatorAuthentication.js";

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

// Operator: Aggregated summary (profile, operators, users, purchases, credits)
donator.get(
  "/operator/summary",
  isOperator,
  DonatorController.GetOperatorSummary,
);

// Donator (owner): Aggregated summary (profile, operators, users, purchases, credits)
donator.get("/me/summary", isDonator, DonatorController.GetDonatorSummary);

// Operator: Create employee account (protected)
donator.post(
  "/operator/create-employee",
  isOperator,
  DonatorController.CreateEmployee,
);

// ======================== DONATOR (owner) ROUTES ========================

// Donator: create an operator under your donator account
// POST /donator/me/operators
donator.post(
  "/me/operators",
  isDonator,
  DonatorController.CreateOperatorByDonator,
);

// Donator: list operators you created
// GET /donator/me/operators
donator.get("/me/operators", isDonator, DonatorController.GetDonatorOperators);

// Owner-friendly aliases (keeps backward compatibility and simpler paths)
// GET /donator/operators -> list operators created by donator (alias)
donator.get("/operators", isDonator, DonatorController.GetDonatorOperators);

// POST /donator/operators -> create operator under donator (alias)
donator.post(
  "/operators",
  isDonator,
  DonatorController.CreateOperatorByDonator,
);

// Donator: create a purchase (assign to your operator)
// POST /donator/me/buy
donator.post("/me/buy", isDonator, DonatorController.DonatorBuyPackage);

// Donator: alias to create purchase: POST /donator/purchase
donator.post("/purchase", isDonator, DonatorController.DonatorBuyPackage);

// Donator: Assign credits to an operator
// POST /donator/assign-credits
donator.post(
  "/assign-credits",
  isDonator,
  DonatorController.AssignCreditsToOperator,
);

// Donator: Get purchase history with pagination
// GET /donator/purchases
donator.get("/purchases", isDonator, DonatorController.GetDonatorPurchases);

// Donator: list employees created by your operators (audit-backed)
// GET /donator/me/employees
donator.get("/me/employees", isDonator, DonatorController.GetDonatorEmployees);

// Owner-friendly alias: GET /donator/employees
donator.get("/employees", isDonator, DonatorController.GetDonatorEmployees);

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
