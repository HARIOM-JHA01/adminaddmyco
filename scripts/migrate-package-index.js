import mongoose from "mongoose";
import dotenv from "dotenv";
import AdvertisementPackageModel from "../Models/AdvertisementPackage.js";

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

    const collection = mongoose.connection.collection("advertisementpackages");

    console.log("Existing indexes:");
    const indexes = await collection.indexes();
    console.log(indexes);

    // If there is an index on name alone, drop it
    const nameIndex = indexes.find((idx) => idx.name === "name_1");
    if (nameIndex) {
      console.log("Found old index 'name_1'. Dropping it...");
      try {
        await collection.dropIndex("name_1");
        console.log("Dropped index 'name_1'");
      } catch (err) {
        console.error("Failed to drop index 'name_1':", err);
        process.exit(1);
      }
    } else {
      console.log("No 'name_1' index found. Skipping drop.");
    }

    // Check for existing conflicting documents (same name with overlapping positions)
    console.log(
      "Checking for existing packages that conflict with the compound index...",
    );
    const pkgs = await AdvertisementPackageModel.find(
      {},
      { _id: 1, name: 1, positions: 1 },
    ).lean();

    const conflicts = [];
    for (let i = 0; i < pkgs.length; i++) {
      for (let j = i + 1; j < pkgs.length; j++) {
        if (pkgs[i].name === pkgs[j].name) {
          const setA = new Set(pkgs[i].positions || []);
          const setB = new Set(pkgs[j].positions || []);
          const intersection = [...setA].filter((x) => setB.has(x));
          if (intersection.length > 0) {
            conflicts.push({
              a: pkgs[i],
              b: pkgs[j],
              overlappingPositions: intersection,
            });
          }
        }
      }
    }

    if (conflicts.length > 0) {
      console.error(
        "Found conflicting packages that would violate the new unique index:",
      );
      conflicts.forEach((c) => {
        console.error(
          `- ${c.a._id} and ${c.b._id} (name: ${c.a.name}) overlapping positions: ${c.overlappingPositions.join(", ")}`,
        );
      });
      console.error(
        "Please resolve these conflicts manually (rename or remove duplicates) before creating the compound unique index. Exiting.",
      );
      await mongoose.connection.close();
      process.exit(2);
    }

    // Create the compound index
    console.log(
      "Creating compound unique index on { name: 1, positions: 1 }...",
    );
    try {
      await collection.createIndex({ name: 1, positions: 1 }, { unique: true });
      console.log("Compound index created successfully");
    } catch (err) {
      console.error("Failed to create compound index:", err);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log("Migration completed successfully.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrate();
