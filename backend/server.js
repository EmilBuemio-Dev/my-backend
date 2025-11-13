import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";
import resend from "./config/email.js";

// Routes
import archiveRoutes from "./routes/archiveRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import requirementRoutes from "./routes/requirementRoutes.js";
import registerRoutes from "./routes/registerRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import branchManagementRoutes from "./routes/branchManagementRoutes.js";
import leaveRoutes from './routes/leaveRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ===== ENV Verification =====
console.log("Loaded ENV:");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not Set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not Set");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "Set" : "Not Set");

// ✅ Verify Resend is initialized
if (process.env.RESEND_API_KEY) {
  console.log("✅ Resend email service is ready");
} else {
  console.warn("⚠️ RESEND_API_KEY not set - email functionality will not work");
}

// ===== Middleware =====
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Uploads folder =====
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ===== MongoDB connection =====
connectDB();

// ===== Static files =====
const publicDir = path.join(__dirname, "../public");
const frontendDir = path.join(__dirname, "../frontend/html");

console.log("\n\nFrontend directory path:", frontendDir);
console.log("Frontend directory exists:", fs.existsSync(frontendDir));

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log("✓ Static files served from:", publicDir);
}

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  console.log("✓ Static files served from:", frontendDir);
}

// ===== Routes =====
app.use("/archive", archiveRoutes);
app.use("/tickets", ticketRoutes);
app.use("/", attendanceRoutes);
app.use("/api/users", userRoutes);
app.use("/employees", employeeRoutes);
app.use("/api/branches", branchRoutes);
app.use("/accounts", accountRoutes);
app.use("/api/requirements", requirementRoutes);
app.use("/api/registers", registerRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/branches-management", branchManagementRoutes);
app.use('/', leaveRoutes);

// ===== Serve loginSection.html as home page =====
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "loginSection.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("<h1>Welcome to Mither System</h1>");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});