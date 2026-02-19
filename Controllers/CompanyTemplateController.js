import { Validator } from "node-input-validator";
import mongoose from "mongoose";
import CompanyTemplateModel from "../Models/CompanyTemplate.js";
import { baseUrl } from "../Config.js";
import path from "path";
import fs from "fs";

/**
 * CompanyTemplateController
 *
 * Accessible by:
 *   - Operator  → req.operator is set  (owner_type = "operator")
 *   - Enterprise/Donator user → req.enterprise / req.user (usertype=2) (owner_type = "enterprise")
 *
 * Helper to resolve caller identity from request:
 */
function resolveOwner(req) {
  if (req.operator) {
    return { owner_id: req.operator._id, owner_type: "operator" };
  }
  if (req.enterprise || (req.user && req.user.usertype === 2)) {
    const u = req.enterprise || req.user;
    return { owner_id: u._id, owner_type: "enterprise" };
  }
  return null;
}

class CompanyTemplateController {
  /**
   * Create a new company template
   * POST /enterprise/company-templates
   * POST /enterprise/operator/company-templates
   */
  static create = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const {
        template_title,
        company_name_english,
        company_name_chinese,
        companydesignation,
        description,
        email,
        WhatsApp,
        WeChat,
        Line,
        Instagram,
        Facebook,
        Twitter,
        Youtube,
        Linkedin,
        SnapChat,
        Skype,
        TikTok,
        telegramId,
        contact,
        fax,
        website,
        fanpage,
        companystatus,
        company_order,
      } = req.body;

      const validator = new Validator(
        { template_title },
        { template_title: "required|string" },
      );
      if (!(await validator.check())) {
        return res
          .status(422)
          .json({ success: false, errors: validator.errors });
      }

      // Handle image upload
      let imagePath = null;
      let videoPaths = null;
      let imagesPaths = null;
      if (req.files) {
        if (req.files.image) {
          const imageFile = req.files.image;
          const fileName = `${Date.now()}_${imageFile.name}`;
          const uploadDir = path.resolve("assets/companyprofile");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await imageFile.mv(path.join(uploadDir, fileName));
          imagePath = `companyprofile/${fileName}`;
        }
        if (req.files.video) {
          const videoFile = req.files.video;
          const fileName = `${Date.now()}_${videoFile.name}`;
          const uploadDir = path.resolve("assets/video");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await videoFile.mv(path.join(uploadDir, fileName));
          videoPaths = `video/${fileName}`;
        }
      }

      const template = new CompanyTemplateModel({
        ...owner,
        template_title: template_title.trim(),
        company_name_english,
        company_name_chinese,
        companydesignation,
        description,
        email,
        WhatsApp,
        WeChat,
        Line,
        Instagram,
        Facebook,
        Twitter,
        Youtube,
        Linkedin,
        SnapChat,
        Skype,
        TikTok,
        telegramId,
        contact,
        fax,
        website,
        fanpage,
        companystatus: companystatus !== undefined ? Number(companystatus) : 0,
        company_order: company_order !== undefined ? Number(company_order) : 1,
        ...(imagePath && { image: imagePath }),
        ...(videoPaths && { video: videoPaths }),
      });

      const saved = await template.save();
      return res.status(200).json({
        success: true,
        message: "Company template created successfully",
        data: saved,
      });
    } catch (error) {
      console.error("CompanyTemplate.create error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * List company templates owned by the caller
   * GET /enterprise/company-templates
   * GET /enterprise/operator/company-templates
   */
  static list = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      // Build query based on caller type
      let query;
      if (req.operator && req.operator.createdByEnterprise) {
        // Operator: include templates from operator AND the enterprise that created them
        const operatorId = mongoose.Types.ObjectId.isValid(owner.owner_id)
          ? owner.owner_id
          : mongoose.Types.ObjectId(owner.owner_id);
        const enterpriseId = mongoose.Types.ObjectId.isValid(
          req.operator.createdByEnterprise,
        )
          ? req.operator.createdByEnterprise
          : mongoose.Types.ObjectId(req.operator.createdByEnterprise);

        query = {
          $or: [
            { owner_id: operatorId, owner_type: "operator" },
            { owner_id: enterpriseId, owner_type: "enterprise" },
          ],
        };
      } else {
        // Enterprise: only their own templates
        const ownerId = mongoose.Types.ObjectId.isValid(owner.owner_id)
          ? owner.owner_id
          : mongoose.Types.ObjectId(owner.owner_id);
        query = {
          owner_id: ownerId,
          owner_type: owner.owner_type,
        };
      }

      const templates = await CompanyTemplateModel.find(query).sort({
        company_order: 1,
        date: -1,
      });

      return res.status(200).json({
        success: true,
        message: "Company templates retrieved successfully",
        data: templates,
      });
    } catch (error) {
      console.error("CompanyTemplate.list error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Get a single company template by id (must belong to caller)
   * GET /enterprise/company-templates/:id
   */
  static getById = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const template = await CompanyTemplateModel.findOne({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!template) {
        return res
          .status(404)
          .json({ success: false, message: "Company template not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Company template retrieved successfully",
        data: template,
      });
    } catch (error) {
      console.error("CompanyTemplate.getById error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Update a company template (must belong to caller)
   * PUT /enterprise/company-templates/:id
   */
  static update = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const existing = await CompanyTemplateModel.findOne({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Company template not found" });
      }

      const allowedFields = [
        "template_title",
        "company_name_english",
        "company_name_chinese",
        "companydesignation",
        "description",
        "email",
        "WhatsApp",
        "WeChat",
        "Line",
        "Instagram",
        "Facebook",
        "Twitter",
        "Youtube",
        "Linkedin",
        "SnapChat",
        "Skype",
        "TikTok",
        "telegramId",
        "contact",
        "fax",
        "website",
        "fanpage",
        "companystatus",
        "company_order",
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      // Handle image/video re-upload
      if (req.files) {
        if (req.files.image) {
          const imageFile = req.files.image;
          const fileName = `${Date.now()}_${imageFile.name}`;
          const uploadDir = path.resolve("assets/companyprofile");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await imageFile.mv(path.join(uploadDir, fileName));
          updates.image = `companyprofile/${fileName}`;
        }
        if (req.files.video) {
          const videoFile = req.files.video;
          const fileName = `${Date.now()}_${videoFile.name}`;
          const uploadDir = path.resolve("assets/video");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await videoFile.mv(path.join(uploadDir, fileName));
          updates.video = `video/${fileName}`;
        }
      }

      const updated = await CompanyTemplateModel.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Company template updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("CompanyTemplate.update error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Delete a company template (must belong to caller)
   * DELETE /enterprise/company-templates/:id
   */
  static delete = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const deleted = await CompanyTemplateModel.findOneAndDelete({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Company template not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Company template deleted successfully",
      });
    } catch (error) {
      console.error("CompanyTemplate.delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
}

export default CompanyTemplateController;
