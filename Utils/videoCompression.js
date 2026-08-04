import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

ffmpeg.setFfmpegPath(ffmpegStatic);

const QUALITY_PRESETS = {
  low: {
    videoBitrate: "500k",
    audioBitrate: "96k",
    width: 640,
    height: 1136,
  },
  medium: {
    videoBitrate: "1000k",
    audioBitrate: "128k",
    width: 720,
    height: 1280,
  },
  high: {
    videoBitrate: "2000k",
    audioBitrate: "192k",
    width: 1080,
    height: 1920,
  },
};

export const compressVideo = async (
  inputPath,
  outputPath,
  quality = "medium",
) => {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .addOption("-b:v", preset.videoBitrate)
      .addOption("-b:a", preset.audioBitrate)
      .addOption("-vf", `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,setsar=1`)
      .addOption("-movflags", "+faststart")
      .format("mp4")
      .on("end", () => resolve())
      .on("error", (err, stdout, stderr) => {
        reject(err || new Error(stderr));
      })
      .save(outputPath);
  });
};

export const compressVideoInPlace = async (filePath, quality = "medium") => {
  const tempPath = `${filePath}.compressed.mp4`;
  await compressVideo(filePath, tempPath, quality);
  fs.unlinkSync(filePath);
  fs.renameSync(tempPath, filePath);
  return filePath;
};

export const getVideoInfo = async (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath).on("error", reject).on("end", resolve).on("start", () => {});
    try {
      const output = execSync(
        `"${ffmpegStatic}" -v quiet -print_format json -show_format -show_streams "${filePath}"`,
        { encoding: "utf-8" },
      );
      resolve(JSON.parse(output));
    } catch (err) {
      reject(err);
    }
  });
};

export { QUALITY_PRESETS };
