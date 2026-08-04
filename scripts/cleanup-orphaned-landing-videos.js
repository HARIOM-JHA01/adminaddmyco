import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import LandingVideoModel from "../Models/LandingVideo.js";
import { __dirname } from "../Config.js";

dotenv.config();

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DBNAME || "addmyco";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(
    DRY_RUN
      ? "Starting landing video cleanup (dry run, no deletions)..."
      : "Starting landing video cleanup...",
  );
  await mongoose.connect(DATABASE_URL, {
    dbName: DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log(`Connected to DB: ${DB_NAME}`);

  const stats = {
    totalRecords: 0,
    missingFile: 0,
    deleted: 0,
    ok: 0,
  };

  try {
    // Bypass the videoUrl getter (which prefixes the asset base URL) by
    // reading the raw stored field via .lean() so we get the relative path.
    const videos = await LandingVideoModel.find().lean();
    stats.totalRecords = videos.length;

    for (const video of videos) {
      const relativePath = video.videoUrl;
      if (!relativePath) {
        continue;
      }

      const fullPath = path.join(__dirname, "assets", relativePath);
      const exists = fs.existsSync(fullPath);

      if (exists) {
        stats.ok += 1;
        continue;
      }

      stats.missingFile += 1;
      console.log(
        `Missing file for record ${video._id}: expected at ${fullPath}`,
      );

      if (!DRY_RUN) {
        await LandingVideoModel.findByIdAndDelete(video._id);
        stats.deleted += 1;
      }
    }

    console.log("Cleanup completed.");
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await mongoose.connection.close();
    console.log("DB connection closed.");
  }
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
