import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js"; // adjust the path if needed

dotenv.config();

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/mitherdb";

async function createAdmin() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const email = "hatdogwithcheese14385@gmail.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin._id);
      process.exit(0);
    }

    // Use password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error("ADMIN_PASSWORD is not set in the environment variables");
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new User({
      name: "Super Admin",
      email,
      password: hashedPassword,
      role: "admin",
      firstLogin: false,
    });

    await admin.save();
    console.log("✅ Admin created successfully:", admin._id);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
