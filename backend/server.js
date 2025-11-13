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
console.log("\n========== ENVIRONMENT VERIFICATION ==========");
console.log("PORT:", process.env.PORT || "5000 (default)");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Not Set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Not Set");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ Set" : "❌ NOT SET - EMAIL WON'T WORK!");
console.log("=============================================\n");

// ✅ Verify Resend is initialized
if (process.env.RESEND_API_KEY) {
  console.log("✅ Resend email service is ready");
  console.log("📧 Using Resend API Key (first 10 chars):", process.env.RESEND_API_KEY.substring(0, 10) + "...");
} else {
  console.error("❌ RESEND_API_KEY not set in environment - EMAIL FUNCTIONALITY WILL NOT WORK");
  console.error("📝 Add this to your .env file:");
  console.error("   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx");
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

// ===== Static Files - FIXED FOR BOTH HOSTINGER AND RENDER =====
// For Render: backend is at root/backend, frontend at root/frontend
// For Hostinger: same structure
const frontendDir = path.join(__dirname, "../frontend");
const publicDir = path.join(__dirname, "../public");

console.log("\n========== STATIC FILES CONFIGURATION ==========");
console.log("Current __dirname:", __dirname);
console.log("Frontend Dir:", frontendDir);
console.log("Public Dir:", publicDir);

// Serve static files from frontend directory (HTML, CSS, JS, Images)
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  console.log("✓ Frontend files served from:", frontendDir);
} else {
  console.warn("⚠ Frontend directory not found:", frontendDir);
}

// Serve static files from public directory as fallback
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log("✓ Public files served from:", publicDir);
} else {
  console.warn("⚠ Public directory not found:", publicDir);
}

console.log("==============================================\n");

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

// ===== Health Check Endpoint =====
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Server is running",
    resendConfigured: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ===== Serve dashboard.html directly =====
app.get("/dashboard", (req, res) => {
  const dashboardPath = path.join(frontendDir, "html", "dashboard.html");
  console.log("Attempting to serve dashboard from:", dashboardPath);
  console.log("File exists:", fs.existsSync(dashboardPath));
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).json({ 
      error: "Dashboard not found",
      looked_in: dashboardPath,
      frontend_dir_exists: fs.existsSync(frontendDir),
      frontend_contents: fs.existsSync(frontendDir) ? fs.readdirSync(frontendDir) : "N/A"
    });
  }
});

// ===== Serve dashboard.html as .html route =====
app.get("/dashboard.html", (req, res) => {
  const dashboardPath = path.join(frontendDir, "html", "dashboard.html");
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).json({ error: "Dashboard not found" });
  }
});

// ===== Serve loginSection.html as home page =====
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "html", "loginSection.html");
  console.log("Attempting to serve index from:", indexPath);
  console.log("File exists:", fs.existsSync(indexPath));
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("<h1>Welcome to Mither System</h1>");
  }
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    requested_path: req.path,
    message: "Please check the URL and try again"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Dashboard at: http://localhost:${PORT}/dashboard`);
});