import mongoose from "mongoose";
import UserModel from "./Models/User.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migration script to add freeUsername to existing users
 * This script should be run once after deploying the new code
 */

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";

// Generate a random username
function generateUsername() {
  return crypto.randomBytes(4).toString("hex");
}

async function migrate() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to database successfully");

    console.log("Starting migration to add freeUsername to existing users...");

    // Find all users without freeUsername
    const usersWithoutFreeUsername = await UserModel.find({
      $or: [
        { freeUsername: { $exists: false } },
        { freeUsername: null },
        { freeUsername: "" },
      ],
    });

    console.log(
      `Found ${usersWithoutFreeUsername.length} users without freeUsername`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutFreeUsername) {
      try {
        let generatedUsername;
        let isUnique = false;

        // If user is free and has a username that looks random (8 chars hex), use it as freeUsername
        if (
          user.usertype === 0 &&
          user.username &&
          /^[a-f0-9]{8}$/.test(user.username)
        ) {
          generatedUsername = user.username;
        } else {
          // Generate a new unique freeUsername
          generatedUsername = generateUsername();
          while (!isUnique) {
            const conflict = await UserModel.findOne({
              freeUsername: generatedUsername,
            });
            if (!conflict) {
              isUnique = true;
            } else {
              generatedUsername = generateUsername();
            }
          }
        }

        // Prepare update object
        const updateObj = { freeUsername: generatedUsername };

        // If user is free (usertype 0) and doesn't have a username, set it to freeUsername
        if (user.usertype === 0 && (!user.username || user.username === "")) {
          updateObj.username = generatedUsername;
        }

        // If user is premium but has a random-looking username instead of tgid, update it
        if (
          user.usertype === 1 &&
          user.tgid &&
          user.username !== user.tgid &&
          /^[a-f0-9]{8}$/.test(user.username)
        ) {
          // Try to set username to tgid
          const conflict = await UserModel.findOne({
            username: user.tgid,
            _id: { $ne: user._id },
          });
          if (!conflict) {
            updateObj.username = user.tgid;
          } else {
            // If conflict, append suffix
            updateObj.username =
              user.tgid + "-" + crypto.randomBytes(2).toString("hex");
          }
        }

        await UserModel.findByIdAndUpdate(user._id, updateObj);

        console.log(
          `✓ Updated user ${user._id} (${
            user.tgid || "no tgid"
          }) with freeUsername: ${generatedUsername}`
        );
        successCount++;
      } catch (error) {
        console.error(`✗ Error updating user ${user._id}:`, error);
        errorCount++;
      }
    }

    console.log("\n=== Migration completed ===");
    console.log(`Successfully updated: ${successCount} users`);
    console.log(`Errors: ${errorCount} users`);

    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
migrate();
