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

// ===== File naming map for applicant credentials =====
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
    // ✅ Applicant credentials → applicant-specific folder
    // FIX: Use familyName_firstName instead of name
    else {
      const familyName = req.body.familyName?.trim() || "general";
      const firstName = req.body.firstName?.trim() || "applicant";
      folder = `${familyName}_${firstName}`.replace(/\s+/g, "_");
    }

    const dest = ensureUploadPath(folder);
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

    // ✅ Applicant credential (default)
    const filename =
      credentialFiles[file.fieldname] ||
      `document-${Date.now()}${path.extname(file.originalname)}`;

    cb(null, filename);
  },
});

// ===== File Filter (Accept only PDFs and images) =====
const fileFilter = (req, file, cb) => {
  // Allow PDFs for credentials
  if (file.mimetype === "application/pdf") {
    return cb(null, true);
  }

  // Allow images for profiles and attendance
  if (file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  // Reject other file types
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