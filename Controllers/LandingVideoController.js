import { Validator } from "node-input-validator";
import { validatorError } from "../Common.js";
import { __dirname, baseUrl, view } from "../Config.js";
import makeDir from "make-dir";
import fs from "fs";
import path from "path";
import LandingVideoModel from "../Models/LandingVideo.js";
import { compressVideo } from "../Utils/videoCompression.js";

class LandingVideoController {
  /**
   * POST /api/v1/admin/landing-video/upload
   * Admin: upload a video + link. FFmpeg compresses the video, then it's stored in DB.
   */
  static uploadLandingVideo = async (req, res) => {
    try {
      const { title, linkUrl } = req.body;

      let validator = new Validator(req.body, {
        linkUrl: "required|url",
      });

      if (!(await validator.check())) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validatorError(res, validator.errors),
        });
      }

      if (!req.files || !req.files.video) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      const video = req.files.video;
      const maxFileSize = 100 * 1024 * 1024;
      if (video.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          message: "Video file size must not exceed 100MB",
        });
      }

      const allowedMimes = ["video/mp4", "video/webm", "video/quicktime"];
      if (!allowedMimes.includes(video.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only MP4, WebM, or MOV videos are allowed",
        });
      }

      const uploadDir = await makeDir(path.join(__dirname, "assets/landingvideo"));
      var d = new Date();
      var videoName = video.name.replace(/\s/g, "");
      let r = (Math.random() + 1).toString(36).substring(7);
      var storedName = d.getTime() + "." + r + "." + videoName;
      var storedRelative = "landingvideo/" + storedName;
      let uploadPath = path.join(uploadDir, storedName);
      let originalSize = video.size;

      await video.mv(uploadPath);

      const compressedPath = path.join(uploadDir, "compressed_" + storedName);
      await compressVideo(uploadPath, compressedPath);

      const compressedSize = fs.statSync(compressedPath).size;

      const compressedRelative = "landingvideo/" + "compressed_" + storedName;
      const compressedFullPath = path.join(uploadDir, "compressed_" + storedName);
      const originalFullPath = path.join(uploadDir, storedName);

      if (compressedFullPath !== uploadPath && fs.existsSync(originalFullPath)) {
        fs.unlinkSync(originalFullPath);
      }

      fs.renameSync(compressedPath, uploadPath);

      const doc = new LandingVideoModel({
        title: title || "",
        videoUrl: compressedRelative,
        linkUrl,
        isCompressed: true,
        originalSize,
        compressedSize,
        uploadedBy: req.user ? req.user._id : null,
        isActive: true,
      });

      await doc.save();

      return res.status(201).json({
        success: true,
        message: "Landing video uploaded and compressed successfully",
        data: {
          _id: doc._id,
          title: doc.title,
          videoUrl: doc.videoUrl,
          linkUrl: doc.linkUrl,
          isCompressed: doc.isCompressed,
          originalSize: doc.originalSize,
          compressedSize: doc.compressedSize,
          isActive: doc.isActive,
          createdAt: doc.date,
        },
      });
    } catch (error) {
      console.error("Error uploading landing video:", error);
      return res.status(500).json({
        success: false,
        message: "Error uploading landing video",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/landing-video/active
   * Public: randomly returns one active landing video + link (no auth required)
   */
  static getActiveLandingVideo = async (req, res) => {
    try {
      const [randomVideo] = await LandingVideoModel.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: 1 } },
      ]);

      if (!randomVideo) {
        return res.status(404).json({
          success: false,
          message: "No active landing video found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          _id: randomVideo._id,
          title: randomVideo.title,
          videoUrl: randomVideo.videoUrl,
          linkUrl: randomVideo.linkUrl,
          isCompressed: randomVideo.isCompressed,
          originalSize: randomVideo.originalSize,
          compressedSize: randomVideo.compressedSize,
          createdAt: randomVideo.date,
        },
      });
    } catch (error) {
      console.error("Error fetching active landing video:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching landing video",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/v1/admin/landing-video
   * Admin: list all uploaded landing videos
   */
  static listLandingVideos = async (req, res) => {
    try {
      const videos = await LandingVideoModel.find().sort({ date: -1 });

      return res.status(200).json({
        success: true,
        data: videos,
      });
    } catch (error) {
      console.error("Error listing landing videos:", error);
      return res.status(500).json({
        success: false,
        message: "Error listing landing videos",
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/v1/admin/landing-video/:id/toggle
   * Admin: toggle a video's active/inactive state (multiple can be active)
   */
  static toggleLandingVideo = async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await LandingVideoModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Landing video not found",
        });
      }

      const updated = await LandingVideoModel.findByIdAndUpdate(
        id,
        { $set: { isActive: !existing.isActive } },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: `Landing video ${updated.isActive ? "activated" : "deactivated"}`,
        data: { id, isActive: updated.isActive },
      });
    } catch (error) {
      console.error("Error toggling landing video:", error);
      return res.status(500).json({
        success: false,
        message: "Error toggling landing video",
        error: error.message,
      });
    }
  };

  /**
   * DELETE /api/v1/admin/landing-video/:id
   * Admin: delete a landing video and its file
   */
  static deleteLandingVideo = async (req, res) => {
    try {
      const { id } = req.params;

      const video = await LandingVideoModel.findById(id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Landing video not found",
        });
      }

      if (video.videoUrl) {
        var filePath = video.videoUrl.replace(baseUrl + "assets/", "");
        var fullPath = path.join(__dirname, "assets", filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      const wasActive = video.isActive;
      await LandingVideoModel.findByIdAndDelete(id);

      if (wasActive) {
        const latest = await LandingVideoModel.findOne().sort({ date: -1 });
        if (latest) {
          await LandingVideoModel.findByIdAndUpdate(
            latest._id,
            { $set: { isActive: true } },
            { new: true },
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: "Landing video deleted",
      });
    } catch (error) {
      console.error("Error deleting landing video:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting landing video",
        error: error.message,
      });
    }
  };

  /**
   * GET /admin/landing-video
   * Admin: render the list/management view
   */
  static listLandingVideosView = async (req, res) => {
    try {
      const videos = await LandingVideoModel.find().sort({ date: -1 });
      res.render("LandingVideo/List", {
        baseUrl,
        path: "landing-video",
        videos,
      });
    } catch (error) {
      console.error("Error rendering landing video list:", error);
      res.render("LandingVideo/List", {
        baseUrl,
        path: "landing-video",
        videos: [],
        error: "Failed to load landing videos",
      });
    }
  };

  /**
   * GET /admin/landing-video/upload
   * Admin: render the upload form
   */
  static uploadLandingVideoView = async (req, res) => {
    res.render("LandingVideo/Upload", {
      baseUrl,
      path: "landing-video",
    });
  };
}

export default LandingVideoController;
