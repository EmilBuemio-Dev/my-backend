import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Helper to ensure upload folder exists =====
function ensureUploadPath(folder = "general") {
  const dest = path.join(__dirname, "../../uploads", folder);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`✅ Created upload folder: ${dest}`);
  }
  return dest;
}

// ===== File naming map for credentials =====
const credentialFiles = {
  barangayClearance: "barangay.pdf",
  policeClearance: "police.pdf",
  diClearance: "di.pdf",
  nbiClearance: "nbi.pdf",
  personalHistory: "personalHistory.pdf",
  residenceHistory: "residenceHistory.pdf",
  maritalStatus: "maritalStatus.pdf",
  physicalData: "physicalData.pdf",
  educationData: "educationData.pdf",
  characterReference: "characterReference.pdf",
  employmentHistory: "employmentHistory.pdf",
  neighborhoodInvestigation: "neighborhoodInvestigation.pdf",
  militaryRecord: "militaryRecord.pdf",
};

// ===== Multer Storage Configuration =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder;

    console.log("📁 Upload request detected:");
    console.log("   Field:", file.fieldname);
    console.log("   Body name:", req.body.name);
    console.log("   Body familyName:", req.body.familyName);
    console.log("   Body firstName:", req.body.firstName);

    // ✅ Employee profile upload → "employee_profiles" folder
    if (file.fieldname === "employeeProfile") {
      folder = "employee_profiles";
    }
    // ✅ Client profile upload → "client_profiles" folder
    else if (file.fieldname === "profileImage") {
      folder = "client_profiles";
    }
    // ✅ Attendance photo → "attendance" folder
    else if (file.fieldname === "checkinImage") {
      folder = "attendance";
    }
    // ✅ CLIENT CONTRACT UPLOAD - Use client name as folder
    else if (file.fieldname === "contract") {
      if (req.body.name) {
        const clientName = req.body.name.trim().replace(/[,\s]+/g, "_");
        folder = `${clientName}_contracts`;
        console.log("   ✅ Detected CLIENT contract upload");
        console.log("   Client name:", clientName);
        console.log("   Folder:", folder);
      } else {
        folder = "contracts"; // Fallback
        console.log("   ⚠️ No client name found, using generic contracts folder");
      }
    }
    // ✅ Employee credentials (when editing existing employee)
    else if (credentialFiles[file.fieldname]) {
      let employeeName = "unknown";

      // Try to get name from req.body.name first
      if (req.body.name) {
        employeeName = req.body.name.trim().replace(/[,\s]+/g, "_");
        console.log("   ✅ Using name from req.body.name:", employeeName);
      }
      // If not available, try parsing employeeData JSON
      else if (req.body.employeeData) {
        try {
          const parsed = typeof req.body.employeeData === 'string' 
            ? JSON.parse(req.body.employeeData)
            : req.body.employeeData;
          
          if (parsed.personalData?.name) {
            employeeName = parsed.personalData.name
              .trim()
              .replace(/[,\s]+/g, "_");
            console.log("   ✅ Parsed name from employeeData:", employeeName);
          }
        } catch (err) {
          console.log("   ⚠️ Failed to parse employeeData:", err.message);
        }
      }
      // Fallback to familyName + firstName (for applicants)
      else if (req.body.familyName && req.body.firstName) {
        const familyName = req.body.familyName.trim();
        const firstName = req.body.firstName.trim();
        employeeName = `${familyName}_${firstName}`.replace(/[,\s]+/g, "_");
        console.log("   ✅ Using familyName + firstName:", employeeName);
      }

      folder = employeeName;
      console.log("   📁 Final folder:", folder);
    }
    // ✅ Fallback
    else {
      folder = "general";
      console.log("   ⚠️ Using general folder");
    }

    const dest = ensureUploadPath(folder);
    console.log("   📍 Destination:", dest);
    cb(null, dest);
  },

  filename: (req, file, cb) => {
    // ✅ Employee profile image
    if (file.fieldname === "employeeProfile") {
      return cb(
        null,
        `profile-${Date.now()}${path.extname(file.originalname)}`
      );
    }

    // ✅ Client profile image
    if (file.fieldname === "profileImage") {
      return cb(
        null,
        `profile-${Date.now()}${path.extname(file.originalname)}`
      );
    }

    // ✅ Attendance photo
    if (file.fieldname === "checkinImage") {
      return cb(
        null,
        `checkin-${Date.now()}${path.extname(file.originalname)}`
      );
    }

    // ✅ CLIENT CONTRACT - Use descriptive filename
    if (file.fieldname === "contract") {
      return cb(
        null,
        `contract${path.extname(file.originalname)}`
      );
    }

    // ✅ Credential files (both applicant and employee)
    const filename =
      credentialFiles[file.fieldname] ||
      `document-${Date.now()}${path.extname(file.originalname)}`;

    console.log("   📄 Filename:", filename);
    cb(null, filename);
  },
});

// ===== File Filter (Accept only PDFs and images) =====
const fileFilter = (req, file, cb) => {
  // Allow PDFs for credentials and contracts
  if (file.mimetype === "application/pdf") {
    return cb(null, true);
  }

  // Allow DOC/DOCX for contracts
  if (file.fieldname === "contract" && 
      (file.mimetype === "application/msword" || 
       file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    return cb(null, true);
  }

  // Allow images for profiles and attendance
  if (file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  // Reject other file types
  console.log("❌ Rejected file type:", file.mimetype);
  cb(new Error(`File type not allowed: ${file.mimetype}`));
};

// ===== Multer Instance =====
const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

export default upload;