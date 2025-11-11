import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";
import transporter from "./config/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log("Loaded ENV:");
console.log("PORT:", process.env.PORT);

transporter.verify((err, success) => {
  if (err) {
    console.error("Email transporter failed:", err);
  } else {
    console.log("Email transporter is ready");
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads folder
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// MongoDB connection
connectDB();

// Load and register routes with detailed error handling
const routeFiles = [
  { name: "archiveRoutes", path: "./routes/archiveRoutes.js", mount: "/archive" },
  { name: "ticketRoutes", path: "./routes/ticketRoutes.js", mount: "/tickets" },
  { name: "attendanceRoutes", path: "./routes/attendanceRoutes.js", mount: "/attendance" },
  { name: "userRoutes", path: "./routes/userRoutes.js", mount: "/api/users" },
  { name: "employeeRoutes", path: "./routes/employeeRoutes.js", mount: "/employees" },
  { name: "branchRoutes", path: "./routes/branchRoutes.js", mount: "/api/branches" },
  { name: "accountRoutes", path: "./routes/accountRoutes.js", mount: "/accounts" },
  { name: "requirementRoutes", path: "./routes/requirementRoutes.js", mount: "/api/requirements" },
  { name: "registerRoutes", path: "./routes/registerRoutes.js", mount: "/api/registers" },
  { name: "emailRoutes", path: "./routes/emailRoutes.js", mount: "/api/email" },
  { name: "branchManagementRoutes", path: "./routes/branchManagementRoutes.js", mount: "/api/branches-management" },
  { name: "leaveRoutes", path: "./routes/leaveRoutes.js", mount: "/api/leave" },
];

for (const route of routeFiles) {
  try {
    console.log(`\n[${route.name}] Loading...`);
    const routeModule = await import(route.path);
    const routeHandler = routeModule.default;
    
    console.log(`[${route.name}] Mounting on ${route.mount}...`);
    app.use(route.mount, routeHandler);
    console.log(`✓ ${route.name} loaded successfully`);
  } catch (err) {
    console.error(`\n✗ CRITICAL ERROR in ${route.name}:`);
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

// Serve static files
const frontendDir = path.join(__dirname, "../frontend/html");
console.log("\n\nFrontend directory path:", frontendDir);
console.log("Frontend directory exists:", fs.existsSync(frontendDir));

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  console.log("✓ Static files served from:", frontendDir);
}

// Routes for specific pages
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "loginSection.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("<h1>Welcome to Mither System</h1>");
  }
});

app.get("/admin", (req, res) => {
  const filePath = path.join(frontendDir, "admin.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("admin.html not found");
  }
});

app.get("/hr", (req, res) => {
  const filePath = path.join(frontendDir, "hr_login.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("hr_login.html not found");
  }
});

app.get("/employee", (req, res) => {
  const filePath = path.join(frontendDir, "employee_login.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("employee_login.html not found");
  }
});

app.get("/client", (req, res) => {
  const filePath = path.join(frontendDir, "client_login.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("client_login.html not found");
  }
});

// Fallback for SPA routing - MUST use app.use(), not app.get()
app.use((req, res) => {
  const filePath = path.join(frontendDir, "loginSection.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Middleware error:", err);
  res.status(500).json({ message: err.message });
});

try {
  app.listen(PORT, () => {
    console.log(`\n✓ Server running at http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("Failed to start server:", err);
}