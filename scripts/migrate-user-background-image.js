import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";

async function migrate() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to database successfully");

    const BackgroundModel = (await import("../Models/Background.js")).default;
    const UserModel = (await import("../Models/User.js")).default;

    const backgrounds = await BackgroundModel.find({});
    console.log(`Found ${backgrounds.length} background documents`);

    let migrated = 0;
    for (const bg of backgrounds) {
      const userId = bg.user_id;
      if (!userId) continue;

      let backgroundImage = null;

      if (Array.isArray(bg.fileUrl) && bg.fileUrl.length > 0) {
        backgroundImage = bg.fileUrl[0];
      } else if (typeof bg.fileUrl === "string" && bg.fileUrl) {
        backgroundImage = bg.fileUrl;
      }

      if (backgroundImage) {
        await UserModel.findByIdAndUpdate(userId, {
          $set: { background_image: backgroundImage },
        });
        migrated++;
        console.log(`Migrated user ${userId}: ${backgroundImage}`);
      }
    }

    console.log(`\nMigrated ${migrated} users`);

    await mongoose.connection.close();
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrate();
