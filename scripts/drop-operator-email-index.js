import dotenv from "dotenv";
dotenv.config();

import connectDB from "../Db/Connectdb.js";
import OperatorModel from "../Models/Operator.js";

const DATABASE_URL =
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  "mongodb://localhost:27017/addmyco";

(async () => {
  try {
    await connectDB(DATABASE_URL);
    const coll = OperatorModel.collection;
    const indexes = await coll.indexes();
    const emailIndex = indexes.find(
      (i) => (i.key && i.key.email === 1) || i.name === "email_1",
    );
    if (!emailIndex) {
      console.log("No email index found on operators collection.");
      process.exit(0);
    }
    console.log("Found email index:", emailIndex);
    const indexName = emailIndex.name || "email_1";
    try {
      await coll.dropIndex(indexName);
      console.log("Dropped index:", indexName);
    } catch (err) {
      console.error("Failed to drop index:", err);
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
