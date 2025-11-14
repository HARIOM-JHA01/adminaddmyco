/**
 * Simple test for video compression utility
 *
 * NOTE: This is a basic test file. For actual testing, you'll need a sample video file.
 *
 * To run this test:
 * 1. Place a test video file (e.g., test-video.mp4) in the project root
 * 2. Run: node Utils/testVideoCompression.js
 */

import {
  compressVideo,
  compressVideoInPlace,
  getVideoInfo,
} from "./Utils/videoCompression.js";
import fs from "fs";
import path from "path";

// Test configuration
const TEST_VIDEO_PATH = "./assets/chambervideo/0.z93cdk.video.mp4"; // Update this to your test video path
const OUTPUT_PATH = "./test-video-compressed.mp4";

async function runTests() {
  console.log("=".repeat(60));
  console.log("VIDEO COMPRESSION UTILITY TEST");
  console.log("=".repeat(60));
  console.log();

  // Check if test video exists
  if (!fs.existsSync(TEST_VIDEO_PATH)) {
    console.error("❌ Test video not found:", TEST_VIDEO_PATH);
    console.log("\nTo run this test:");
    console.log("1. Place a test video file in the project root");
    console.log("2. Update TEST_VIDEO_PATH in this file");
    console.log("3. Run: node Utils/testVideoCompression.js");
    return;
  }

  try {
    // Test 1: Get video info
    console.log("Test 1: Getting video information...");
    console.log("-".repeat(60));
    const videoInfo = await getVideoInfo(TEST_VIDEO_PATH);
    console.log("✅ Video info retrieved successfully");
    console.log(`Duration: ${videoInfo.format.duration} seconds`);
    console.log(`Format: ${videoInfo.format.format_name}`);
    console.log(`Size: ${(videoInfo.format.size / 1024 / 1024).toFixed(2)} MB`);
    if (videoInfo.streams && videoInfo.streams[0]) {
      const videoStream = videoInfo.streams.find(
        (s) => s.codec_type === "video"
      );
      if (videoStream) {
        console.log(`Resolution: ${videoStream.width}x${videoStream.height}`);
        console.log(`Codec: ${videoStream.codec_name}`);
      }
    }
    console.log();

    // Test 2: Compress video to new file
    console.log("Test 2: Compressing video to new file (medium quality)...");
    console.log("-".repeat(60));
    await compressVideo(TEST_VIDEO_PATH, OUTPUT_PATH, { quality: "medium" });
    console.log("✅ Video compressed successfully");

    const originalSize = fs.statSync(TEST_VIDEO_PATH).size;
    const compressedSize = fs.statSync(OUTPUT_PATH).size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

    console.log(`Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved: ${ratio}%`);
    console.log();

    // Test 3: Test different quality settings
    console.log("Test 3: Testing quality presets...");
    console.log("-".repeat(60));

    const qualities = ["low", "medium", "high"];
    for (const quality of qualities) {
      const testOutput = `./test-video-${quality}.mp4`;
      console.log(`\nCompressing with ${quality} quality...`);

      const startTime = Date.now();
      await compressVideo(TEST_VIDEO_PATH, testOutput, { quality });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      const size = fs.statSync(testOutput).size;
      console.log(
        `✅ ${quality}: ${(size / 1024 / 1024).toFixed(
          2
        )} MB (took ${duration}s)`
      );

      // Clean up test file
      if (fs.existsSync(testOutput)) {
        fs.unlinkSync(testOutput);
      }
    }
    console.log();

    // Clean up
    console.log("Cleaning up test files...");
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }
    console.log("✅ Test files cleaned up");
    console.log();

    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error.message);
    console.error(error.stack);
  }
}

// Run tests
runTests();
