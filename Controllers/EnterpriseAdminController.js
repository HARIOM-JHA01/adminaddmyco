import { baseUrl, view } from "../Config.js";
import EnterprisePackageModel from "../Models/EnterprisePackage.js";
import EnterprisePurchaseModel from "../Models/EnterprisePurchase.js";
import OperatorModel from "../Models/Operator.js";
import EnterpriseController from "./EnterpriseController.js";
import moment from "moment";

class EnterpriseAdminController {
  /**
   * Admin: Render packages list page
   * GET /admin/enterprise/packages
   */
  static PackageList = async (req, res) => {
    try {
      const packages = await EnterprisePackageModel.find().sort({
        createdAt: -1,
      });

      res.render("Enterprise/PackageList", {
        baseUrl,
        packages,
        path: "enterprise-packages",
        moment,
      });
    } catch (error) {
      console.error("PackageList error:", error);
      res.status(500).render("Error", {
        baseUrl,
        error: error.message,
      });
    }
  };

  /**
   * Admin: Render create/edit package page
   * GET /admin/enterprise/package/create or GET /admin/enterprise/package/edit/:id
   */
  static PackageForm = async (req, res) => {
    try {
      let package_ = null;
      let isEdit = false;

      if (req.params.id) {
        package_ = await EnterprisePackageModel.findById(req.params.id);
        if (!package_) {
          return res.status(404).render("Error", {
            baseUrl,
            error: "Package not found",
          });
        }
        isEdit = true;
      }

      res.render("Enterprise/PackageCreate", {
        baseUrl,
        package: package_ || {},
        isEdit,
        path: "enterprise-packages",
        moment,
      });
    } catch (error) {
      console.error("PackageForm error:", error);
      res.status(500).render("Error", {
        baseUrl,
        error: error.message,
      });
    }
  };

  /**
   * Admin: Render purchases list page
   * GET /admin/enterprise/purchases
   */
  static PurchaseList = async (req, res) => {
    try {
      const purchases = await EnterprisePurchaseModel.find()
        .populate("operator", "name email credits")
        .populate("package", "name employeeCredits operatorCredits price")
        .sort({ createdAt: -1 });

      res.render("Enterprise/PurchaseList", {
        baseUrl,
        purchases,
        path: "enterprise-purchases",
        moment,
      });
    } catch (error) {
      console.error("PurchaseList error:", error);
      res.status(500).render("Error", {
        baseUrl,
        error: error.message,
      });
    }
  };

  /**
   * Admin: Render operators list page
   * GET /admin/enterprise/operators
   */
  static OperatorList = async (req, res) => {
    try {
      const operators = await OperatorModel.find().sort({ createdAt: -1 });

      res.render("Enterprise/OperatorList", {
        baseUrl,
        operators,
        path: "enterprise-operators",
        moment,
      });
    } catch (error) {
      console.error("OperatorList error:", error);
      res.status(500).render("Error", {
        baseUrl,
        error: error.message,
      });
    }
  };

  /**
   * Admin: Render create operator form
   * GET /admin/enterprise/operator/create
   */
  static OperatorForm = async (req, res) => {
    try {
      res.render("Enterprise/OperatorCreate", {
        baseUrl,
        path: "enterprise-operators",
      });
    } catch (error) {
      console.error("OperatorForm error:", error);
      res.status(500).render("Error", {
        baseUrl,
        error: error.message,
      });
    }
  };

  /**
   * Admin: Deactivate operator
   * POST /admin/enterprise/operator/deactivate/:id
   */
  static DeactivateOperator = async (req, res) => {
    try {
      const operator = await OperatorModel.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true },
      );

      if (!operator) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Operator deactivated",
      });
    } catch (error) {
      console.error("DeactivateOperator error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Activate operator
   * POST /admin/enterprise/operator/activate/:id
   */
  static ActivateOperator = async (req, res) => {
    try {
      const operator = await OperatorModel.findByIdAndUpdate(
        req.params.id,
        { isActive: true },
        { new: true },
      );

      if (!operator) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Operator activated",
      });
    } catch (error) {
      console.error("ActivateOperator error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Add manual credits to operator
   * POST /admin/enterprise/operator/add-credits/:id
   */
  static AddCredits = async (req, res) => {
    try {
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(422).json({
          success: false,
          message: "Invalid amount",
        });
      }

      const operator = await OperatorModel.findByIdAndUpdate(
        req.params.id,
        { $inc: { credits: amount } },
        { new: true },
      );

      if (!operator) {
        return res.status(404).json({
          success: false,
          message: "Operator not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: `${amount} credits added`,
        data: { credits: operator.credits },
      });
    } catch (error) {
      console.error("AddCredits error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Admin: Get operator details (for admin modal)
   * GET /admin/enterprise/operator/detail/:id
   */
  static OperatorDetail = async (req, res) => {
    try {
      const operator = await OperatorModel.findById(req.params.id)
        .select("-password -token")
        .lean();
      if (!operator) {
        return res
          .status(404)
          .json({ success: false, message: "Operator not found" });
      }
      const UserModel = (await import("../Models/User.js")).default;
      const employeeCount = await UserModel.countDocuments({
        createdByOperator: operator._id,
        usertype: 1,
      });
      return res
        .status(200)
        .json({ success: true, data: { ...operator, employeeCount } });
    } catch (err) {
      console.error("OperatorDetail error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Admin: Delete operator (prevent if it has employees)
   * POST /admin/enterprise/operator/delete/:id
   */
  static DeleteOperator = async (req, res) => {
    try {
      const operator = await OperatorModel.findById(req.params.id);
      if (!operator) {
        return res
          .status(404)
          .json({ success: false, message: "Operator not found" });
      }
      const UserModel = (await import("../Models/User.js")).default;
      const employeeCount = await UserModel.countDocuments({
        createdByOperator: operator._id,
      });
      if (employeeCount > 0) {
        return res
          .status(409)
          .json({
            success: false,
            message: `Cannot delete operator with ${employeeCount} existing employees.`,
          });
      }
      await OperatorModel.findByIdAndDelete(operator._id);
      return res
        .status(200)
        .json({ success: true, message: "Operator deleted successfully" });
    } catch (err) {
      console.error("DeleteOperator (admin) error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Admin: Get employee details
   * GET /admin/enterprise/employee/detail/:id
   */
  static EmployeeDetail = async (req, res) => {
    try {
      const UserModel = (await import("../Models/User.js")).default;
      const user = await UserModel.findById(req.params.id).lean();
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      return res.status(200).json({ success: true, data: user });
    } catch (err) {
      console.error("EmployeeDetail error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  /**
   * Admin: Delete employee
   * POST /admin/enterprise/employee/delete/:id
   */
  static DeleteEmployee = async (req, res) => {
    try {
      const UserModel = (await import("../Models/User.js")).default;
      const user = await UserModel.findById(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      if (user.usertype !== 1) {
        return res
          .status(422)
          .json({ success: false, message: "Not an employee record" });
      }
      await UserModel.findByIdAndDelete(user._id);
      return res
        .status(200)
        .json({ success: true, message: "Employee deleted successfully" });
    } catch (err) {
      console.error("DeleteEmployee error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
}

export default EnterpriseAdminController;
