import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";
import transporter from "./config/email.js";

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
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);

transporter.verify((err, success) => {
  if (err) console.error("Email transporter failed:", err);
  else console.log("Email transporter is ready");
});

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
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

// ===== MongoDB connection =====
connectDB();

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

// ===== Serve static frontend files =====
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

// ===== Serve loginSection.html as homepage =====
// Serve loginSection.html as homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "loginSection.html"));
});

// Fallback for any other frontend route
app.get("/*", (req, res) => {
  res.sendFile(path.join(publicDir, "loginSection.html"));
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
