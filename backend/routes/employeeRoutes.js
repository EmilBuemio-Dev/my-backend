import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import Employee from "../models/Employee.js";
import Branch from "../models/Branch.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Helper Functions =====
function sanitizeData(obj) {
  if (!obj || typeof obj !== "object") return obj;
  for (const key in obj) {
    const val = obj[key];
    if (val === "" || val === null) obj[key] = "N/A";
    else if (typeof val === "object") sanitizeData(val);
  }
  return obj;
}

// ===== Proper Sanitization for Employee Data (Before sanitizeData) =====
function sanitizeEmployeeData(empData) {
  if (!empData) return empData;

  // Remove/null out date fields that are "N/A" or empty BEFORE general sanitization
  if (empData.basicInformation) {
    if (empData.basicInformation.expiryDate === "N/A" || empData.basicInformation.expiryDate === "") {
      empData.basicInformation.expiryDate = null;
    }
    // Ensure status is valid
    if (!["Active", "Pending"].includes(empData.basicInformation.status)) {
      empData.basicInformation.status = "Active";
    }
  }

  if (empData.personalData) {
    if (empData.personalData.dateOfBirth === "N/A" || empData.personalData.dateOfBirth === "") {
      empData.personalData.dateOfBirth = null;
    }
  }

  return empData;
}

function ensureUploadPath(folder) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  return folder;
}

// ===== Multer Storage for Employee Credentials =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const employeeName = (req.body.name || "unknown").replace(/\s+/g, "_");
    const dest = path.join(__dirname, "../../uploads", employeeName, "Credentials");
    ensureUploadPath(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}.pdf`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("Only PDFs allowed"), false);
    cb(null, true);
  },
});

// ===== Middleware to convert "N/A" to null (ONLY for specific date fields) =====
router.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const cleanDates = (obj) => {
      for (const key in obj) {
        if (key === "expiryDate" || key === "dateOfBirth") {
          if (obj[key] === "N/A" || obj[key] === "") {
            obj[key] = null;
          }
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          cleanDates(obj[key]);
        }
      }
    };
    cleanDates(req.body);
  }
  next();
});

// Array of allowed credential fields
const credentialFields = [
  "barangayClearance",
  "policeClearance",
  "diClearance",
  "nbiClearance",
  "personalHistory",
  "residenceHistory",
  "maritalStatus",
  "physicalData",
  "educationData",
  "characterReference",
  "employmentHistory",
  "neighborhoodInvestigation",
  "militaryRecord",
];

// Use multer.fields() to accept multiple files with specific field names
router.post(
  "/upload-credentials",
  upload.fields(credentialFields.map(name => ({ name, maxCount: 1 }))),
  async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const employeeName = (req.body.name || "unknown").replace(/\s+/g, "_");
      const urls = {};

      for (const key of Object.keys(req.files)) {
        const file = req.files[key][0];
        urls[key] = `/uploads/${employeeName}/Credentials/${file.filename}`;
      }

      // Optionally update employee document
      const employeeId = req.body.employeeId;
      if (employeeId) {
        const updateData = {};
        for (const key in urls) updateData[`employeeData.credentials.${key}`] = urls[key];

        const updatedEmployee = await Employee.findByIdAndUpdate(
          employeeId,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (!updatedEmployee) return res.status(404).json({ error: "Employee not found" });
      }

      res.status(200).json({ msg: "Files uploaded successfully", urls });
    } catch (err) {
      console.error("Error uploading credentials:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// CREATE employee
router.post("/", async (req, res) => {
  try {
    let { role, status, employeeData } = req.body;
    employeeData = employeeData || {};
    employeeData.basicInformation = employeeData.basicInformation || {};
    employeeData.personalData = employeeData.personalData || {};
    employeeData.educationalBackground = Array.isArray(employeeData.educationalBackground) ? employeeData.educationalBackground : [];
    employeeData.credentials = employeeData.credentials || {};
    employeeData.firearmsIssued = Array.isArray(employeeData.firearmsIssued) ? employeeData.firearmsIssued : [];

    // ✅ Step 1: Sanitize dates FIRST (before general sanitization)
    employeeData = sanitizeEmployeeData(employeeData);

    // ✅ Step 2: General sanitization (converts remaining empty values to "N/A")
    sanitizeData(employeeData);

    const personal = employeeData.personalData;
    if (personal.dateOfBirth && isNaN(Date.parse(personal.dateOfBirth))) {
      delete personal.dateOfBirth;
    }

    if (!personal.name || personal.name.trim() === "") {
      personal.name = `${personal.familyName || ""}, ${personal.firstName || ""} ${personal.middleName || ""}`.trim().replace(/\s+,/, ",") || "N/A";
    }

    const newEmployee = new Employee({
      role: role || "employee",
      status: status || "Active",
      employeeData,
    });

    const savedEmployee = await newEmployee.save();
    res.status(201).json({ msg: "Employee saved successfully", employee: savedEmployee });
  } catch (err) {
    console.error("❌ Error creating employee:", err);
    res.status(400).json({ error: err.message });
  }
});

// GET all employees
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.email) query["employeeData.personalData.email"] = req.query.email;
    const employees = await Employee.find(query).lean();
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one employee
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.status(200).json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET employees by branchId
router.get("/branch/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;

    let employees = await Employee.find({ "employeeData.basicInformation.branch": branchId }).lean();

    if (!employees.length) {
      const branchDoc = await Branch.findById(branchId).lean();
      if (branchDoc) {
        employees = await Employee.find({
          "employeeData.basicInformation.branch": branchDoc.branchData.branch
        }).lean();
      }
    }

    if (!employees.length) {
      return res.status(404).json({ msg: "No guards found for this branch." });
    }

    res.status(200).json(employees);
  } catch (err) {
    console.error("❌ Error fetching guards by branch:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/leave-requests/employee/:employeeId", authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId).lean();

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const name = employee.employeeData?.personalData?.name || "N/A";
    const contactNumber = employee.employeeData?.basicInformation?.celNo || "N/A";
    const branch = employee.employeeData?.basicInformation?.branch || "N/A";

    res.json({ name, contactNumber, branch });
  } catch (err) {
    console.error("Error fetching employee data:", err);
    res.status(500).json({ message: "Failed to fetch employee info" });
  }
});

// UPDATE employee
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { employeeData } = req.body;
    if (!employeeData?.personalData?.name?.trim()) {
      return res.status(400).json({ error: "Full Name is required" });
    }

    // Convert date properly
    if (employeeData.personalData.dateOfBirth) {
      const d = new Date(employeeData.personalData.dateOfBirth);
      if (!isNaN(d)) employeeData.personalData.dateOfBirth = d;
      else delete employeeData.personalData.dateOfBirth;
    }

    // Fix cell number key
    if (employeeData.basicInformation.cellNo) {
      employeeData.basicInformation.celNo = employeeData.basicInformation.cellNo;
      delete employeeData.basicInformation.cellNo;
    }

    // Prepare dot-notation update to avoid overwriting entire object
    const updateFields = {};
    for (const [section, data] of Object.entries(employeeData)) {
      for (const [key, val] of Object.entries(data)) {
        if (val && val !== "N/A") {
          updateFields[`employeeData.${section}.${key}`] = val;
        }
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "Employee not found" });
    res.status(200).json({ msg: "Employee updated successfully", employee: updated });
  } catch (err) {
    console.error("❌ Error updating employee:", err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE employee
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Employee not found" });
    res.status(200).json({ msg: "Employee deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;