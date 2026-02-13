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
        username,
        password,
        confirmPassword,
        isActive,
        initialCredits,
        initialOperatorSlots,
      } = req.body;

      const validator = new Validator(
        { name, username, password, confirmPassword },
        {
          name: "required|string",
          username: "required|string|minLength:3",
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

      const existingOperator = await OperatorModel.findOne({
        username: username.toLowerCase(),
      });
      if (existingOperator) {
        return res.status(422).json({
          success: false,
          message: "Username already registered",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const operator = new OperatorModel({
        name: name.trim(),
        username: username.toLowerCase(),
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
          username: savedOperator.username,
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
          username: savedOperator.username,
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
   * Donator (owner) aggregated summary
   * GET /donator/me/summary
   */
  static GetDonatorSummary = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const profile = await UserModel.findById(req.user._id).select(
        "-password",
      );

      // Operators created by this donator
      const operators = await OperatorModel.find({
        createdByDonator: req.user._id,
      }).select("name email credits operatorSlots isActive createdAt");

      const opIds = operators.map((o) => o._id);

      // Purchases: both direct purchases by donator AND purchases assigned to operators
      const purchases = await DonatorPurchaseModel.find({
        $or: [
          { donator: req.user._id }, // Direct purchases by this donator
          { operator: { $in: opIds } }, // Purchases assigned to operators created by this donator
        ],
      })
        .populate("package")
        .sort({ createdAt: -1 })
        .limit(100);

      const approved = purchases.filter((p) => p.status === 1);

      const totalCreditsOperator = approved.reduce(
        (sum, p) => sum + (p.creditsGrantedOperator || 0),
        0,
      );
      const totalCreditsEmployee = approved.reduce(
        (sum, p) => sum + (p.creditsGrantedEmployee || 0),
        0,
      );

      // Employee creations by those operators (via audits)
      const audits = await DonatorAuditModel.find({
        actorType: "operator",
        action: "employee.create",
        actorId: { $in: opIds },
      }).sort({ createdAt: -1 });
      const userIds = Array.from(
        new Set(audits.map((a) => String(a.entityId))),
      );

      const recentUserIds = userIds
        .slice(0, 50)
        .map((id) => require("mongoose").Types.ObjectId(id));
      const recentUsers = await UserModel.find({ _id: { $in: recentUserIds } })
        .select("username tgid email firstname lastname createdAt")
        .lean();

      // Calculate used and left credits
      const usedCreditsOperator = operators.length; // Each operator costs 1 credit
      const usedCreditsEmployee = userIds.length; // Total employees created
      const leftCreditsOperator = totalCreditsOperator - usedCreditsOperator;
      const leftCreditsEmployee = totalCreditsEmployee - usedCreditsEmployee;

      return res.status(200).json({
        success: true,
        data: {
          profile,
          operators,
          purchases: purchases.map((p) => ({
            _id: p._id,
            operator: p.operator,
            packageName: p.package ? p.package.name : null,
            creditsGrantedOperator: p.creditsGrantedOperator,
            creditsGrantedEmployee: p.creditsGrantedEmployee,
            status: p.status,
            createdAt: p.createdAt,
          })),
          purchasesSummary: {
            total: purchases.length,
            approved: approved.length,
            totalCreditsOperator,
            totalCreditsEmployee,
            usedCreditsOperator,
            usedCreditsEmployee,
            leftCreditsOperator,
            leftCreditsEmployee,
          },
          employeesSummary: {
            totalEmployeesCreated: userIds.length,
            recentUsers,
          },
        },
      });
    } catch (err) {
      console.error("GetDonatorSummary error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  };

  /**
   * Operator: Register/Sign up
   * POST /donator/operator/register
   */
  static OperatorRegister = async (req, res) => {
    try {
      const { name, username, password, confirmPassword, tgid, telegramId } =
        req.body;

      // Normalize login identifier: accept `username`, `tgid` or `telegramId`
      const loginName = (username || tgid || telegramId || "")
        .toLowerCase()
        .trim();

      const validator = new Validator(
        { name, username: loginName, password, confirmPassword },
        {
          name: "required|string",
          username: "required|string|minLength:3",
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

      const existingOperator = await OperatorModel.findOne({
        username: loginName,
      });
      if (existingOperator) {
        return res.status(422).json({
          success: false,
          message: "Username already registered",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const operator = new OperatorModel({
        name: name.trim(),
        username: loginName,
        tgid: loginName,
        telegramId: loginName,
        password: hashedPassword,
        isActive: true,
      });

      const savedOperator = await operator.save();

      // Audit log
      await DonatorAuditModel.create({
        actorType: "operator",
        actorId: savedOperator._id,
        action: "operator.register",
        details: { username: savedOperator.username },
        entityType: "Operator",
        entityId: savedOperator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Operator registered successfully",
        data: {
          _id: savedOperator._id,
          name: savedOperator.name,
          username: savedOperator.username,
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
      const { username, password, tgid, telegramId } = req.body;

      // Accept username, tgid or telegramId as equivalent
      const loginName = (username || tgid || telegramId || "")
        .toLowerCase()
        .trim();

      const validator = new Validator(
        { username: loginName, password },
        {
          username: "required|string",
          password: "required",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const operator = await OperatorModel.findOne({ username: loginName });

      if (!operator) {
        return res.status(422).json({
          success: false,
          message: "Invalid username or password",
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
        username: operator.username,
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
        details: { username: operator.username },
        entityType: "Operator",
        entityId: operator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          _id: operator._id,
          name: operator.name,
          username: operator.username,
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

  /**
   * Operator: Aggregated summary
   * GET /donator/operator/summary
   */
  static GetOperatorSummary = async (req, res) => {
    try {
      const profile = await OperatorModel.findById(req.operator._id).select(
        "-password",
      );

      const operators = await OperatorModel.find({
        createdByAdmin: req.operator._id,
      }).select("name email credits operatorSlots isActive createdAt");

      const purchases = await DonatorPurchaseModel.find({
        operator: req.operator._id,
      })
        .populate("package")
        .sort({ createdAt: -1 })
        .limit(50);

      const approved = purchases.filter((p) => p.status === 1);
      const creditsUsed = approved.reduce(
        (sum, p) => sum + (p.creditsGrantedEmployee || 0),
        0,
      );

      return res.status(200).json({
        success: true,
        data: {
          profile,
          credits: {
            credits: profile.credits,
            operatorSlots: profile.operatorSlots,
          },
          operators,
          usersSummary: {
            creditsUsed,
            potentialUsers: creditsUsed,
            purchases: approved.map((p) => ({
              _id: p._id,
              packageName: p.package ? p.package.name : null,
              creditsGranted: p.creditsGrantedEmployee,
              createdAt: p.approvedAt || p.createdAt,
            })),
          },
          purchases: purchases.map((p) => ({
            _id: p._id,
            packageName: p.package ? p.package.name : null,
            creditsGranted: p.creditsGrantedEmployee,
            status: p.status,
            createdAt: p.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error("GetOperatorSummary error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  // ======================== DONATOR (owner) - endpoints ========================
  /**
   * Donator (usertype=2): create operator under your account
   * POST /donator/me/operators
   */
  static CreateOperatorByDonator = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { tgid, password } = req.body;

      const validator = new Validator(
        { tgid, password },
        {
          tgid: "required|string|minLength:3",
          password: "required|string|minLength:6",
        },
      );

      if (!(await validator.check()))
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });

      // Check if operator with this tgid/username already exists
      const tgidClean = tgid.toLowerCase().trim();
      const existing = await OperatorModel.findOne({
        $or: [{ tgid: tgidClean }, { username: tgidClean }],
      });
      if (existing)
        return res.status(422).json({
          success: false,
          message: "Username already registered as operator",
        });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create operator
      const op = new OperatorModel({
        tgid: tgidClean,
        telegramId: tgidClean,
        username: tgidClean,
        name: tgidClean, // Use tgid as name
        password: hashedPassword,
        isActive: true,
        credits: 0,
        operatorSlots: 0,
        createdByDonator: req.user._id,
      });

      const saved = await op.save();

      await DonatorAuditModel.create({
        actorType: "donator",
        actorId: req.user._id,
        action: "operator.create",
        details: { username: saved.username },
        entityType: "Operator",
        entityId: saved._id,
      });

      return res.status(201).json({
        success: true,
        message: "Operator created successfully",
        data: {
          _id: saved._id,
          username: saved.username,
          tgid: saved.tgid,
          telegramId: saved.telegramId,
          name: saved.name,
          credits: saved.credits,
          operatorSlots: saved.operatorSlots,
          isActive: saved.isActive,
          createdAt: saved.createdAt,
        },
      });
    } catch (err) {
      console.error("CreateOperatorByDonator error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  /**
   * Donator: list operators you created
   * GET /donator/me/operators
   */
  static GetDonatorOperators = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const q = req.query.q ? String(req.query.q).trim() : null;
      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "50")),
      );
      const filter = { createdByDonator: req.user._id };
      if (q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: re }, { username: re }];
      }
      const [total, list] = await Promise.all([
        OperatorModel.countDocuments(filter),
        OperatorModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select("name username credits operatorSlots isActive createdAt")
          .lean(),
      ]);
      return res
        .status(200)
        .json({ success: true, data: list, meta: { total, page, limit } });
    } catch (err) {
      console.error("GetDonatorOperators error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Donator: Get detailed information about a specific operator
   * GET /donator/me/operators/:operatorId
   */
  static GetOperatorDetails = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const operatorId = req.params.operatorId;

      // Find operator and verify ownership
      const operator = await OperatorModel.findOne({
        _id: operatorId,
        createdByDonator: req.user._id,
      }).select("-password -token");

      if (!operator)
        return res.status(404).json({
          success: false,
          message: "Operator not found or not owned by you",
        });

      // Get all employees created by this operator
      const employees = await UserModel.find({
        createdByOperator: operatorId,
      })
        .select(
          "username freeUsername tgid email firstname lastname usertype membertype startdate enddate paymentstatus createdAt",
        )
        .sort({ createdAt: -1 })
        .lean();

      // Get all purchases assigned to this operator
      const purchases = await DonatorPurchaseModel.find({
        operator: operatorId,
      })
        .populate("package")
        .sort({ createdAt: -1 })
        .lean();

      // Get audit logs for this operator
      const auditLogs = await DonatorAuditModel.find({
        $or: [
          { actorType: "operator", actorId: operatorId },
          { entityType: "Operator", entityId: operatorId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Calculate statistics
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(
        (e) => e.paymentstatus === 1,
      ).length;
      const totalCreditsGranted = purchases
        .filter((p) => p.status === 1)
        .reduce((sum, p) => sum + (p.creditsGrantedEmployee || 0), 0);
      const creditsUsed = totalEmployees;
      const creditsLeft = operator.credits;

      return res.status(200).json({
        success: true,
        data: {
          operator,
          employees,
          statistics: {
            totalEmployees,
            activeEmployees,
            totalCreditsGranted,
            creditsUsed,
            creditsLeft,
          },
          purchases: purchases.map((p) => ({
            _id: p._id,
            packageName: p.package ? p.package.name : null,
            creditsGranted: p.creditsGrantedEmployee,
            status: p.status,
            createdAt: p.createdAt,
            approvedAt: p.approvedAt,
          })),
          auditLogs,
        },
      });
    } catch (err) {
      console.error("GetOperatorDetails error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  /**
   * Donator: Delete an operator
   * DELETE /donator/me/operators/:operatorId
   */
  static DeleteOperator = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const operatorId = req.params.operatorId;

      // Find operator and verify ownership
      const operator = await OperatorModel.findOne({
        _id: operatorId,
        createdByDonator: req.user._id,
      });

      if (!operator)
        return res.status(404).json({
          success: false,
          message: "Operator not found or not owned by you",
        });

      // Check if operator has any employees
      const employeeCount = await UserModel.countDocuments({
        createdByOperator: operatorId,
      });

      if (employeeCount > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete operator with ${employeeCount} existing employees. Please contact support.`,
        });
      }

      // Delete the operator
      await OperatorModel.findByIdAndDelete(operatorId);

      // Create audit log
      await DonatorAuditModel.create({
        actorType: "donator",
        actorId: req.user._id,
        action: "operator.delete",
        details: {
          operatorId: operator._id,
          tgid: operator.tgid,
          name: operator.name,
        },
        entityType: "Operator",
        entityId: operator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Operator deleted successfully",
      });
    } catch (err) {
      console.error("DeleteOperator error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  /**
   * Donator: Buy package (credits added to donator account)
   * POST /donator/me/buy
   */
  static DonatorBuyPackage = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { packageId, transactionId, walletAddress } = req.body;
      const validator = new Validator(
        { packageId, transactionId },
        {
          packageId: "required",
          transactionId: "required|string",
        },
      );
      if (!(await validator.check()))
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });

      const package_ = await DonatorPackageModel.findById(packageId);
      if (!package_)
        return res
          .status(404)
          .json({ success: false, message: "Package not found" });

      const existing = await DonatorPurchaseModel.findOne({ transactionId });
      if (existing)
        return res
          .status(422)
          .json({ success: false, message: "Transaction already exists" });

      const purchase = new DonatorPurchaseModel({
        donator: req.user._id,
        package: packageId,
        amount: package_.price,
        currency: package_.currency,
        transactionId,
        walletAddress: walletAddress ? walletAddress.trim() : null,
        paymentMethod: "USDT",
        status: 0,
      });
      const saved = await purchase.save();

      await DonatorAuditModel.create({
        actorType: "donator",
        actorId: req.user._id,
        action: "purchase.create",
        details: { packageId, transactionId, walletAddress },
        entityType: "DonatorPurchase",
        entityId: saved._id,
      });

      return res.status(200).json({
        success: true,
        message: "Purchase created. Awaiting admin approval.",
        data: {
          purchaseId: saved._id,
          status: saved.status,
          amount: saved.amount,
          walletAddress: saved.walletAddress,
        },
      });
    } catch (err) {
      console.error("DonatorBuyPackage error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Donator: Get purchase history
   * GET /donator/purchases
   */
  static GetDonatorPurchases = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "20")),
      );
      const status = req.query.status ? parseInt(req.query.status) : null;

      const filter = { donator: req.user._id };
      if (status !== null && !isNaN(status)) {
        filter.status = status;
      }

      const [total, purchases] = await Promise.all([
        DonatorPurchaseModel.countDocuments(filter),
        DonatorPurchaseModel.find(filter)
          .populate("package")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      const mapped = purchases.map((p) => ({
        _id: p._id,
        packageName: p.package ? p.package.name : null,
        amount: p.amount,
        currency: p.currency,
        transactionId: p.transactionId,
        walletAddress: p.walletAddress,
        creditsGrantedEmployee: p.creditsGrantedEmployee || 0,
        creditsGrantedOperator: p.creditsGrantedOperator || 0,
        status: p.status,
        statusLabel:
          p.status === 0
            ? "Pending"
            : p.status === 1
              ? "Approved"
              : p.status === 2
                ? "Rejected"
                : "Cancelled",
        createdAt: p.createdAt,
        approvedAt: p.approvedAt,
      }));

      return res.status(200).json({
        success: true,
        data: mapped,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("GetDonatorPurchases error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Donator: Assign employee credits to an operator
   * POST /donator/assign-credits
   */
  static AssignCreditsToOperator = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { operatorId, employeeCreditsToAssign } = req.body;
      const validator = new Validator(
        { operatorId, employeeCreditsToAssign },
        {
          operatorId: "required",
          employeeCreditsToAssign: "required|integer|min:1",
        },
      );
      if (!(await validator.check()))
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });

      const operator = await OperatorModel.findById(operatorId);
      if (!operator)
        return res
          .status(404)
          .json({ success: false, message: "Operator not found" });
      if (String(operator.createdByDonator) !== String(req.user._id))
        return res
          .status(403)
          .json({ success: false, message: "Operator does not belong to you" });

      const donator = await UserModel.findById(req.user._id);
      if (!donator || (donator.credits || 0) < employeeCreditsToAssign)
        return res.status(422).json({
          success: false,
          message: "Insufficient employee credits",
          availableEmployeeCredits: donator ? donator.credits || 0 : 0,
        });

      // Deduct employee credits from donator, add to operator
      const [updatedDonator, updatedOperator] = await Promise.all([
        UserModel.findByIdAndUpdate(
          req.user._id,
          { $inc: { credits: -employeeCreditsToAssign } },
          { new: true },
        ),
        OperatorModel.findByIdAndUpdate(
          operatorId,
          { $inc: { credits: employeeCreditsToAssign } },
          { new: true },
        ),
      ]);

      await DonatorAuditModel.create({
        actorType: "donator",
        actorId: req.user._id,
        action: "credits.assign",
        details: {
          operatorId,
          employeeCreditsAssigned: employeeCreditsToAssign,
          donatorPreviousBalance:
            (updatedDonator.credits || 0) + employeeCreditsToAssign,
          donatorNewBalance: updatedDonator.credits || 0,
          operatorPreviousBalance:
            (updatedOperator.credits || 0) - employeeCreditsToAssign,
          operatorNewBalance: updatedOperator.credits || 0,
        },
        entityType: "Operator",
        entityId: operatorId,
      });

      return res.status(200).json({
        success: true,
        message: `${employeeCreditsToAssign} employee credits assigned to operator successfully.`,
        data: {
          donatorEmployeeCredits: updatedDonator.credits || 0,
          operatorEmployeeCredits: updatedOperator.credits || 0,
        },
      });
    } catch (err) {
      console.error("AssignCreditsToOperator error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Donator: list employees created by your operators (audit-backed)
   * GET /donator/me/employees
   */
  static GetDonatorEmployees = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const q = req.query.q ? String(req.query.q).trim() : null;
      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "50")),
      );

      // find operators owned by this donator
      const ops = await OperatorModel.find({ createdByDonator: req.user._id })
        .select("_id")
        .lean();
      const opIds = ops.map((o) => o._id);

      if (!opIds.length)
        return res
          .status(200)
          .json({ success: true, data: [], meta: { total: 0, page, limit } });

      // Find audit records for employee.create by these operators
      const audits = await DonatorAuditModel.find({
        actorType: "operator",
        action: "employee.create",
        actorId: { $in: opIds },
      }).sort({ createdAt: -1 });
      const userIds = audits.map((a) => a.entityId).filter(Boolean);

      // De-dupe and paginate
      const uniqueUserIds = Array.from(new Set(userIds.map(String))).map((s) =>
        require("mongoose").Types.ObjectId(s),
      );
      const total = uniqueUserIds.length;
      const pageSlice = uniqueUserIds.slice((page - 1) * limit, page * limit);

      const userFilter = { _id: { $in: pageSlice } };
      if (q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i");
        userFilter.$or = [
          { username: re },
          { tgid: re },
          { email: re },
          { firstname: re },
          { lastname: re },
        ];
      }

      const users = await UserModel.find(userFilter)
        .select(
          "username tgid email firstname lastname startdate enddate membertype usertype",
        )
        .lean();

      return res
        .status(200)
        .json({ success: true, data: users, meta: { total, page, limit } });
    } catch (err) {
      console.error("GetDonatorEmployees error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

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

      // Get donator and add credits to donator account
      const donatorId = purchase.donator;
      const updatedDonator = await UserModel.findByIdAndUpdate(
        donatorId,
        {
          $inc: { credits: employeeCreditsToAdd },
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
          donatorId,
          creditsAdded: employeeCreditsToAdd,
          previousBalance: (updatedDonator.credits || 0) - employeeCreditsToAdd,
          newBalance: updatedDonator.credits || 0,
        },
        entityType: "DonatorPurchase",
        entityId: purchase._id,
      });

      return res.status(200).json({
        success: true,
        message: `Purchase approved. ${employeeCreditsToAdd} credits added to donator account.`,
        data: {
          donatorCredits: updatedDonator.credits || 0,
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
        // link to the operator who created this employee
        createdByOperator: req.operator?._id || null,
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
