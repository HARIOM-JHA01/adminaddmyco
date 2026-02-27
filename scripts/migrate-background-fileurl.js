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

    const collection = mongoose.connection.collection("backgrounds");

    const totalDocs = await collection.countDocuments();
    console.log(`Total background documents: ${totalDocs}`);

    const docs = await collection.find({}).toArray();
    let updated = 0;

    for (const doc of docs) {
      const needsMigration =
        typeof doc.fileUrl === "string" ||
        (doc.fileUrl && !Array.isArray(doc.fileUrl));

      if (needsMigration) {
        const oldValue = typeof doc.fileUrl === "string" ? doc.fileUrl : doc.fileUrl?.toString();
        console.log(`Migrating document ${doc._id}: ${oldValue} -> [${oldValue}]`);

        await collection.updateOne(
          { _id: doc._id },
          { $set: { fileUrl: [oldValue] } }
        );
        updated++;
      }
    }

    console.log(`Migrated ${updated} documents`);

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
