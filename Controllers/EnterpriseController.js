import express from "express";
import { Validator } from "node-input-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import moment from "moment";
import { validatorError } from "../Common.js";
import { baseUrl } from "../Config.js";

import EnterprisePackageModel from "../Models/EnterprisePackage.js";
import EnterprisePurchaseModel from "../Models/EnterprisePurchase.js";
import OperatorModel from "../Models/Operator.js";
import EnterpriseAuditModel from "../Models/EnterpriseAudit.js";
import UserModel from "../Models/User.js";
import EmployeeNamecardModel from "../Models/EmployeeNamecard.js";

const accessTokenSecret = process.env.JWT_SECRET_KEY;
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;

class EnterpriseController {
  // Utility to generate random username
  static generateUsername() {
    return crypto.randomBytes(4).toString("hex");
  }

  // ======================== OPERATOR MANAGEMENT ========================

  /**
   * Admin: Create new operator
   * POST /admin/enterprise/operator/create
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
        createdByAdmin: req.user._id,
      });

      const savedOperator = await operator.save();

      // Audit log
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "operator.create",
        details: {
          username: savedOperator.username,
          name: savedOperator.name,
          credits: savedOperator.credits,
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
   * Enterprise (owner) aggregated summary
   * GET /enterprise/me/summary
   */
  static GetEnterpriseSummary = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const profile = await UserModel.findById(req.user._id).select(
        "-password",
      );

      // Operators created by this enterprise
      const operators = await OperatorModel.find({
        createdByEnterprise: req.user._id,
      }).select("name email credits isActive createdAt");

      const opIds = operators.map((o) => o._id);

      // Purchases: both direct purchases by enterprise AND purchases assigned to operators
      const purchases = await EnterprisePurchaseModel.find({
        $or: [
          { enterprise: req.user._id }, // Direct purchases by this enterprise
          { operator: { $in: opIds } }, // Purchases assigned to operators created by this enterprise
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

      // Employee namecards created by this enterprise or its operators
      const employeeNamecards = await EmployeeNamecardModel.find({
        $or: [
          { createdByUser: req.user._id }, // Created directly by enterprise
          { createdByOperator: { $in: opIds } }, // Created by enterprise's operators
        ],
        status: { $ne: 2 }, // Exclude deleted (status 2)
      })
        .select(
          "_id name_english name_chinese telegram_username profile_image createdByUser createdByOperator createdAt",
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Calculate used and left credits
      const usedCreditsOperator = operators.length; // Each operator costs 1 credit
      // Employee credits are consumed when used directly OR assigned to operators.
      // Current enterprise balance already reflects both operations.
      const enterpriseEmployeeCreditsBalance = profile?.credits || 0;
      const usedCreditsEmployee = Math.max(
        0,
        totalCreditsEmployee - enterpriseEmployeeCreditsBalance,
      );
      const leftCreditsOperator = totalCreditsOperator - usedCreditsOperator;
      const leftCreditsEmployee = enterpriseEmployeeCreditsBalance;

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
            totalEmployeesCreated: employeeNamecards.length,
            recentEmployees: employeeNamecards.map((e) => ({
              _id: e._id,
              name_english: e.name_english,
              name_chinese: e.name_chinese,
              telegram_username: e.telegram_username,
              profile_image: e.profile_image,
              createdAt: e.createdAt,
            })),
          },
        },
      });
    } catch (err) {
      console.error("GetEnterpriseSummary error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  };

  /**
   * Operator: Register/Sign up
   * POST /enterprise/operator/register
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
      await EnterpriseAuditModel.create({
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
   * POST /enterprise/operator/login
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
      await EnterpriseAuditModel.create({
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
   * GET /enterprise/operator/profile
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
   * GET /enterprise/operator/credits
   */
  static GetOperatorCredits = async (req, res) => {
    try {
      const operator = await OperatorModel.findById(req.operator._id).select(
        "credits",
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
   * GET /enterprise/operator/operators
   */
  static GetOperatorsList = async (req, res) => {
    try {
      const operators = await OperatorModel.find({
        createdByAdmin: req.operator._id,
      }).select("name email credits isActive createdAt");

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
   * GET /enterprise/operator/users
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

      // Alternative: Get users from EnterprisePurchase records
      const purchases = await EnterprisePurchaseModel.find({
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
   * GET /enterprise/operator/summary
   */
  static GetOperatorSummary = async (req, res) => {
    try {
      const profile = await OperatorModel.findById(req.operator._id).select(
        "-password",
      );

      const operators = await OperatorModel.find({
        createdByAdmin: req.operator._id,
      }).select("name email credits isActive createdAt");

      const purchases = await EnterprisePurchaseModel.find({
        operator: req.operator._id,
      })
        .populate("package")
        .sort({ createdAt: -1 })
        .limit(50);

      const approved = purchases.filter((p) => p.status === 1);
      const creditsGranted = approved.reduce(
        (sum, p) => sum + (p.creditsGrantedEmployee || 0),
        0,
      );

      // Count actual employee namecards created by this operator
      const employeeNamecards = await EmployeeNamecardModel.find({
        createdByOperator: req.operator._id,
        status: { $ne: 2 }, // Exclude deleted (status 2)
      })
        .select(
          "_id name_english name_chinese telegram_username profile_image createdAt",
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const creditsUsed = employeeNamecards.length; // Each employee costs 1 credit
      const creditsRemaining = (profile.credits || 0) - creditsUsed;

      return res.status(200).json({
        success: true,
        data: {
          profile,
          credits: {
            total: profile.credits,
            creditsUsed,
            creditsRemaining,
          },
          operators,
          employeesSummary: {
            totalEmployeesCreated: employeeNamecards.length,
            recentEmployees: employeeNamecards.map((e) => ({
              _id: e._id,
              name_english: e.name_english,
              name_chinese: e.name_chinese,
              telegram_username: e.telegram_username,
              profile_image: e.profile_image,
              createdAt: e.createdAt,
            })),
          },
          purchasesSummary: {
            total: purchases.length,
            approved: approved.length,
            creditsGranted,
            creditsUsed,
            creditsRemaining,
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

  // ======================== ENTERPRISE (owner) - endpoints ========================
  /**
   * Enterprise (usertype=2): create operator under your account
   * POST /enterprise/me/operators
   */
  static CreateOperatorByEnterprise = async (req, res) => {
    try {
      // Allow Enterprise (usertype=2) or Donator (usertype=3) to create an operator
      if (!req.user || !(req.user.usertype === 2 || req.user.usertype === 3))
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

      // If creator is a donator, ensure they have >=1 credit and atomically deduct
      if (req.user.usertype === 3) {
        const donator = await UserModel.findByIdAndUpdate(
          req.user._id,
          { $inc: { credits: -1 } },
          { new: true },
        );
        if ((donator.credits || 0) < 0) {
          // Revert and abort
          await UserModel.findByIdAndUpdate(req.user._id, {
            $inc: { credits: 1 },
          });
          return res
            .status(409)
            .json({ success: false, message: "Insufficient credits" });
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Build operator payload; set ownership based on creator type
      const opData = {
        tgid: tgidClean,
        telegramId: tgidClean,
        username: tgidClean,
        name: tgidClean, // Use tgid as name
        password: hashedPassword,
        isActive: true,
        credits: 0,
      };
      if (req.user.usertype === 2) opData.createdByEnterprise = req.user._id;
      if (req.user.usertype === 3) opData.createdByDonator = req.user._id;

      const op = new OperatorModel(opData);
      const saved = await op.save();

      await EnterpriseAuditModel.create({
        actorType: req.user.usertype === 3 ? "donator" : "enterprise",
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
          isActive: saved.isActive,
          createdAt: saved.createdAt,
        },
      });
    } catch (err) {
      console.error("CreateOperatorByEnterprise error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

  /**
   * Enterprise: list operators you created
   * GET /enterprise/me/operators
   */
  static GetEnterpriseOperators = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const q = req.query.q ? String(req.query.q).trim() : null;
      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "50")),
      );
      const filter = { createdByEnterprise: req.user._id };
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
          .select("name username credits isActive createdAt")
          .lean(),
      ]);
      return res
        .status(200)
        .json({ success: true, data: list, meta: { total, page, limit } });
    } catch (err) {
      console.error("GetEnterpriseOperators error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Enterprise: Get detailed information about a specific operator
   * GET /enterprise/me/operators/:operatorId
   */
  static GetOperatorDetails = async (req, res) => {
    try {
      const operatorId = req.params.operatorId;

      // Support both operator viewing their own details and enterprise viewing operator details
      let operator = null;
      let isOwner = false;

      // Check if requester is an operator viewing their own details
      if (req.operator) {
        if (req.operator._id.toString() === operatorId) {
          operator =
            await OperatorModel.findById(operatorId).select("-password -token");
          isOwner = true;
        } else {
          return res.status(403).json({
            success: false,
            message: "You can only view your own operator details",
          });
        }
      }
      // Check if requester is an enterprise viewing their operator
      else if (req.user && req.user.usertype === 2) {
        operator = await OperatorModel.findOne({
          _id: operatorId,
          createdByEnterprise: req.user._id,
        }).select("-password -token");
        isOwner = true;
      }
      // No valid authentication
      else {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!operator) {
        return res.status(404).json({
          success: false,
          message:
            "Operator not found or you do not have permission to view it",
        });
      }

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
      const purchases = await EnterprisePurchaseModel.find({
        operator: operatorId,
      })
        .populate("package")
        .sort({ createdAt: -1 })
        .lean();

      // Get audit logs for this operator
      const auditLogs = await EnterpriseAuditModel.find({
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
   * Enterprise: Delete an operator
   * DELETE /enterprise/me/operators/:operatorId
   */
  static DeleteOperator = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const operatorId = req.params.operatorId;

      // Find operator and verify ownership
      const operator = await OperatorModel.findOne({
        _id: operatorId,
        createdByEnterprise: req.user._id,
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
      await EnterpriseAuditModel.create({
        actorType: "enterprise",
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
   * Enterprise: Reset operator password (enterprise owner)
   * POST /enterprise/me/operators/:operatorId/reset-password
   * Body: { password, confirmPassword }
   */
  static ResetOperatorPasswordByEnterprise = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const { password, confirmPassword } = req.body;
      const validator = new Validator(
        { password, confirmPassword },
        {
          password: "required|minLength:6",
          confirmPassword: "required|same:password",
        },
      );
      if (!(await validator.check()))
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });

      const operatorId = req.params.operatorId;
      const operator = await OperatorModel.findOne({
        _id: operatorId,
        createdByEnterprise: req.user._id,
      });
      if (!operator)
        return res.status(404).json({
          success: false,
          message: "Operator not found or not owned by you",
        });

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      // Update password and clear token to force re-login
      await OperatorModel.findByIdAndUpdate(operatorId, {
        password: hashed,
        token: null,
      });

      await EnterpriseAuditModel.create({
        actorType: "enterprise",
        actorId: req.user._id,
        action: "operator.password.reset",
        details: { operatorId: operator._id, username: operator.username },
        entityType: "Operator",
        entityId: operator._id,
      });

      return res.status(200).json({
        success: true,
        message: "Operator password reset successfully",
      });
    } catch (err) {
      console.error("ResetOperatorPasswordByEnterprise error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  };

  /**
   * Enterprise: Buy package (credits added to enterprise account)
   * POST /enterprise/me/buy
   */
  static EnterpriseBuyPackage = async (req, res) => {
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

      const package_ = await EnterprisePackageModel.findById(packageId);
      if (!package_)
        return res
          .status(404)
          .json({ success: false, message: "Package not found" });

      const existing = await EnterprisePurchaseModel.findOne({ transactionId });
      if (existing)
        return res
          .status(422)
          .json({ success: false, message: "Transaction already exists" });

      const purchase = new EnterprisePurchaseModel({
        enterprise: req.user._id,
        package: packageId,
        amount: package_.price,
        currency: package_.currency,
        transactionId,
        walletAddress: walletAddress ? walletAddress.trim() : null,
        paymentMethod: "USDT",
        status: 0,
      });
      const saved = await purchase.save();

      await EnterpriseAuditModel.create({
        actorType: "enterprise",
        actorId: req.user._id,
        action: "purchase.create",
        details: { packageId, transactionId, walletAddress },
        entityType: "EnterprisePurchase",
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
      console.error("EnterpriseBuyPackage error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Enterprise: Get purchase history
   * GET /enterprise/purchases
   */
  static GetEnterprisePurchases = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "20")),
      );
      const status = req.query.status ? parseInt(req.query.status) : null;

      const filter = { enterprise: req.user._id };
      if (status !== null && !isNaN(status)) {
        filter.status = status;
      }

      const [total, purchases] = await Promise.all([
        EnterprisePurchaseModel.countDocuments(filter),
        EnterprisePurchaseModel.find(filter)
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
      console.error("GetEnterprisePurchases error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Enterprise: Assign employee credits to an operator
   * POST /enterprise/assign-credits
   */
  static AssignCreditsToOperator = async (req, res) => {
    try {
      if (!req.user || !(req.user.usertype === 2 || req.user.usertype === 3))
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
      const isEnterpriseActor = req.user.usertype === 2;
      const isOwnedByActor = isEnterpriseActor
        ? String(operator.createdByEnterprise) === String(req.user._id)
        : String(operator.createdByDonator) === String(req.user._id);
      if (!isOwnedByActor)
        return res.status(403).json({
          success: false,
          message: "Operator does not belong to you",
        });

      const enterprise = await UserModel.findById(req.user._id);
      if (!enterprise || (enterprise.credits || 0) < employeeCreditsToAssign)
        return res.status(422).json({
          success: false,
          message: "Insufficient employee credits",
          availableEmployeeCredits: enterprise ? enterprise.credits || 0 : 0,
        });

      // Deduct employee credits from enterprise, add to operator
      const [updatedEnterprise, updatedOperator] = await Promise.all([
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

      await EnterpriseAuditModel.create({
        actorType: isEnterpriseActor ? "enterprise" : "donator",
        actorId: req.user._id,
        action: "credits.assign",
        details: {
          operatorId,
          employeeCreditsAssigned: employeeCreditsToAssign,
          enterprisePreviousBalance:
            (updatedEnterprise.credits || 0) + employeeCreditsToAssign,
          enterpriseNewBalance: updatedEnterprise.credits || 0,
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
          enterpriseEmployeeCredits: updatedEnterprise.credits || 0,
          operatorEmployeeCredits: updatedOperator.credits || 0,
        },
      });
    } catch (err) {
      console.error("AssignCreditsToOperator error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Enterprise: list employees created by your operators (audit-backed)
   * GET /enterprise/me/employees
   */
  static GetEnterpriseEmployees = async (req, res) => {
    try {
      if (!req.user || req.user.usertype !== 2)
        return res.status(403).json({ success: false, message: "Forbidden" });

      const q = req.query.q ? String(req.query.q).trim() : null;
      const page = Math.max(1, parseInt(req.query.page || "1"));
      const limit = Math.min(
        200,
        Math.max(1, parseInt(req.query.limit || "50")),
      );

      // find operators owned by this enterprise
      const ops = await OperatorModel.find({
        createdByEnterprise: req.user._id,
      })
        .select("_id")
        .lean();
      const opIds = ops.map((o) => o._id);

      if (!opIds.length)
        return res
          .status(200)
          .json({ success: true, data: [], meta: { total: 0, page, limit } });

      // Find audit records for employee.create by these operators
      const audits = await EnterpriseAuditModel.find({
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
      console.error("GetEnterpriseEmployees error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Admin: Create enterprise package
   * POST /admin/enterprise/package/create
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

      const package_ = new EnterprisePackageModel({
        name: name.trim(),
        employeeCredits: parseInt(employeeCredits),
        operatorCredits: parseInt(operatorCredits),
        price: parseFloat(price),
        status: status !== undefined ? parseInt(status) : 1,
      });

      const savedPackage = await package_.save();

      // Audit log
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.create",
        details: {
          name: savedPackage.name,
          employeeCredits: savedPackage.employeeCredits,
          operatorCredits: savedPackage.operatorCredits,
          price: savedPackage.price,
        },
        entityType: "EnterprisePackage",
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
   * Admin: Update enterprise package
   * POST /admin/enterprise/package/edit/:id
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

      const updatedPackage = await EnterprisePackageModel.findByIdAndUpdate(
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
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.update",
        details: updateData,
        entityType: "EnterprisePackage",
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
   * Admin: Delete enterprise package
   * DELETE /admin/enterprise/package/:id
   */
  static DeletePackage = async (req, res) => {
    try {
      const { id } = req.params;

      const deletedPackage = await EnterprisePackageModel.findByIdAndDelete(id);

      if (!deletedPackage) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Audit log
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "package.delete",
        details: {
          name: deletedPackage.name,
          employeeCredits: deletedPackage.employeeCredits,
          operatorCredits: deletedPackage.operatorCredits,
          price: deletedPackage.price,
        },
        entityType: "EnterprisePackage",
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
   * GET /enterprise/packages
   */
  static ListPackages = async (req, res) => {
    try {
      const packages = await EnterprisePackageModel.find({ status: 1 }).sort({
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
   * POST /enterprise/buy
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
      const package_ = await EnterprisePackageModel.findById(packageId);
      if (!package_) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check transaction ID uniqueness
      const existingPurchase = await EnterprisePurchaseModel.findOne({
        transactionId,
      });
      if (existingPurchase) {
        return res.status(422).json({
          success: false,
          message: "Transaction already exists",
        });
      }

      // Create purchase record (pending)
      const purchase = new EnterprisePurchaseModel({
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
      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "purchase.create",
        details: {
          packageId,
          amount: package_.price,
          transactionId,
        },
        entityType: "EnterprisePurchase",
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
   * POST /admin/enterprise/purchase/approve/:id
   */
  static ApprovePurchase = async (req, res) => {
    try {
      const { id } = req.params;

      const purchase =
        await EnterprisePurchaseModel.findById(id).populate("package");
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

      // Get enterprise and add credits to enterprise account
      const enterpriseId = purchase.enterprise;
      const updatedEnterprise = await UserModel.findByIdAndUpdate(
        enterpriseId,
        {
          $inc: { credits: employeeCreditsToAdd },
        },
        { new: true },
      );

      // Update purchase
      await EnterprisePurchaseModel.findByIdAndUpdate(id, {
        status: 1, // approved
        creditsGrantedEmployee: employeeCreditsToAdd,
        creditsGrantedOperator: operatorCreditsToAdd,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });

      // Audit log
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "purchase.approve",
        details: {
          enterpriseId,
          creditsAdded: employeeCreditsToAdd,
          previousBalance:
            (updatedEnterprise.credits || 0) - employeeCreditsToAdd,
          newBalance: updatedEnterprise.credits || 0,
        },
        entityType: "EnterprisePurchase",
        entityId: purchase._id,
      });

      return res.status(200).json({
        success: true,
        message: `Purchase approved. ${employeeCreditsToAdd} credits added to enterprise account.`,
        data: {
          enterpriseCredits: updatedEnterprise.credits || 0,
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
   * POST /admin/enterprise/purchase/reject/:id
   */
  static RejectPurchase = async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      const purchase = await EnterprisePurchaseModel.findById(id);
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

      await EnterprisePurchaseModel.findByIdAndUpdate(id, {
        status: 2, // rejected
        rejectionReason: rejectionReason || "No reason provided",
      });

      // Audit log
      await EnterpriseAuditModel.create({
        actorType: "admin",
        actorId: req.user._id,
        action: "purchase.reject",
        details: {
          reason: rejectionReason,
        },
        entityType: "EnterprisePurchase",
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
   * POST /enterprise/operator/create-employee
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

      // Case-insensitive check for existing tgid
      const _normEmpTgid = String(employeeTgid || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let existingUser = null;
      if (_normEmpTgid) {
        const _esc = _normEmpTgid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        existingUser = await UserModel.findOne({
          $or: [
            { tgid: new RegExp(`^${_esc}$`, "i") },
            { staffUserName: new RegExp(`^${_esc}$`, "i") },
          ],
        });
      }
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
      let generatedUsername = EnterpriseController.generateUsername();
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) {
          isUnique = true;
        } else {
          generatedUsername = EnterpriseController.generateUsername();
        }
      }

      // Set username to tgid with collision handling
      let activeUsername = employeeTgid;
      const usernameConflict = await UserModel.findOne({
        $or: [
          { username: employeeTgid },
          { staffUserName: employeeTgid },
        ],
      });
      if (usernameConflict) {
        activeUsername =
          employeeTgid + "-" + crypto.randomBytes(2).toString("hex");
      }

      // Calculate membership dates
      const package_ = await EnterprisePurchaseModel.findOne({
        operator: req.operator._id,
        status: 1,
      }).populate("package");

      const validityYears = 99;

      const startDate = moment().format("YYYY-MM-DD");
      const endDate = moment().add(validityYears, "years").format("YYYY-MM-DD");

      // Create employee user
      const employee = new UserModel({
        username: activeUsername,
        freeUsername: generatedUsername,
        staffUserName: activeUsername,
        tgid: employeeTgid,
        email: employeeEmail || null,
        firstname: employeeName || "Employee",
        usertype: 1, // Premium
        membertype: "premium",
        membershiperiod: validityYears * 12, // In months
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: 7, // Enterprise code
        country: "", // Can be updated later
        memberid: await EnterpriseController.generateMemberId(),
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
      await EnterpriseAuditModel.create({
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
   * Enterprise (owner): Create employee user account
   * POST /enterprise/me/employees (protected)
   */
  static CreateEmployeeByEnterprise = async (req, res) => {
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
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });
      }

      // Case-insensitive check for existing tgid
      const _normEmpTgid = String(employeeTgid || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let existingUser = null;
      if (_normEmpTgid) {
        const _esc = _normEmpTgid.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        existingUser = await UserModel.findOne({
          tgid: new RegExp(`^${_esc}$`, "i"),
        });
      }
      if (existingUser) {
        return res.status(422).json({
          success: false,
          message: "User with this Telegram ID already exists",
        });
      }

      // Determine creator (enterprise or donator) and atomically deduct 1 credit
      let creatorId = null;
      let actorType = null;

      if (req.enterprise && req.enterprise.usertype === 2) {
        creatorId = req.enterprise._id;
        actorType = "enterprise";
      } else if (req.user && req.user.usertype === 3) {
        creatorId = req.user._id;
        actorType = "donator";
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const creatorDoc = await UserModel.findByIdAndUpdate(
        creatorId,
        { $inc: { credits: -1 } },
        { new: true },
      );

      if ((creatorDoc.credits || 0) < 0) {
        // Revert the decrement
        await UserModel.findByIdAndUpdate(creatorId, {
          $inc: { credits: 1 },
        });

        return res
          .status(409)
          .json({ success: false, message: "Insufficient credits" });
      }

      // Generate freeUsername (unique random)
      let generatedUsername = EnterpriseController.generateUsername();
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) isUnique = true;
        else generatedUsername = EnterpriseController.generateUsername();
      }

      // Set username to tgid with collision handling
      let activeUsername = employeeTgid;
      const usernameConflict = await UserModel.findOne({
        $or: [
          { username: employeeTgid },
          { staffUserName: employeeTgid },
        ],
      });
      if (usernameConflict) {
        activeUsername =
          employeeTgid + "-" + crypto.randomBytes(2).toString("hex");
      }

      // Calculate membership dates (try to use an approved enterprise purchase if available)
      const package_ = req.enterprise
        ? await EnterprisePurchaseModel.findOne({
            enterprise: req.enterprise._id,
            status: 1,
          }).populate("package")
        : null;
      const validityYears = 99; // employee premium validity
      const startDate = moment().format("YYYY-MM-DD");
      const endDate = moment().add(validityYears, "years").format("YYYY-MM-DD");

      // Create employee user (created directly by enterprise)
      const employee = new UserModel({
        username: activeUsername,
        freeUsername: generatedUsername,
        staffUserName: activeUsername,
        tgid: employeeTgid,
        email: employeeEmail || null,
        firstname: employeeName || "Employee",
        usertype: 1, // Premium
        membertype: "premium",
        membershiperiod: validityYears * 12, // In months
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: 7, // Enterprise code
        country: "",
        memberid: await EnterpriseController.generateMemberId(),
        // Not created by an operator
        createdByOperator: null,
      });

      const savedEmployee = await employee.save();

      // Generate token for the new employee
      const payload = { id: savedEmployee._id, username: activeUsername };
      const token = jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: accessTokenLife,
      });
      await UserModel.findByIdAndUpdate(savedEmployee._id, { token });

      // Audit log (actor may be enterprise or donator)
      await EnterpriseAuditModel.create({
        actorType: actorType || "enterprise",
        actorId: creatorId || (req.enterprise && req.enterprise._id),
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
      console.error("CreateEmployeeByEnterprise error:", error);
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
    const id = "ENTERPRISE-" + (count + 1).toString().padStart(8, "0");
    return id;
  };

  // ======================== 3-STAGE CREATION PROCESS ========================

  /**
   * Stage 1: Initialize Employee with Telegram Username
   * POST /enterprise/operator/three-stage/employee/stage1
   * Body: { telegramUsername }
   */
  static EmployeeStage1 = async (req, res) => {
    try {
      const { telegramUsername } = req.body;

      const validator = new Validator(
        { telegramUsername },
        {
          telegramUsername: "required|string|minLength:3",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Case-insensitive check for telegram username
      const _normTg = String(telegramUsername || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let existingUser = null;
      if (_normTg) {
        const _esc = _normTg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        existingUser = await UserModel.findOne({
          $or: [
            { tgid: new RegExp(`^${_esc}$`, "i") },
            { staffUserName: new RegExp(`^${_esc}$`, "i") },
          ],
        });
      }
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Telegram username already registered",
        });
      }

      // Deduct one credit
      const operator = await OperatorModel.findByIdAndUpdate(
        req.operator._id,
        { $inc: { credits: -1 } },
        { new: true },
      );

      if (operator.credits < 0) {
        await OperatorModel.findByIdAndUpdate(req.operator._id, {
          $inc: { credits: 1 },
        });
        return res.status(409).json({
          success: false,
          message: "Insufficient credits",
        });
      }

      // Generate free username
      let generatedUsername = EnterpriseController.generateUsername();
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) {
          isUnique = true;
        } else {
          generatedUsername = EnterpriseController.generateUsername();
        }
      }

      // Set username to telegram ID with collision handling
      let activeUsername = telegramUsername;
      const usernameConflict = await UserModel.findOne({
        $or: [
          { username: telegramUsername },
          { staffUserName: telegramUsername },
        ],
      });
      if (usernameConflict) {
        activeUsername =
          telegramUsername + "-" + crypto.randomBytes(2).toString("hex");
      }

      const validityYears = 99;
      const startDate = moment().format("YYYY-MM-DD");
      const endDate = moment().add(validityYears, "years").format("YYYY-MM-DD");

      // Create employee at stage 1
      const employee = new UserModel({
        username: activeUsername,
        freeUsername: generatedUsername,
        staffUserName: activeUsername,
        tgid: telegramUsername,
        usertype: 1,
        membertype: "premium",
        membershiperiod: validityYears * 12,
        startdate: startDate,
        enddate: endDate,
        paymentstatus: 1,
        paymentBy: 7,
        memberid: await EnterpriseController.generateMemberId(),
        createdByOperator: req.operator._id,
        creationStage: 1, // Stage 1 complete
        date: new Date(),
      });

      const savedEmployee = await employee.save();

      // Log audit
      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "employee.stage1",
        details: {
          tgid: telegramUsername,
          username: activeUsername,
          freeUsername: generatedUsername,
        },
        entityType: "User",
        entityId: savedEmployee._id,
      });

      return res.status(201).json({
        success: true,
        message: "Stage 1 complete: Telegram username registered",
        data: {
          userId: savedEmployee._id,
          username: activeUsername,
          freeUsername: generatedUsername,
          tgid: telegramUsername,
          stage: 1,
          nextStage: "Profile Information",
        },
      });
    } catch (error) {
      console.error("EmployeeStage1 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 2: Update Employee Profile Information
   * PUT /enterprise/operator/three-stage/employee/:userId/stage2
   * Body: {
   *   owner_name_english, owner_name_chinese, contact, whatsapp,
   *   address1, address2, address3, email, instagram, linkedin,
   *   youtube, facebook, wechat, twitter, line, tiktok
   * }
   */
  static EmployeeStage2 = async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        owner_name_english,
        owner_name_chinese,
        contact,
        whatsapp,
        address1,
        address2,
        address3,
        email,
        instagram,
        linkedin,
        youtube,
        facebook,
        wechat,
        twitter,
        line,
        tiktok,
      } = req.body;

      const validator = new Validator(req.body, {
        owner_name_english: "required|string",
        owner_name_chinese: "required|string",
        contact: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Verify employee exists and belongs to this operator
      const employee = await UserModel.findById(userId);
      if (
        !employee ||
        employee.createdByOperator.toString() !== req.operator._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Update profile information
      const updatedEmployee = await UserModel.findByIdAndUpdate(
        userId,
        {
          owner_name_english,
          owner_name_chinese,
          contact,
          WhatsApp: whatsapp,
          address1,
          address2,
          address3,
          email,
          Instagram: instagram,
          Linkedin: linkedin,
          Youtube: youtube,
          Facebook: facebook,
          WeChat: wechat,
          Twitter: twitter,
          Line: line,
          TikTok: tiktok,
          creationStage: 2, // Stage 2 complete
          profilestatus: 1, // Mark profile as completed
        },
        { new: true },
      );

      // Log audit
      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "employee.stage2",
        details: {
          userId,
          name: owner_name_english,
          nameChina: owner_name_chinese,
        },
        entityType: "User",
        entityId: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 2 complete: Profile information saved",
        data: {
          userId: updatedEmployee._id,
          stage: 2,
          nextStage: "Company Information",
          profile: {
            nameEnglish: updatedEmployee.owner_name_english,
            nameChinese: updatedEmployee.owner_name_chinese,
            contact: updatedEmployee.contact,
          },
        },
      });
    } catch (error) {
      console.error("EmployeeStage2 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 3: Update Employee Company Information
   * PUT /enterprise/operator/three-stage/employee/:userId/stage3
   * Supports file uploads for videos
   * Body: {
   *   company_name_english, company_name_chinese, designation,
   *   description, website, telegram_link, facebook, instagram,
   *   youtube, display_order, videos (file uploads)
   * }
   */
  static EmployeeStage3 = async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        company_name_english,
        company_name_chinese,
        designation,
        description,
        website,
        telegram_link,
        facebook,
        instagram,
        youtube,
        display_order,
      } = req.body;

      const validator = new Validator(req.body, {
        company_name_english: "required|string",
        company_name_chinese: "required|string",
        designation: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Verify employee exists and belongs to this operator
      const employee = await UserModel.findById(userId);
      if (
        !employee ||
        employee.createdByOperator.toString() !== req.operator._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Update company information
      const updateData = {
        company_name_english,
        company_name_chinese,
        companydesignation: designation,
        description,
        website,
        telegramId: telegram_link,
        Facebook: facebook,
        Instagram: instagram,
        Youtube: youtube,
        company_order: display_order || 1,
        creationStage: 3, // Stage 3 complete
        companystatus: 1, // Mark company as completed
      };

      // Handle video uploads if present
      if (req.files && req.files.videos) {
        const videos = Array.isArray(req.files.videos)
          ? req.files.videos
          : [req.files.videos];
        updateData.videos = videos.map((v) => v.filename);
        if (videos.length > 0) {
          updateData.video = videos[0].filename;
        }
      }

      const updatedEmployee = await UserModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

      // Log audit
      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "employee.stage3",
        details: {
          userId,
          companyName: company_name_english,
          designation,
        },
        entityType: "User",
        entityId: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 3 complete: Employee account fully created",
        data: {
          userId: updatedEmployee._id,
          stage: 3,
          status: "Complete",
          company: {
            nameEnglish: updatedEmployee.company_name_english,
            nameChinese: updatedEmployee.company_name_chinese,
            designation: updatedEmployee.companydesignation,
          },
        },
      });
    } catch (error) {
      console.error("EmployeeStage3 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 1: Initialize Donator with Telegram Username
   * POST /enterprise/operator/three-stage/donator/stage1
   */
  static DonatorStage1 = async (req, res) => {
    try {
      const { telegramUsername } = req.body;

      const validator = new Validator(
        { telegramUsername },
        {
          telegramUsername: "required|string|minLength:3",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Case-insensitive check for telegram username
      const _normTg = String(telegramUsername || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let existingUser = null;
      if (_normTg) {
        const _esc = _normTg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        existingUser = await UserModel.findOne({
          $or: [
            { tgid: new RegExp(`^${_esc}$`, "i") },
            { staffUserName: new RegExp(`^${_esc}$`, "i") },
          ],
        });
      }
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Telegram username already registered",
        });
      }

      // Deduct one credit
      const operator = await OperatorModel.findByIdAndUpdate(
        req.operator._id,
        { $inc: { credits: -1 } },
        { new: true },
      );

      if (operator.credits < 0) {
        await OperatorModel.findByIdAndUpdate(req.operator._id, {
          $inc: { credits: 1 },
        });
        return res.status(409).json({
          success: false,
          message: "Insufficient credits",
        });
      }

      // Generate free username
      let generatedUsername = EnterpriseController.generateUsername();
      let isUnique = false;
      while (!isUnique) {
        const conflict = await UserModel.findOne({
          freeUsername: generatedUsername,
        });
        if (!conflict) {
          isUnique = true;
        } else {
          generatedUsername = EnterpriseController.generateUsername();
        }
      }

      let activeUsername = telegramUsername;
      const usernameConflict = await UserModel.findOne({
        username: telegramUsername,
      });
      if (usernameConflict) {
        activeUsername =
          telegramUsername + "-" + crypto.randomBytes(2).toString("hex");
      }

      // Create donator at stage 1
      const donator = new UserModel({
        username: activeUsername,
        freeUsername: generatedUsername,
        tgid: telegramUsername,
        usertype: 3, // Donator type
        createdByOperator: req.operator._id,
        creationStage: 1,
        date: new Date(),
      });

      const savedDonator = await donator.save();

      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "donator.stage1",
        details: {
          tgid: telegramUsername,
          username: activeUsername,
        },
        entityType: "User",
        entityId: savedDonator._id,
      });

      return res.status(201).json({
        success: true,
        message: "Stage 1 complete: Telegram username registered",
        data: {
          userId: savedDonator._id,
          username: activeUsername,
          freeUsername: generatedUsername,
          tgid: telegramUsername,
          stage: 1,
          type: "donator",
        },
      });
    } catch (error) {
      console.error("DonatorStage1 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 2: Update Donator Profile Information
   * PUT /enterprise/operator/three-stage/donator/:userId/stage2
   */
  static DonatorStage2 = async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        owner_name_english,
        owner_name_chinese,
        contact,
        whatsapp,
        address1,
        address2,
        address3,
        email,
        instagram,
        linkedin,
        youtube,
        facebook,
        wechat,
        twitter,
        line,
        tiktok,
      } = req.body;

      const validator = new Validator(req.body, {
        owner_name_english: "required|string",
        owner_name_chinese: "required|string",
        contact: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const donator = await UserModel.findById(userId);
      if (
        !donator ||
        donator.createdByOperator.toString() !== req.operator._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Donator not found",
        });
      }

      const updatedDonator = await UserModel.findByIdAndUpdate(
        userId,
        {
          owner_name_english,
          owner_name_chinese,
          contact,
          WhatsApp: whatsapp,
          address1,
          address2,
          address3,
          email,
          Instagram: instagram,
          Linkedin: linkedin,
          Youtube: youtube,
          Facebook: facebook,
          WeChat: wechat,
          Twitter: twitter,
          Line: line,
          TikTok: tiktok,
          creationStage: 2,
          profilestatus: 1,
        },
        { new: true },
      );

      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "donator.stage2",
        details: { userId, name: owner_name_english },
        entityType: "User",
        entityId: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 2 complete: Profile information saved",
        data: {
          userId: updatedDonator._id,
          stage: 2,
          type: "donator",
        },
      });
    } catch (error) {
      console.error("DonatorStage2 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 3: Update Donator Company Information
   * PUT /enterprise/operator/three-stage/donator/:userId/stage3
   */
  static DonatorStage3 = async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        company_name_english,
        company_name_chinese,
        designation,
        description,
        website,
        telegram_link,
        facebook,
        instagram,
        youtube,
        display_order,
      } = req.body;

      const validator = new Validator(req.body, {
        company_name_english: "required|string",
        company_name_chinese: "required|string",
        designation: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const donator = await UserModel.findById(userId);
      if (
        !donator ||
        donator.createdByOperator.toString() !== req.operator._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Donator not found",
        });
      }

      const updateData = {
        company_name_english,
        company_name_chinese,
        companydesignation: designation,
        description,
        website,
        telegramId: telegram_link,
        Facebook: facebook,
        Instagram: instagram,
        Youtube: youtube,
        company_order: display_order || 1,
        creationStage: 3,
        companystatus: 1,
      };

      if (req.files && req.files.videos) {
        const videos = Array.isArray(req.files.videos)
          ? req.files.videos
          : [req.files.videos];
        updateData.videos = videos.map((v) => v.filename);
        if (videos.length > 0) {
          updateData.video = videos[0].filename;
        }
      }

      const updatedDonator = await UserModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

      await EnterpriseAuditModel.create({
        actorType: "operator",
        actorId: req.operator._id,
        action: "donator.stage3",
        details: {
          userId,
          companyName: company_name_english,
        },
        entityType: "User",
        entityId: userId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 3 complete: Donator account fully created",
        data: {
          userId: updatedDonator._id,
          stage: 3,
          status: "Complete",
          type: "donator",
        },
      });
    } catch (error) {
      console.error("DonatorStage3 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 1: Initialize Operator with Telegram Username
   * POST /enterprise/me/three-stage/operator/stage1
   */
  static OperatorStage1 = async (req, res) => {
    try {
      const { telegramUsername } = req.body;

      const validator = new Validator(
        { telegramUsername },
        {
          telegramUsername: "required|string|minLength:3",
        },
      );

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      // Check if enterprise has operator credits
      const enterprise = await UserModel.findById(req.enterprise._id);
      if (!enterprise || (enterprise.credits || 0) < 1) {
        return res.status(422).json({
          success: false,
          message:
            "Insufficient operator credits. You need at least 1 credit to create an operator.",
          availableCredits: enterprise ? enterprise.credits || 0 : 0,
        });
      }

      // Case-insensitive check for operator tgid
      const _normOp = String(telegramUsername || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
      let existingOperator = null;
      if (_normOp) {
        const _escOp = _normOp.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        existingOperator = await OperatorModel.findOne({
          tgid: new RegExp(`^${_escOp}$`, "i"),
        });
      }
      if (existingOperator) {
        return res.status(409).json({
          success: false,
          message: "Telegram username already registered",
        });
      }

      let activeUsername = telegramUsername;
      const usernameConflict = await OperatorModel.findOne({
        username: telegramUsername,
      });
      if (usernameConflict) {
        activeUsername =
          telegramUsername + "-" + crypto.randomBytes(2).toString("hex");
      }

      // Create operator at stage 1
      const operator = new OperatorModel({
        username: activeUsername,
        tgid: telegramUsername,
        role: "operator",
        isActive: true,
        createdByEnterprise: req.enterprise._id,
        creationStage: 1,
      });

      const savedOperator = await operator.save();

      // Deduct 1 operator credit from enterprise
      const updatedEnterprise = await UserModel.findByIdAndUpdate(
        req.enterprise._id,
        { $inc: { credits: -1 } },
        { new: true },
      );

      await EnterpriseAuditModel.create({
        actorType: "enterprise",
        actorId: req.enterprise._id,
        action: "operator.stage1",
        details: {
          tgid: telegramUsername,
          username: activeUsername,
          creditDeducted: 1,
          enterpriseNewBalance: updatedEnterprise.credits || 0,
        },
        entityType: "Operator",
        entityId: savedOperator._id,
      });

      return res.status(201).json({
        success: true,
        message: "Stage 1 complete: Telegram username registered",
        data: {
          operatorId: savedOperator._id,
          username: activeUsername,
          tgid: telegramUsername,
          stage: 1,
          type: "operator",
          enterpriseCreditsRemaining: updatedEnterprise.credits || 0,
        },
      });
    } catch (error) {
      console.error("OperatorStage1 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 2: Update Operator Profile Information
   * PUT /enterprise/me/three-stage/operator/:operatorId/stage2
   */
  static OperatorStage2 = async (req, res) => {
    try {
      const { operatorId } = req.params;
      const {
        name,
        contact,
        whatsapp,
        address1,
        address2,
        address3,
        email,
        instagram,
        linkedin,
        youtube,
        facebook,
        wechat,
        twitter,
        line,
        tiktok,
      } = req.body;

      const validator = new Validator(req.body, {
        name: "required|string",
        contact: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const operator = await OperatorModel.findById(operatorId);
      if (
        !operator ||
        operator.createdByEnterprise.toString() !==
          req.enterprise._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      // Since OperatorModel doesn't have all profile fields, we store them as best as possible
      const updatedOperator = await OperatorModel.findByIdAndUpdate(
        operatorId,
        {
          name,
          creationStage: 2,
        },
        { new: true },
      );

      await EnterpriseAuditModel.create({
        actorType: "enterprise",
        actorId: req.enterprise._id,
        action: "operator.stage2",
        details: { operatorId, name },
        entityType: "Operator",
        entityId: operatorId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 2 complete: Profile information saved",
        data: {
          operatorId: updatedOperator._id,
          stage: 2,
          type: "operator",
        },
      });
    } catch (error) {
      console.error("OperatorStage2 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Stage 3: Update Operator Company Information
   * PUT /enterprise/me/three-stage/operator/:operatorId/stage3
   */
  static OperatorStage3 = async (req, res) => {
    try {
      const { operatorId } = req.params;
      const {
        company_name_english,
        company_name_chinese,
        designation,
        description,
        website,
        telegram_link,
        facebook,
        instagram,
        youtube,
        display_order,
      } = req.body;

      const validator = new Validator(req.body, {
        company_name_english: "required|string",
        company_name_chinese: "required|string",
        designation: "required|string",
      });

      if (!(await validator.check())) {
        return res.status(422).json({
          success: false,
          errors: validator.errors,
        });
      }

      const operator = await OperatorModel.findById(operatorId);
      if (
        !operator ||
        operator.createdByEnterprise.toString() !==
          req.enterprise._id.toString()
      ) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      const updateData = {
        creationStage: 3,
      };

      const updatedOperator = await OperatorModel.findByIdAndUpdate(
        operatorId,
        updateData,
        { new: true },
      );

      await EnterpriseAuditModel.create({
        actorType: "enterprise",
        actorId: req.enterprise._id,
        action: "operator.stage3",
        details: {
          operatorId,
          companyName: company_name_english,
        },
        entityType: "Operator",
        entityId: operatorId,
      });

      return res.status(200).json({
        success: true,
        message: "Stage 3 complete: Operator account fully created",
        data: {
          operatorId: updatedOperator._id,
          stage: 3,
          status: "Complete",
          type: "operator",
        },
      });
    } catch (error) {
      console.error("OperatorStage3 error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
}

export default EnterpriseController;
