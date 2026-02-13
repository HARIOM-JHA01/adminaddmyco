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
        if (bg.Thumbnail) {
          const original = bg.Thumbnail;
          const cleaned = bg.Thumbnail.split(",")
            .filter(Boolean)
            .map((item) => {
              // If it's a full URL, extract just the filename
              if (item.startsWith("http://") || item.startsWith("https://")) {
                const filename = item.split("/").pop();
                console.log(
                  `  Converting URL to filename: ${item.substring(0, 60)}... → ${filename}`,
                );
                return filename;
              }
              return item;
            })
            .join(",");

          // Only update if something changed
          if (original !== cleaned) {
            await BackgroundModel.updateOne(
              { _id: bg._id },
              { $set: { Thumbnail: cleaned } },
            );
            console.log(`✓ Updated background for user ${bg.user_id}`);
            updated++;
          } else {
            console.log(`- No changes needed for user ${bg.user_id}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error updating background ${bg._id}:`, err.message);
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
