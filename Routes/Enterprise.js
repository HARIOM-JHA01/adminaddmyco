import express from "express";
import EnterpriseController from "../Controllers/EnterpriseController.js";
import UserController from "../Controllers/UserController.js";
import CompanyTemplateController from "../Controllers/CompanyTemplateController.js";
import ChamberTemplateController from "../Controllers/ChamberTemplateController.js";
import { isAdmin } from "../Middleware/AdminAuthentication.js";
import isOperator from "../Middleware/OperatorAuthentication.js";
import { isUser } from "../Middleware/UserAuthentication.js";
import isEnterprise from "../Middleware/EnterpriseAuthentication.js";

const enterprise = express.Router();

// ======================== PUBLIC ROUTES ========================

// List all active packages
enterprise.get("/packages", EnterpriseController.ListPackages);

// ======================== OPERATOR ROUTES ========================

// Operator registration
enterprise.post("/operator/register", EnterpriseController.OperatorRegister);

// Operator login
enterprise.post("/operator/login", EnterpriseController.OperatorLogin);

// Operator: Get profile (protected)
enterprise.get(
  "/operator/profile",
  isOperator,
  EnterpriseController.GetOperatorProfile,
);

// Operator: Get current credits (protected)
enterprise.get(
  "/operator/credits",
  isOperator,
  EnterpriseController.GetOperatorCredits,
);

// Operator: Get list of sub-operators (protected)
enterprise.get(
  "/operator/operators",
  isOperator,
  EnterpriseController.GetOperatorsList,
);

// Operator: Get list of users/employees (protected)
enterprise.get(
  "/operator/users",
  isOperator,
  EnterpriseController.GetOperatorUsers,
);

// Operator: Aggregated summary (profile, operators, users, purchases, credits)
enterprise.get(
  "/operator/summary",
  isOperator,
  EnterpriseController.GetOperatorSummary,
);

// Enterprise (owner): Aggregated summary (profile, operators, users, purchases, credits)
enterprise.get(
  "/me/summary",
  isEnterprise,
  EnterpriseController.GetEnterpriseSummary,
);

// Operator: Create employee account (protected)
enterprise.post(
  "/operator/create-employee",
  isOperator,
  EnterpriseController.CreateEmployee,
);

// ======================== ENTERPRISE (owner) ROUTES ========================

// Enterprise: create an operator under your enterprise account
// POST /enterprise/me/operators
enterprise.post(
  "/me/operators",
  isEnterprise,
  EnterpriseController.CreateOperatorByEnterprise,
);

// Enterprise: list operators you created
// GET /enterprise/me/operators
enterprise.get(
  "/me/operators",
  isEnterprise,
  EnterpriseController.GetEnterpriseOperators,
);

// Enterprise: get detailed info about a specific operator
// GET /enterprise/me/operators/:operatorId
enterprise.get(
  "/me/operators/:operatorId",
  isEnterprise,
  EnterpriseController.GetOperatorDetails,
);

// Enterprise: delete an operator
// DELETE /enterprise/me/operators/:operatorId
enterprise.delete(
  "/me/operators/:operatorId",
  isEnterprise,
  EnterpriseController.DeleteOperator,
);

// Enterprise: reset operator password (enterprise owner)
// POST /enterprise/me/operators/:operatorId/reset-password
enterprise.post(
  "/me/operators/:operatorId/reset-password",
  isEnterprise,
  EnterpriseController.ResetOperatorPasswordByEnterprise,
);

// Owner-friendly aliases (keeps backward compatibility and simpler paths)
// GET /enterprise/operators -> list operators created by enterprise (alias)
enterprise.get(
  "/operators",
  isEnterprise,
  EnterpriseController.GetEnterpriseOperators,
);

// POST /enterprise/operators -> create operator under enterprise (alias)
enterprise.post(
  "/operators",
  isEnterprise,
  EnterpriseController.CreateOperatorByEnterprise,
);

// Enterprise: create a purchase (assign to your operator)
// POST /enterprise/me/buy
enterprise.post(
  "/me/buy",
  isEnterprise,
  EnterpriseController.EnterpriseBuyPackage,
);

// Enterprise: alias to create purchase: POST /enterprise/purchase
enterprise.post(
  "/purchase",
  isEnterprise,
  EnterpriseController.EnterpriseBuyPackage,
);

// Enterprise: Assign credits to an operator
// POST /enterprise/assign-credits
enterprise.post(
  "/assign-credits",
  isEnterprise,
  EnterpriseController.AssignCreditsToOperator,
);

// Enterprise: Get purchase history with pagination
// GET /enterprise/purchases
enterprise.get(
  "/purchases",
  isEnterprise,
  EnterpriseController.GetEnterprisePurchases,
);

// Enterprise: create employee (owner) (protected)
// POST /enterprise/me/employees
enterprise.post(
  "/me/employees",
  isEnterprise,
  EnterpriseController.CreateEmployeeByEnterprise,
);

// Owner-friendly alias: POST /enterprise/employees
enterprise.post(
  "/employees",
  isEnterprise,
  EnterpriseController.CreateEmployeeByEnterprise,
);

// Donator: create employee (donator users with credits)
// POST /donator/employees
enterprise.post(
  "/donator/employees",
  isUser,
  EnterpriseController.CreateEmployeeByEnterprise,
);

// -------------------- Operators --------------------
// Enterprise: create an operator under your enterprise account
// POST /enterprise/me/operators
enterprise.post(
  "/me/operators",
  isEnterprise,
  EnterpriseController.CreateOperatorByEnterprise,
);

// Owner-friendly alias: POST /enterprise/operators
enterprise.post(
  "/operators",
  isEnterprise,
  EnterpriseController.CreateOperatorByEnterprise,
);

// Donator: create operator (donator users with credits)
// POST /donator/operators
enterprise.post(
  "/donator/operators",
  isUser,
  EnterpriseController.CreateOperatorByEnterprise,
);

// Enterprise: list employees created by your operators (audit-backed)
// GET /enterprise/me/employees
enterprise.get(
  "/me/employees",
  isEnterprise,
  EnterpriseController.GetEnterpriseEmployees,
);

// Owner-friendly alias: GET /enterprise/employees
enterprise.get(
  "/employees",
  isEnterprise,
  EnterpriseController.GetEnterpriseEmployees,
);

// ======================== ADMIN ROUTES ========================

// Admin: Create package
enterprise.post(
  "/admin/package/create",
  isAdmin,
  EnterpriseController.CreatePackage,
);

// Admin: Update package
enterprise.post(
  "/admin/package/edit/:id",
  isAdmin,
  EnterpriseController.UpdatePackage,
);

// Admin: Approve purchase
enterprise.post(
  "/admin/purchase/approve/:id",
  isAdmin,
  EnterpriseController.ApprovePurchase,
);

// Admin: Reject purchase
enterprise.post(
  "/admin/purchase/reject/:id",
  isAdmin,
  EnterpriseController.RejectPurchase,
);

// ======================== 3-STAGE CREATION PROCESS ========================

// --------EMPLOYEE 3-STAGE CREATION--------

// Stage 1: Initialize Employee with Telegram Username
enterprise.post(
  "/operator/three-stage/employee/stage1",
  isOperator,
  EnterpriseController.EmployeeStage1,
);

// Stage 2: Update Employee Profile Information
enterprise.put(
  "/operator/three-stage/employee/:userId/stage2",
  isOperator,
  EnterpriseController.EmployeeStage2,
);

// Stage 3: Update Employee Company Information
enterprise.put(
  "/operator/three-stage/employee/:userId/stage3",
  isOperator,
  EnterpriseController.EmployeeStage3,
);

// --------DONATOR 3-STAGE CREATION--------

// Stage 1: Initialize Donator with Telegram Username
enterprise.post(
  "/operator/three-stage/donator/stage1",
  isOperator,
  EnterpriseController.DonatorStage1,
);

// Stage 2: Update Donator Profile Information
enterprise.put(
  "/operator/three-stage/donator/:userId/stage2",
  isOperator,
  EnterpriseController.DonatorStage2,
);

// Stage 3: Update Donator Company Information
enterprise.put(
  "/operator/three-stage/donator/:userId/stage3",
  isOperator,
  EnterpriseController.DonatorStage3,
);

// --------OPERATOR 3-STAGE CREATION--------

// Stage 1: Initialize Operator with Telegram Username
enterprise.post(
  "/me/three-stage/operator/stage1",
  isEnterprise,
  EnterpriseController.OperatorStage1,
);

// Stage 2: Update Operator Profile Information
enterprise.put(
  "/me/three-stage/operator/:operatorId/stage2",
  isEnterprise,
  EnterpriseController.OperatorStage2,
);

// Stage 3: Update Operator Company Information
enterprise.put(
  "/me/three-stage/operator/:operatorId/stage3",
  isEnterprise,
  EnterpriseController.OperatorStage3,
);

// --------TEMPLATES & EMPLOYEE NAMECARDS (OPERATOR)--------

// Create employee namecard with template selection
enterprise.post(
  "/operator/employee-namecard",
  isOperator,
  UserController.createEmployeeNamecard,
);

// Get all employee namecards for authenticated operator
enterprise.get(
  "/operator/employee-namecards",
  isOperator,
  UserController.getEmployeeNamecards,
);

// Update employee namecard
enterprise.post(
  "/operator/update-employee-namecard",
  isOperator,
  UserController.updateEmployeeNamecard,
);

// Delete employee namecard
enterprise.delete(
  "/operator/employee-namecard/:id",
  isOperator,
  UserController.deleteEmployeeNamecard,
);

// ========================================================================
// COMPANY TEMPLATE ROUTES
// ========================================================================

// ---- Operator: full CRUD on company templates ----
enterprise.post(
  "/operator/company-templates",
  isOperator,
  CompanyTemplateController.create,
);
enterprise.get(
  "/operator/company-templates",
  isOperator,
  CompanyTemplateController.list,
);
enterprise.get(
  "/operator/company-templates/:id",
  isOperator,
  CompanyTemplateController.getById,
);
enterprise.put(
  "/operator/company-templates/:id",
  isOperator,
  CompanyTemplateController.update,
);
enterprise.delete(
  "/operator/company-templates/:id",
  isOperator,
  CompanyTemplateController.delete,
);

// ---- Enterprise/Donator: full CRUD on company templates ----
enterprise.post(
  "/donator/company-templates",
  isUser,
  CompanyTemplateController.create,
);
enterprise.get(
  "/donator/company-templates",
  isUser,
  CompanyTemplateController.list,
);
enterprise.get(
  "/donator/company-templates/:id",
  isUser,
  CompanyTemplateController.getById,
);
enterprise.put(
  "/donator/company-templates/:id",
  isUser,
  CompanyTemplateController.update,
);
enterprise.delete(
  "/donator/company-templates/:id",
  isUser,
  CompanyTemplateController.delete,
);

// ---- Enterprise owner: full CRUD on company templates ----
enterprise.post(
  "/me/company-templates",
  isEnterprise,
  CompanyTemplateController.create,
);
enterprise.get(
  "/me/company-templates",
  isEnterprise,
  CompanyTemplateController.list,
);
enterprise.get(
  "/me/company-templates/:id",
  isEnterprise,
  CompanyTemplateController.getById,
);
enterprise.put(
  "/me/company-templates/:id",
  isEnterprise,
  CompanyTemplateController.update,
);
enterprise.delete(
  "/me/company-templates/:id",
  isEnterprise,
  CompanyTemplateController.delete,
);

// ========================================================================
// CHAMBER TEMPLATE ROUTES
// ========================================================================

// ---- Operator: full CRUD on chamber templates ----
enterprise.post(
  "/operator/chamber-templates",
  isOperator,
  ChamberTemplateController.create,
);
enterprise.get(
  "/operator/chamber-templates",
  isOperator,
  ChamberTemplateController.list,
);
enterprise.get(
  "/operator/chamber-templates/:id",
  isOperator,
  ChamberTemplateController.getById,
);
enterprise.put(
  "/operator/chamber-templates/:id",
  isOperator,
  ChamberTemplateController.update,
);
enterprise.delete(
  "/operator/chamber-templates/:id",
  isOperator,
  ChamberTemplateController.delete,
);

// ---- Enterprise/Donator: full CRUD on chamber templates ----
enterprise.post(
  "/donator/chamber-templates",
  isUser,
  ChamberTemplateController.create,
);
enterprise.get(
  "/donator/chamber-templates",
  isUser,
  ChamberTemplateController.list,
);
enterprise.get(
  "/donator/chamber-templates/:id",
  isUser,
  ChamberTemplateController.getById,
);
enterprise.put(
  "/donator/chamber-templates/:id",
  isUser,
  ChamberTemplateController.update,
);
enterprise.delete(
  "/donator/chamber-templates/:id",
  isUser,
  ChamberTemplateController.delete,
);

// ---- Enterprise owner: full CRUD on chamber templates ----
enterprise.post(
  "/me/chamber-templates",
  isEnterprise,
  ChamberTemplateController.create,
);
enterprise.get(
  "/me/chamber-templates",
  isEnterprise,
  ChamberTemplateController.list,
);
enterprise.get(
  "/me/chamber-templates/:id",
  isEnterprise,
  ChamberTemplateController.getById,
);
enterprise.put(
  "/me/chamber-templates/:id",
  isEnterprise,
  ChamberTemplateController.update,
);
enterprise.delete(
  "/me/chamber-templates/:id",
  isEnterprise,
  ChamberTemplateController.delete,
);

export default enterprise;
