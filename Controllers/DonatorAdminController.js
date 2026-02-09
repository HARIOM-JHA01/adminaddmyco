import { baseUrl, view } from "../Config.js";
import DonatorPackageModel from "../Models/DonatorPackage.js";
import DonatorPurchaseModel from "../Models/DonatorPurchase.js";
import OperatorModel from "../Models/Operator.js";
import DonatorController from "./DonatorController.js";
import moment from "moment";

class DonatorAdminController {
  /**
   * Admin: Render packages list page
   * GET /admin/donator/packages
   */
  static PackageList = async (req, res) => {
    try {
      const packages = await DonatorPackageModel.find().sort({
        createdAt: -1,
      });

      res.render("Donator/PackageList", {
        baseUrl,
        packages,
        path: "donator-packages",
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
   * GET /admin/donator/package/create or GET /admin/donator/package/edit/:id
   */
  static PackageForm = async (req, res) => {
    try {
      let package_ = null;
      let isEdit = false;

      if (req.params.id) {
        package_ = await DonatorPackageModel.findById(req.params.id);
        if (!package_) {
          return res.status(404).render("Error", {
            baseUrl,
            error: "Package not found",
          });
        }
        isEdit = true;
      }

      res.render("Donator/PackageCreate", {
        baseUrl,
        package: package_ || {},
        isEdit,
        path: "donator-packages",
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
   * GET /admin/donator/purchases
   */
  static PurchaseList = async (req, res) => {
    try {
      const purchases = await DonatorPurchaseModel.find()
        .populate("operator", "name email credits operatorSlots")
        .populate("package", "name employeeCredits operatorCredits price")
        .sort({ createdAt: -1 });

      res.render("Donator/PurchaseList", {
        baseUrl,
        purchases,
        path: "donator-purchases",
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
   * GET /admin/donator/operators
   */
  static OperatorList = async (req, res) => {
    try {
      const operators = await OperatorModel.find().sort({ createdAt: -1 });

      res.render("Donator/OperatorList", {
        baseUrl,
        operators,
        path: "donator-operators",
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
   * GET /admin/donator/operator/create
   */
  static OperatorForm = async (req, res) => {
    try {
      res.render("Donator/OperatorCreate", {
        baseUrl,
        path: "donator-operators",
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
   * POST /admin/donator/operator/deactivate/:id
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
   * POST /admin/donator/operator/activate/:id
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
   * POST /admin/donator/operator/add-credits/:id
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
}

export default DonatorAdminController;
