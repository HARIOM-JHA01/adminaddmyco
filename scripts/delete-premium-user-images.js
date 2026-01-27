import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DBNAME || "addmyco";

// Import models
import UserModel from "../Models/User.js";
import CompanyModel from "../Models/Company.js";
import ChamberModel from "../Models/Chamber.js";

/**
 * Delete a file from the filesystem if it exists
 */
function deleteFile(filePath) {
  if (!filePath) return { success: false, reason: "No path provided" };

  try {
    // Clean up malformed paths (remove "undefinedassets" prefix)
    let cleanPath = filePath;
    // Remove all occurrences of "undefinedassets/" or "undefinedassets" prefix
    cleanPath = cleanPath.replace(/^(undefinedassets\/)+/gi, "");
    cleanPath = cleanPath.replace(/^undefinedassets/gi, "");
    cleanPath = cleanPath.replace(/assets\//g, "");

    // Try multiple possible paths
    const possiblePaths = [
      path.join(projectRoot, "assets", cleanPath),
      path.join(projectRoot, cleanPath),
      path.join(projectRoot, "assets", filePath),
      path.join(projectRoot, filePath),
    ];

    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return { success: true, path: cleanPath, actualPath: fullPath };
      }
    }

    return {
      success: false,
      reason: "File not found in any location",
      path: cleanPath,
    };
  } catch (error) {
    return { success: false, reason: error.message, path: filePath };
  }
}

/**
 * Main function to delete company and chamber images for premium users
 */
async function deletePremiumUserImages() {
  try {
    console.log("==========================================");
    console.log("Delete Premium User Images Script");
    console.log("==========================================\n");

    // Connect to database
    console.log("Connecting to database...");
    await mongoose.connect(DATABASE_URL, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ Connected to database successfully\n");

    // Find all premium users (usertype = 1)
    console.log("Finding premium users (usertype = 1)...");
    const premiumUsers = await UserModel.find({ usertype: 1 }).select(
      "_id username tgid",
    );
    console.log(`✓ Found ${premiumUsers.length} premium users\n`);

    if (premiumUsers.length === 0) {
      console.log("No premium users found. Exiting.");
      await mongoose.connection.close();
      return;
    }

    const userIds = premiumUsers.map((u) => u._id);

    // Statistics
    let stats = {
      companies: { found: 0, imagesDeleted: 0, videosDeleted: 0, failed: 0 },
      chambers: { found: 0, imagesDeleted: 0, videosDeleted: 0, failed: 0 },
    };

    // Process Company images
    console.log("==========================================");
    console.log("Processing Company Images");
    console.log("==========================================\n");

    const companies = await CompanyModel.find({ user_id: { $in: userIds } });
    stats.companies.found = companies.length;
    console.log(`Found ${companies.length} companies for premium users\n`);

    for (const company of companies) {
      const user = premiumUsers.find(
        (u) => u._id.toString() === company.user_id.toString(),
      );
      const userInfo = user ? `(${user.tgid || user.username || "N/A"})` : "";

      console.log(
        `Company ID: ${company._id} - User: ${company.user_id} ${userInfo}`,
      );

      // Delete main image
      if (company.image) {
        const result = deleteFile(company.image);
        if (result.success) {
          console.log(`  ✓ Deleted image: ${result.path}`);
          stats.companies.imagesDeleted++;
        } else {
          console.log(
            `  ✗ Failed to delete image: ${result.path} - ${result.reason}`,
          );
          stats.companies.failed++;
        }
      }

      // Delete multiple images
      if (company.images && Array.isArray(company.images)) {
        for (const img of company.images) {
          if (img) {
            const result = deleteFile(img);
            if (result.success) {
              console.log(`  ✓ Deleted image: ${result.path}`);
              stats.companies.imagesDeleted++;
            } else {
              console.log(
                `  ✗ Failed to delete image: ${result.path} - ${result.reason}`,
              );
              stats.companies.failed++;
            }
          }
        }
      }

      // Clear image fields in database (keep videos intact)
      company.image = null;
      company.images = [];
      await company.save();
      console.log(`  ✓ Cleared database fields\n`);
    }

    // Process Chamber images
    console.log("==========================================");
    console.log("Processing Chamber Images");
    console.log("==========================================\n");

    const chambers = await ChamberModel.find({ user_id: { $in: userIds } });
    stats.chambers.found = chambers.length;
    console.log(`Found ${chambers.length} chambers for premium users\n`);

    for (const chamber of chambers) {
      const user = premiumUsers.find(
        (u) => u._id.toString() === chamber.user_id.toString(),
      );
      const userInfo = user ? `(${user.tgid || user.username || "N/A"})` : "";

      console.log(
        `Chamber ID: ${chamber._id} - User: ${chamber.user_id} ${userInfo}`,
      );

      // Delete image
      if (chamber.image) {
        const result = deleteFile(chamber.image);
        if (result.success) {
          console.log(`  ✓ Deleted image: ${result.path}`);
          stats.chambers.imagesDeleted++;
        } else {
          console.log(
            `  ✗ Failed to delete image: ${result.path} - ${result.reason}`,
          );
          stats.chambers.failed++;
        }
      }

      // Clear image field in database (keep video intact)
      chamber.image = null;
      await chamber.save();
      console.log(`  ✓ Cleared database fields\n`);
    }

    // Print summary
    console.log("==========================================");
    console.log("Summary");
    console.log("==========================================\n");
    console.log(`Premium users found: ${premiumUsers.length}`);
    console.log(`\nCompanies:`);
    console.log(`  - Found: ${stats.companies.found}`);
    console.log(`  - Images deleted: ${stats.companies.imagesDeleted}`);
    console.log(`  - Failed deletions: ${stats.companies.failed}`);
    console.log(`\nChambers:`);
    console.log(`  - Found: ${stats.chambers.found}`);
    console.log(`  - Images deleted: ${stats.chambers.imagesDeleted}`);
    console.log(`  - Failed deletions: ${stats.chambers.failed}`);
    console.log("\n✓ Script completed successfully!");

    // Close database connection
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
  } catch (error) {
    console.error("\n✗ Error occurred:");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
deletePremiumUserImages();
