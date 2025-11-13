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
const frontendDir = path.join(__dirname, "../frontend");
const publicDir = path.join(__dirname, "../public");

console.log("\n========== STATIC FILES CONFIGURATION ==========");
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

// ===== Dynamic HTML Routes - Handles all HTML files automatically =====
const htmlDir = path.join(frontendDir, "html");

// Function to serve HTML files dynamically
const serveHtmlFile = (req, res, filename) => {
  const filePath = path.join(htmlDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      error: `${filename} not found`,
      looked_in: filePath
    });
  }
};

// Generic route: /pagename or /pagename.html serves pagename.html
app.get("/:page", (req, res) => {
  const page = req.params.page;
  
  // Skip if it looks like an API route or special path
  if (page.startsWith("api") || page === "uploads") {
    return res.status(404).json({ error: "Not Found" });
  }
  
  // Check if file exists with .html extension
  let htmlFile = page.endsWith(".html") ? page : `${page}.html`;
  const filePath = path.join(htmlDir, htmlFile);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      error: `${htmlFile} not found`,
      looked_in: filePath
    });
  }
});

// ===== Serve loginSection.html as home page =====
app.get("/", (req, res) => {
  serveHtmlFile(req, res, "loginSection.html");
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
  console.log(`👤 Employee Dashboard at: http://localhost:${PORT}/employeedashboard`);
  console.log(`💡 Tip: Any .html file in /frontend/html can be accessed by name (e.g., /archiveReq, /account.html)`);
});