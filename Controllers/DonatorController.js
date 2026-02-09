import express from "express";
import { Validator } from "node-input-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import moment from "moment";
import { validatorError } from "../Common.js";
import { baseUrl } from "../Config.js";

import DonatorPackageModel from "../Models/DonatorPackage.js";
import DonatorPurchaseModel from "../Models/DonatorPurchase.js";
import OperatorModel from "../Models/Operator.js";
import DonatorAuditModel from "../Models/DonatorAudit.js";
import UserModel from "../Models/User.js";

const accessTokenSecret = process.env.JWT_SECRET_KEY;
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;

class DonatorController {
  // Utility to generate random username
  static generateUsername() {
    return crypto.randomBytes(4).toString("hex");
  }

  // ======================== OPERATOR MANAGEMENT ========================

  /**
   * Admin: Create new operator
   * POST /admin/donator/operator/create
   */
  static CreateOperator = async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        confirmPassword,
        isActive,
        initialCredits,
        initialOperatorSlots,
      } = req.body;

      const validator = new Validator(
        { name, email, password, confirmPassword },
        {
          name: "required|string",
          email: "required|email",
          password: "required|minLength:8",
          confirmPassword: "required",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      if (password !== confirmPassword) {
        return res.status(422).json({
          success: false,
          message: "Passwords do not match",
        });
      }

      const existingOperator = await OperatorModel.findOne({ email });
      if (existingOperator) {
        return res.status(422).json({
          success: false,
          message: "Email already registered",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const operator = new OperatorModel({
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        isActive: isActive !== false,
        credits: initialCredits ? parseInt(initialCredits) : 0,
        operatorSlots: initialOperatorSlots
          ? parseInt(initialOperatorSlots)
          : 0,
        createdByAdmin: req.user._id,
      });

      const savedOperator = await operator.save();

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "operator.create",
        details: {
          email: savedOperator.email,
          name: savedOperator.name,
          credits: savedOperator.credits,
          operatorSlots: savedOperator.operatorSlots,
        },
        entityType: "Operator",
        entityId: savedOperator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Operator created successfully",
        data: {
          _id: savedOperator._id,
          name: savedOperator.name,
          email: savedOperator.email,
          credits: savedOperator.credits,
          operatorSlots: savedOperator.operatorSlots || 0,
          isActive: savedOperator.isActive,
        },
      });
    } catch (error) {
      console.error("CreateOperator error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Register/Sign up
   * POST /donator/operator/register
   */
  static OperatorRegister = async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;

      const validator = new Validator(
        { name, email, password, confirmPassword },
        {
          name: "required|string",
          email: "required|email",
          password: "required|minLength:8",
          confirmPassword: "required",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      if (password !== confirmPassword) {
        return res.status(422).json({
          success: false,
          message: "Passwords do not match",
        });
      }

      const existingOperator = await OperatorModel.findOne({ email });
      if (existingOperator) {
        return res.status(422).json({
          success: false,
          message: "Email already registered",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const operator = new OperatorModel({
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        isActive: true,
      });

      const savedOperator = await operator.save();

      // Audit log
      await DonatorAuditModel.create({
        actorType: "operator",
        actorId: savedOperator._id,
        action: "operator.register",
        details: { email: savedOperator.email },
        entityType: "Operator",
        entityId: savedOperator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Operator registered successfully",
        data: {
          _id: savedOperator._id,
          name: savedOperator.name,
          email: savedOperator.email,
        },
      });
    } catch (error) {
      console.error("OperatorRegister error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Login
   * POST /donator/operator/login
   */
  static OperatorLogin = async (req, res) => {
    try {
      const { email, password } = req.body;

      const validator = new Validator(
        { email, password },
        {
          email: "required|email",
          password: "required",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const operator = await OperatorModel.findOne({
        email: email.toLowerCase(),
      });

      if (!operator) {
        return res.status(422).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (!operator.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated",
        });
      }

      const passwordMatch = await bcrypt.compare(password, operator.password);
      if (!passwordMatch) {
        return res.status(422).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const payload = {
        id: operator._id,
        email: operator.email,
      };

      const token = jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });

      await OperatorModel.findByIdAndUpdate(operator._id, {
        token,
        lastLogin: new Date(),
      });

      // Audit log
      await DonatorAuditModel.create({
        actorType: "operator",
        actorId: operator._id,
        action: "operator.login",
        details: { email: operator.email },
        entityType: "Operator",
        entityId: operator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          _id: operator._id,
          name: operator.name,
          email: operator.email,
          credits: operator.credits,
          token,
        },
      });
    } catch (error) {
      console.error("OperatorLogin error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Get own profile
   * GET /donator/operator/profile
   */
  static GetOperatorProfile = async (req, res) => {
    try {
      const operator = await OperatorModel.findById(req.operator._id).select(
        "-password",
      );

      return res.status(200).json({
        success: true,
        data: operator,
      });
    } catch (error) {
      console.error("GetOperatorProfile error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Get current credits
   * GET /donator/operator/credits
   */
  static GetOperatorCredits = async (req, res) => {
    try {
      const operator = await OperatorModel.findById(req.operator._id).select(
        "credits operatorSlots",
      );

      if (!operator) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          credits: operator.credits,
          operatorSlots: operator.operatorSlots,
        },
      });
    } catch (error) {
      console.error("GetOperatorCredits error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Get list of sub-operators (if applicable)
   * GET /donator/operator/operators
   */
  static GetOperatorsList = async (req, res) => {
    try {
      const operators = await OperatorModel.find({
        createdByAdmin: req.operator._id,
      }).select("name email credits operatorSlots isActive createdAt");

      return res.status(200).json({
        success: true,
        data: operators,
        total: operators.length,
      });
    } catch (error) {
      console.error("GetOperatorsList error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Operator: Get list of employees created by this operator
   * GET /donator/operator/users
   */
  static GetOperatorUsers = async (req, res) => {
    try {
      // Since User model doesn't have createdBy field, we'll search by tgid creation context
      // This is a limitation of the current schema, but we can return users based on operator session
      const users = await UserModel.find({
        // Filter users, but since there's no direct relationship, we'll need to check from purchases
      }).select(
        "firstname lastname username email tgid membertype memberid createdAt",
      );

      // Alternative: Get users from DonatorPurchase records
      const purchases = await DonatorPurchaseModel.find({
        operator: req.operator._id,
        status: 1, // Only approved purchases
      }).populate("package");

      // Count users per operator from successful purchases
      // Since User model doesn't track creator, we can only count potential users based on credits used
      const creditsUsed = purchases.reduce(
        (sum, p) => sum + p.creditsGrantedEmployee,
        0,
      );
      const potentialUsers = creditsUsed; // Each credit = 1 employee

      return res.status(200).json({
        success: true,
        data: {
          creditsUsed,
          potentialUsers,
          purchases: purchases.map((p) => ({
            _id: p._id,
            packageName: p.package.name,
            creditsGranted: p.creditsGrantedEmployee,
            createdAt: p.approvedAt || p.createdAt,
          })),
        },
        total: potentialUsers,
      });
    } catch (error) {
      console.error("GetOperatorUsers error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  // ======================== PACKAGE MANAGEMENT (ADMIN) ========================

  /**
   * Admin: Create donator package
   * POST /admin/donator/package/create
   */
  static CreatePackage = async (req, res) => {
    try {
      const { name, employeeCredits, operatorCredits, price, status } =
        req.body;

      const validator = new Validator(
        { name, employeeCredits, operatorCredits, price },
        {
          name: "required|string",
          employeeCredits: "required|integer",
          operatorCredits: "required|integer",
          price: "required|numeric",
        },
      );

      if (!(await validator.check())) {
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });
      }

      const package_ = new DonatorPackageModel({
        name: name.trim(),
        employeeCredits: parseInt(employeeCredits),
        operatorCredits: parseInt(operatorCredits),
        price: parseFloat(price),
        status: status !== undefined ? parseInt(status) : 1,
      });

      const savedPackage = await package_.save();

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.create",
        details: {
          name: savedPackage.name,
          employeeCredits: savedPackage.employeeCredits,
          operatorCredits: savedPackage.operatorCredits,
          price: savedPackage.price,
        },
        entityType: "DonatorPackage",
        entityId: savedPackage._id,
      });

      return res.status(200).json({
        success: true,
        message: "Package created successfully",
        data: savedPackage,
      });
    } catch (error) {
      console.error("CreatePackage error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Update donator package
   * POST /admin/donator/package/edit/:id
   */
  static UpdatePackage = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, employeeCredits, operatorCredits, price, status } =
        req.body;

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (employeeCredits !== undefined)
        updateData.employeeCredits = parseInt(employeeCredits);
      if (operatorCredits !== undefined)
        updateData.operatorCredits = parseInt(operatorCredits);
      if (price !== undefined) updateData.price = parseFloat(price);
      if (status !== undefined) updateData.status = parseInt(status);

      const updatedPackage = await DonatorPackageModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true },
      );

      if (!updatedPackage) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.update",
        details: updateData,
        entityType: "DonatorPackage",
        entityId: updatedPackage._id,
      });

      return res.status(200).json({
        success: true,
        message: "Package updated successfully",
        data: updatedPackage,
      });
    } catch (error) {
      console.error("UpdatePackage error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Delete donator package
   * DELETE /admin/donator/package/:id
   */
  static DeletePackage = async (req, res) => {
    try {
      const { id } = req.params;

      const deletedPackage = await DonatorPackageModel.findByIdAndDelete(id);

      if (!deletedPackage) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.delete",
        details: {
          name: deletedPackage.name,
          employeeCredits: deletedPackage.employeeCredits,
          operatorCredits: deletedPackage.operatorCredits,
          price: deletedPackage.price,
        },
        entityType: "DonatorPackage",
        entityId: deletedPackage._id,
      });

      return res.status(200).json({
        success: true,
        message: "Package deleted successfully",
        data: deletedPackage,
      });
    } catch (error) {
      console.error("DeletePackage error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Public: List all active packages
   * GET /donator/packages
   */
  static ListPackages = async (req, res) => {
    try {
      const packages = await DonatorPackageModel.find({ status: 1 }).sort({
        price: 1,
      });

      // Backwards-compatibility: map legacy `credits` -> `employeeCredits`
      const mapped = packages.map((p) => {
        const obj = p.toObject ? p.toObject() : p;
        if (obj.employeeCredits === undefined && obj.credits !== undefined)
          obj.employeeCredits = obj.credits;
        if (obj.operatorCredits === undefined)
          obj.operatorCredits = obj.operatorCredits || 0;
        return obj;
      });

      return res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      console.error("ListPackages error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  // ======================== PURCHASE MANAGEMENT ========================

  /**
   * Operator: Buy a package
   * POST /donator/buy
   */
  static BuyPackage = async (req, res) => {
    try {
      const { packageId, transactionId } = req.body;

      const validator = new Validator(
        { packageId, transactionId },
        {
          packageId: "required",
          transactionId: "required|string",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Check package exists
      const package_ = await DonatorPackageModel.findById(packageId);
      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check transaction ID uniqueness
      const existingPurchase = await DonatorPurchaseModel.findOne({
        transactionId,
      });
      if (existingPurchase) {
        return res.status(422).json({
          success: false,
          message: "Transaction already exists",
        });
      }

      // Create purchase record (pending)
      const purchase = new DonatorPurchaseModel({
        operator: req.operator._id,
        package: packageId,
        amount: package_.price,
        currency: package_.currency,
        transactionId,
        paymentMethod: "USDT",
        status: 0, // pending
      });

      const savedPurchase = await purchase.save();

      // Audit log
      await DonatorAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "purchase.create",
        details: {
          packageId,
          amount: package_.price,
          transactionId,
        },
        entityType: "DonatorPurchase",
        entityId: savedPurchase._id,
      });

      return res.status(200).json({
        success: true,
        message: "Purchase created. Awaiting admin approval.",
        data: {
          purchaseId: savedPurchase._id,
          status: savedPurchase.status,
          amount: savedPurchase.amount,
        },
      });
    } catch (error) {
      console.error("BuyPackage error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Approve purchase and grant credits
   * POST /admin/donator/purchase/approve/:id
   */
  static ApprovePurchase = async (req, res) => {
    try {
      const { id } = req.params;

      const purchase =
        await DonatorPurchaseModel.findById(id).populate("package");
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      if (purchase.status !== 0) {
        return res.status(422).json({
          success: false,
          message: "Only pending purchases can be approved",
        });
      }

      const employeeCreditsToAdd = purchase.package.employeeCredits || 0;
      const operatorCreditsToAdd = purchase.package.operatorCredits || 0;

      // Atomically update operator: employee creation credits + operator slots
      const updatedOperator = await OperatorModel.findByIdAndUpdate(
        purchase.operator,
        {
          $inc: {
            credits: employeeCreditsToAdd,
            operatorSlots: operatorCreditsToAdd,
          },
        },
        { new: true },
      );

      // Update purchase
      await DonatorPurchaseModel.findByIdAndUpdate(id, {
        status: 1, // approved
        creditsGrantedEmployee: employeeCreditsToAdd,
        creditsGrantedOperator: operatorCreditsToAdd,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "purchase.approve",
        details: {
          operatorId: purchase.operator,
          employeeCreditsAdded: employeeCreditsToAdd,
          operatorSlotsAdded: operatorCreditsToAdd,
          previousEmployeeBalance:
            updatedOperator.credits - employeeCreditsToAdd,
          newEmployeeBalance: updatedOperator.credits,
          previousOperatorSlots:
            (updatedOperator.operatorSlots || 0) - operatorCreditsToAdd,
          newOperatorSlots: updatedOperator.operatorSlots || 0,
        },
        entityType: "DonatorPurchase",
        entityId: purchase._id,
      });

      return res.status(200).json({
        success: true,
        message: `Purchase approved. ${employeeCreditsToAdd} employee credits and ${operatorCreditsToAdd} operator slots added to operator.`,
        data: {
          operatorCredits: updatedOperator.credits,
          operatorSlots: updatedOperator.operatorSlots || 0,
        },
      });
    } catch (error) {
      console.error("ApprovePurchase error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Reject purchase
   * POST /admin/donator/purchase/reject/:id
   */
  static RejectPurchase = async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      const purchase = await DonatorPurchaseModel.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      if (purchase.status !== 0) {
        return res.status(422).json({
          success: false,
          message: "Only pending purchases can be rejected",
        });
      }

      await DonatorPurchaseModel.findByIdAndUpdate(id, {
        status: 2, // rejected
        rejectionReason: rejectionReason || "No reason provided",
      });

      // Audit log
      await DonatorAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "purchase.reject",
        details: {
          reason: rejectionReason,
        },
        entityType: "DonatorPurchase",
        entityId: purchase._id,
      });

      return res.status(200).json({
        success: true,
        message: "Purchase rejected",
      });
    } catch (error) {
      console.error("RejectPurchase error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  // ======================== EMPLOYEE CREATION ========================

  /**
   * Operator: Create employee user account
   * POST /donator/operator/create-employee
   */
  static CreateEmployee = async (req, res) => {
    try {
      const { employeeTgid, employeeEmail, employeeName } = req.body;

      const validator = new Validator(
        { employeeTgid, employeeEmail },
        {
          employeeTgid: "required|string",
          employeeEmail: "email",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Check if tgid already exists
      const existingUser = await UserModel.findOne({ tgid: employeeTgid });
      if (existingUser) {
        return res.status(422).json({
          success: false,
          message: "User with this Telegram ID already exists",
        });
      }

      // Atomically deduct credits and check balance
      const operator = await OperatorModel.findByIdAndUpdate(
        req.operator._id,
        { $inc: { credits: -1 } },
        { new: true },
      );

      if (operator.credits < 0) {
        // Revert the decrement
        await OperatorModel.findByIdAndUpdate(req.operator._id, {
          $inc: { credits: 1 },
        });

        return res.status(409).json({
          success: false,
          message: "Insufficient credits",
        });
      }

      // Generate freeUsername (unique random)
      let generatedUsername = DonatorController.generateUsername();
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) {
          isUnique = true;
        } else {
          generatedUsername = DonatorController.generateUsername();
        }
      }

      // Set username to tgid with collision handling
      let activeUsername = employeeTgid;
      const usernameConflict = await UserModel.findOne({
        username: employeeTgid,
      });
      if (usernameConflict) {
        activeUsername =
          employeeTgid + "-" + crypto.randomBytes(2).toString("hex");
      }

      // Calculate membership dates
      const package_ = await DonatorPurchaseModel.findOne({
        operator: req.operator._id,
        status: 1,
      }).populate("package");

      const validityYears = 1;

      const startDate = moment().format("YYYY-MM-DD");
      const endDate = moment().add(validityYears, "years").format("YYYY-MM-DD");

      // Create employee user
      const employee = new UserModel({
        username: activeUsername,
        freeUsername: generatedUsername,
        tgid: employeeTgid,
        email: employeeEmail || null,
        firstname: employeeName || "Employee",
        usertype: 1, // Premium
        membertype: "premium",
        membershiperiod: validityYears * 12, // In months
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: 7, // Donator code
        country: "", // Can be updated later
        memberid: await DonatorController.generateMemberId(),
      });

      const savedEmployee = await employee.save();

      // Generate token for the new employee
      const payload = {
        id: savedEmployee._id,
        username: activeUsername,
      };
      const token = jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });

      await UserModel.findByIdAndUpdate(savedEmployee._id, { token });

      // Audit log
      await DonatorAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "employee.create",
        details: {
          tgid: employeeTgid,
          email: employeeEmail,
          name: employeeName,
          username: activeUsername,
          freeUsername: generatedUsername,
        },
        entityType: "User",
        entityId: savedEmployee._id,
      });

      return res.status(200).json({
        success: true,
        message: "Employee account created successfully",
        data: {
          userId: savedEmployee._id,
          username: activeUsername,
          freeUsername: generatedUsername,
          tgid: employeeTgid,
          email: employeeEmail,
          membershipEnd: endDate,
          token,
        },
      });
    } catch (error) {
      console.error("CreateEmployee error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Helper: Generate unique member ID
   */
  static generateMemberId = async () => {
    const count = await UserModel.countDocuments();
    const id = "DONATOR-" + (count + 1).toString().padStart(8, "0");
    return id;
  };
}

export default DonatorController;
