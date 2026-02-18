import mongoose from "mongoose";
import dotenv from "dotenv";
import BackgroundModel from "./Models/Background.js";

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");
    const mongoURI =
      process.env.DB || process.env.MONGODB_URI || process.env.DB_URI;

    if (!mongoURI) {
      console.error("No database URI found in environment variables");
      process.exit(1);
    }

    console.log(`Using DB URI: ${mongoURI.substring(0, 50)}...`);

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✓ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

const cleanupBackgrounds = async () => {
  try {
    console.log("\n🔍 Finding all backgrounds...");
    const backgrounds = await BackgroundModel.find({});
    console.log(`Found ${backgrounds.length} background record(s)\n`);

    let updated = 0;
    let errors = 0;

    for (const bg of backgrounds) {
      try {
        if (bg.fileUrl) {
          const original = bg.fileUrl;
          // fileUrl should already be a complete URL, no cleaning needed
          console.log(`- fileUrl for user ${bg.user_id}: ${original}`);
        }
      } catch (err) {
        console.error(`❌ Error checking background ${bg._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Total records: ${backgrounds.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await cleanupBackgrounds();
    console.log("\n✅ Cleanup completed successfully!");
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
};

main();
