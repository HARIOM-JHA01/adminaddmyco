import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Compress video file with optimized settings
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputPath - Path where compressed video will be saved
 * @param {Object} options - Compression options
 * @param {string} options.quality - Video quality: 'low', 'medium', 'high' (default: 'medium')
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1280)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 720)
 * @param {number} options.videoBitrate - Video bitrate in kbps (default: 1000)
 * @param {number} options.audioBitrate - Audio bitrate in kbps (default: 128)
 * @returns {Promise<string>} - Returns the output path on success
 */
export const compressVideo = (inputPath, outputPath, options = {}) => {
  return new Promise((resolve, reject) => {
    // Default options
    const {
      quality = "medium",
      maxWidth = 1280,
      maxHeight = 720,
      videoBitrate = 1000,
      audioBitrate = 128,
    } = options;

    // Quality presets
    const qualityPresets = {
      low: {
        videoBitrate: 500,
        audioBitrate: 96,
        crf: 28,
        preset: "fast",
      },
      medium: {
        videoBitrate: 1000,
        audioBitrate: 128,
        crf: 23,
        preset: "medium",
      },
      high: {
        videoBitrate: 2000,
        audioBitrate: 192,
        crf: 20,
        preset: "slow",
      },
    };

    const preset = qualityPresets[quality] || qualityPresets.medium;

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Input file does not exist: ${inputPath}`));
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Start compression
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264", // Video codec
        `-crf ${preset.crf}`, // Constant Rate Factor (lower = better quality)
        `-preset ${preset.preset}`, // Encoding speed preset
        `-vf scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`, // Scale video while maintaining aspect ratio
        "-c:a aac", // Audio codec
        `-b:a ${preset.audioBitrate}k`, // Audio bitrate
        "-movflags +faststart", // Enable fast start for web playback
      ])
      .on("start", (commandLine) => {
        console.log("FFmpeg compression started:", commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Compression progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        console.log("Video compression completed successfully");

        // Get file sizes for logging
        const inputSize = fs.statSync(inputPath).size;
        const outputSize = fs.statSync(outputPath).size;
        const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(
          2
        );

        console.log(
          `Original size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(
          `Compressed size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`
        );
        console.log(`Compression ratio: ${compressionRatio}%`);

        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Video compression error:", err);
        reject(err);
      })
      .save(outputPath);
  });
};

/**
 * Compress video and replace the original file
 * @param {string} videoPath - Path to the video file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Returns the video path on success
 */
export const compressVideoInPlace = async (videoPath, options = {}) => {
  const tempPath = videoPath + ".temp.mp4";

  try {
    // Compress to temporary file
    await compressVideo(videoPath, tempPath, options);

    // Delete original file
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Rename temp file to original name
    fs.renameSync(tempPath, videoPath);

    return videoPath;
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
};

/**
 * Get video information
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<Object>} - Returns video metadata
 */
export const getVideoInfo = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
};

export default {
  compressVideo,
  compressVideoInPlace,
  getVideoInfo,
};
