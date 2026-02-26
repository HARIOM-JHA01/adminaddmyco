import mongoose from "mongoose";
import dotenv from "dotenv";
import NotificationModel from "../Models/Notification.js";
import AdminNotificationModel from "../Models/AdminNotification.js";

dotenv.config();

const DATABASE_URL = process.env.DB || "mongodb://127.0.0.1:27017";

async function deleteAllNotifications() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to database successfully");

    // Delete all user notifications
    console.log("Deleting all user notifications...");
    const userNotificationResult = await NotificationModel.deleteMany({});
    console.log(`Deleted ${userNotificationResult.deletedCount} user notifications`);

    // Delete all admin notifications
    console.log("Deleting all admin notifications...");
    const adminNotificationResult = await AdminNotificationModel.deleteMany({});
    console.log(`Deleted ${adminNotificationResult.deletedCount} admin notifications`);

    console.log("All notifications deleted successfully!");
    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error:", error);
    await mongoose.connection.close();
  }
}

// Run the function
deleteAllNotifications();
