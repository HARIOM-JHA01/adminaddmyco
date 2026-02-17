import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import AdminModel from "../Models/Admin.js";

dotenv.config();

const DATABASE_URL =
  process.env.DB ||
  "mongodb://AdminAddmyco:myNamecard6013g@127.0.0.1:27017/addmyco?authSource=admin";

const createAdmin = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to DB");

    const name = "admin"; // Change as needed
    const email = "admin@example.com"; // Change as needed
    const password = "admin123"; // Change as needed

    // Check if admin already exists
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new AdminModel({
      name,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    console.log("Admin user created successfully");
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
