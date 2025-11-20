import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureUploadPath(folder = "general") {
  const dest = path.join(__dirname, "../../uploads", folder);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`✅ Created upload folder: ${dest}`);
  }
  return dest;
}

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
    console.log("   Mimetype:", file.mimetype);

    // ✅ TICKET ATTACHMENT - Must come FIRST (Priority!)
    if (file.fieldname === "ticketAttachment") {
      folder = "ticket_attachments";
      console.log("   ✅ TICKET ATTACHMENT DETECTED → folder: ticket_attachments");
      const dest = ensureUploadPath(folder);
      console.log("   📍 Destination:", dest);
      console.log("   ✅ Will save to:", path.join(dest, file.originalname));
      return cb(null, dest);
    }
    // ✅ Employee profile upload → "employee_profiles" folder
    else if (file.fieldname === "employeeProfile") {
      folder = "employee_profiles";
      console.log("   ✅ Employee profile detected");
    }
    // ✅ Client profile upload → "client_profiles" folder
    else if (file.fieldname === "profileImage") {
      folder = "client_profiles";
      console.log("   ✅ Client profile detected");
    }
    // ✅ Attendance photo → "attendance" folder
    else if (file.fieldname === "checkinImage") {
      folder = "attendance";
      console.log("   ✅ Attendance photo detected");
    }
    // ✅ Client contract
    else if (file.fieldname === "contract") {
      if (req.body.name) {
        const clientName = req.body.name.trim().replace(/[,\s]+/g, "_");
        folder = `${clientName}_contracts`;
        console.log("   ✅ Detected CLIENT contract upload");
        console.log("   Client name:", clientName);
        console.log("   Folder:", folder);
      } else {
        folder = "contracts";
        console.log("   ⚠️ No client name found, using generic contracts folder");
      }
    }
    // ✅ Employee credentials (when editing existing employee)
    else if (credentialFiles[file.fieldname]) {
      let employeeName = "unknown";

      if (req.body.name) {
        employeeName = req.body.name.trim().replace(/[,\s]+/g, "_");
        console.log("   ✅ Using name from req.body.name:", employeeName);
      } else if (req.body.employeeData) {
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
      } else if (req.body.familyName && req.body.firstName) {
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
    console.log("📄 Generating filename for:", file.fieldname);

    // ✅ TICKET ATTACHMENT - Unique timestamp-based filename
    if (file.fieldname === "ticketAttachment") {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const ext = path.extname(file.originalname);
      const filename = `ticket-${timestamp}-${random}${ext}`;
      console.log(`   ✅ Ticket filename generated: ${filename}`);
      return cb(null, filename);
    }

    // ✅ Employee profile image
    if (file.fieldname === "employeeProfile") {
      const filename = `profile-${Date.now()}${path.extname(file.originalname)}`;
      console.log(`   ✅ Employee profile filename: ${filename}`);
      return cb(null, filename);
    }

    // ✅ Client profile image
    if (file.fieldname === "profileImage") {
      const filename = `profile-${Date.now()}${path.extname(file.originalname)}`;
      console.log(`   ✅ Client profile filename: ${filename}`);
      return cb(null, filename);
    }

    // ✅ Attendance photo
    if (file.fieldname === "checkinImage") {
      const filename = `checkin-${Date.now()}${path.extname(file.originalname)}`;
      console.log(`   ✅ Attendance filename: ${filename}`);
      return cb(null, filename);
    }

    // ✅ CLIENT CONTRACT - Use descriptive filename
    if (file.fieldname === "contract") {
      const filename = `contract${path.extname(file.originalname)}`;
      console.log(`   ✅ Contract filename: ${filename}`);
      return cb(null, filename);
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
  console.log(`🔍 File filter check: ${file.fieldname}`);
  console.log(`   Mimetype: ${file.mimetype}`);
  console.log(`   Original name: ${file.originalname}`);

  // Allow images for ticket attachments
  if (file.fieldname === "ticketAttachment") {
    console.log(`   Checking if image...`);
    
    if (file.mimetype.startsWith("image/")) {
      console.log(`   ✅ TICKET IMAGE ACCEPTED: ${file.mimetype}`);
      return cb(null, true);
    } else {
      console.log(`   ❌ TICKET FILE REJECTED: ${file.mimetype} (only images allowed)`);
      return cb(new Error(`Only image files allowed for tickets. Received: ${file.mimetype}`));
    }
  }

  // Allow PDFs for credentials and contracts
  if (file.mimetype === "application/pdf") {
    console.log(`   ✅ PDF accepted`);
    return cb(null, true);
  }

  if (file.fieldname === "contract" && 
      (file.mimetype === "application/msword" || 
       file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    console.log(`   ✅ Word document accepted`);
    return cb(null, true);
  }

  // Allow images for profiles and attendance
  if (file.mimetype.startsWith("image/")) {
    console.log(`   ✅ Image accepted: ${file.mimetype}`);
    return cb(null, true);
  }

  console.log(`   ❌ File type rejected: ${file.mimetype}`);
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