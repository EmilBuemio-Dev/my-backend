import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import Employee from "../models/Employee.js";
import Branch from "../models/Branch.js";
import { authMiddleware } from "../middleware/auth.js";

const parseForm = multer().none();
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

function sanitizeEmployeeData(empData) {
  if (!empData) return empData;

  if (empData.basicInformation) {
    if (empData.basicInformation.expiryDate === "N/A" || empData.basicInformation.expiryDate === "") {
      empData.basicInformation.expiryDate = null;
    }
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
    // Use fieldname for credential files
    cb(null, `${file.fieldname}.pdf`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs allowed"), false);
    }
    cb(null, true);
  },
});

// ===== Middleware to convert "N/A" to null =====
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

// ===== Upload Credentials Endpoint =====
router.post(
  "/upload-credentials",
  authMiddleware,
  upload.fields(credentialFields.map(name => ({ name, maxCount: 1 }))),
  async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const employeeName = (req.body.name || "unknown").replace(/\s+/g, "_");
      const employeeId = req.body.employeeId;
      const urls = {};

      // Build URLs for uploaded files
      for (const key of Object.keys(req.files)) {
        const file = req.files[key][0];
        urls[key] = `/uploads/${employeeName}/Credentials/${file.filename}`;
      }

      // Update employee document if employeeId is provided
      if (employeeId) {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          return res.status(404).json({ error: "Employee not found" });
        }

        // Merge new credentials with existing ones
        const existingCreds = employee.employeeData?.credentials || {};
        const updatedCreds = { ...existingCreds, ...urls };

        const updatedEmployee = await Employee.findByIdAndUpdate(
          employeeId,
          { 
            $set: { 
              "employeeData.credentials": updatedCreds 
            } 
          },
          { new: true, runValidators: true }
        );

        return res.status(200).json({ 
          msg: "Files uploaded and employee updated successfully", 
          urls,
          credentials: updatedCreds
        });
      }

      // If no employeeId, just return the URLs
      res.status(200).json({ msg: "Files uploaded successfully", urls });
    } catch (err) {
      console.error("Error uploading credentials:", err);
      res.status(500).json({ error: "Server error: " + err.message });
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

    employeeData = sanitizeEmployeeData(employeeData);
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

// GET leave requests for employee
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

// PATCH (Update) employee
router.patch("/:id", authMiddleware, parseForm, async (req, res) => {
  try {
    const id = req.params.id;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    let employeeData = {};

    if (req.body.employeeData) {
      if (typeof req.body.employeeData === "string") {
        try {
          employeeData = JSON.parse(req.body.employeeData);
        } catch (err) {
          return res.status(400).json({ error: "Invalid JSON in employeeData" });
        }
      } else if (typeof req.body.employeeData === "object") {
        employeeData = req.body.employeeData;
      } else {
        return res.status(400).json({ error: "employeeData must be an object or JSON string" });
      }
    } else {
      return res.status(400).json({ error: "employeeData field is missing" });
    }

    const updateFields = {};

    const objectFields = [
      "basicInformation",
      "personalData",
      "governmentIds",
      "contactInfo",
      "emergencyContact",
      "workInformation",
      "createdBy"
    ];

    const arrayFields = [
      "educationalBackground",
      "firearmsIssued"
    ];

    // Handle object fields (merge them)
    objectFields.forEach(field => {
      if (employeeData[field]) {
        updateFields[`employeeData.${field}`] = {
          ...employee.employeeData[field]?.toObject?.() || employee.employeeData[field] || {},
          ...employeeData[field],
        };
      }
    });

    // Handle array fields (replace them completely)
    arrayFields.forEach(field => {
      if (employeeData[field] !== undefined) {
        updateFields[`employeeData.${field}`] = Array.isArray(employeeData[field]) 
          ? employeeData[field] 
          : [];
      }
    });

    // Handle credentials separately - merge with existing
    if (employeeData.credentials) {
      const existingCreds = employee.employeeData?.credentials || {};
      updateFields[`employeeData.credentials`] = {
        ...existingCreds,
        ...employeeData.credentials
      };
    }

    // Handle workHistory
    if (employeeData.workHistory) {
      updateFields[`employeeData.workHistory`] = Array.isArray(employeeData.workHistory)
        ? employeeData.workHistory
        : [];
    }

    // Always update updatedBy
    updateFields["employeeData.updatedBy"] = {
      user: req.user._id,
      name: req.user.name,
      timestamp: new Date(),
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Employee updated successfully",
      updatedEmployee,
    });

  } catch (err) {
    console.error("❌ Error updating employee:", err);
    res.status(500).json({ error: err.message || "Internal server error during update" });
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