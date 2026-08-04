import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

ffmpeg.setFfmpegPath(ffmpegStatic);

const BALANCED_PRESET = {
  videoBitrate: "1000k",
  audioBitrate: "128k",
};

export const compressVideo = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .addOption("-b:v", BALANCED_PRESET.videoBitrate)
      .addOption("-b:a", BALANCED_PRESET.audioBitrate)
      .addOption("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1")
      .addOption("-movflags", "+faststart")
      .format("mp4")
      .on("end", () => resolve())
      .on("error", (err, stdout, stderr) => {
        reject(err || new Error(stderr));
      })
      .save(outputPath);
  });
};

export const compressVideoInPlace = async (filePath) => {
  const tempPath = `${filePath}.compressed.mp4`;
  await compressVideo(filePath, tempPath);
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
