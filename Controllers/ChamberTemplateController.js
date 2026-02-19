import { Validator } from "node-input-validator";
import mongoose from "mongoose";
import ChamberTemplateModel from "../Models/ChamberTemplate.js";
import path from "path";
import fs from "fs";

/**
 * ChamberTemplateController
 *
 * Accessible by:
 *   - Operator  → req.operator is set  (owner_type = "operator")
 *   - Enterprise/Donator user → req.enterprise / req.user (usertype=2) (owner_type = "enterprise")
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

class ChamberTemplateController {
  /**
   * Create a new chamber template
   * POST /enterprise/chamber-templates
   * POST /enterprise/operator/chamber-templates
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
        chamber_name_english,
        chamber_name_chinese,
        chamberdesignation,
        detail,
        tgchannel,
        chamberfanpage,
        chamberwebsite,
        chamber_order,
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
        usertype,
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

      // Handle image/video upload
      let imagePath = null;
      let videoPaths = null;
      if (req.files) {
        if (req.files.image) {
          const imageFile = req.files.image;
          const fileName = `${Date.now()}_${imageFile.name}`;
          const uploadDir = path.resolve("assets/chamber");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await imageFile.mv(path.join(uploadDir, fileName));
          imagePath = `chamber/${fileName}`;
        }
        if (req.files.video) {
          const videoFile = req.files.video;
          const fileName = `${Date.now()}_${videoFile.name}`;
          const uploadDir = path.resolve("assets/chambervideo");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await videoFile.mv(path.join(uploadDir, fileName));
          videoPaths = `chambervideo/${fileName}`;
        }
      }

      const template = new ChamberTemplateModel({
        ...owner,
        template_title: template_title.trim(),
        chamber_name_english,
        chamber_name_chinese,
        chamberdesignation,
        detail,
        tgchannel,
        chamberfanpage,
        chamberwebsite,
        chamber_order: chamber_order !== undefined ? Number(chamber_order) : 1,
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
        usertype: usertype !== undefined ? Number(usertype) : 0,
        ...(imagePath && { image: imagePath }),
        ...(videoPaths && { video: videoPaths }),
      });

      const saved = await template.save();
      return res.status(200).json({
        success: true,
        message: "Chamber template created successfully",
        data: saved,
      });
    } catch (error) {
      console.error("ChamberTemplate.create error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * List chamber templates owned by the caller
   * GET /enterprise/chamber-templates
   * GET /enterprise/operator/chamber-templates
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

      const templates = await ChamberTemplateModel.find(query).sort({
        chamber_order: 1,
        date: -1,
      });

      return res.status(200).json({
        success: true,
        message: "Chamber templates retrieved successfully",
        data: templates,
      });
    } catch (error) {
      console.error("ChamberTemplate.list error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Get a single chamber template by id (must belong to caller)
   * GET /enterprise/chamber-templates/:id
   */
  static getById = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const template = await ChamberTemplateModel.findOne({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!template) {
        return res
          .status(404)
          .json({ success: false, message: "Chamber template not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Chamber template retrieved successfully",
        data: template,
      });
    } catch (error) {
      console.error("ChamberTemplate.getById error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Update a chamber template (must belong to caller)
   * PUT /enterprise/chamber-templates/:id
   */
  static update = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const existing = await ChamberTemplateModel.findOne({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Chamber template not found" });
      }

      const allowedFields = [
        "template_title",
        "chamber_name_english",
        "chamber_name_chinese",
        "chamberdesignation",
        "detail",
        "tgchannel",
        "chamberfanpage",
        "chamberwebsite",
        "chamber_order",
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
        "usertype",
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
          const uploadDir = path.resolve("assets/chamber");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await imageFile.mv(path.join(uploadDir, fileName));
          updates.image = `chamber/${fileName}`;
        }
        if (req.files.video) {
          const videoFile = req.files.video;
          const fileName = `${Date.now()}_${videoFile.name}`;
          const uploadDir = path.resolve("assets/chambervideo");
          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
          await videoFile.mv(path.join(uploadDir, fileName));
          updates.video = `chambervideo/${fileName}`;
        }
      }

      const updated = await ChamberTemplateModel.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Chamber template updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("ChamberTemplate.update error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

  /**
   * Delete a chamber template (must belong to caller)
   * DELETE /enterprise/chamber-templates/:id
   */
  static delete = async (req, res) => {
    try {
      const owner = resolveOwner(req);
      if (!owner) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const deleted = await ChamberTemplateModel.findOneAndDelete({
        _id: req.params.id,
        owner_id: owner.owner_id,
        owner_type: owner.owner_type,
      });

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Chamber template not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Chamber template deleted successfully",
      });
    } catch (error) {
      console.error("ChamberTemplate.delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
}

export default ChamberTemplateController;
