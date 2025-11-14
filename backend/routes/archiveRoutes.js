import express from "express";
import upload from "../middleware/upload.js";
import Archive from "../models/Archive.js";

const router = express.Router();

// ===== GET all archives =====
router.get("/", async (req, res) => {
  try {
    const archives = await Archive.find({}, "familyName firstName middleName badgeNo position credentials status createdAt");
    res.json(archives);
  } catch (err) {
    res.status(500).json({ message: "Failed to retrieve archives", error: err.message });
  }
});

// ===== SEARCH archives by multiple fields =====
router.get("/search", async (req, res) => {
  try {
    const { familyName, firstName, middleName, badgeNo } = req.query;
    
    // Build search query dynamically
    const searchQuery = {};
    if (familyName) searchQuery.familyName = { $regex: familyName, $options: "i" };
    if (firstName) searchQuery.firstName = { $regex: firstName, $options: "i" };
    if (middleName) searchQuery.middleName = { $regex: middleName, $options: "i" };
    if (badgeNo) searchQuery.badgeNo = { $regex: badgeNo, $options: "i" };

    if (Object.keys(searchQuery).length === 0) {
      return res.status(400).json({ message: "At least one search parameter is required" });
    }

    const archives = await Archive.find(searchQuery, "familyName firstName middleName badgeNo position credentials status createdAt");
    
    if (archives.length === 0) {
      return res.status(404).json({ message: "No archives found matching your search criteria" });
    }

    res.json(archives);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ message: "Failed to search archives", error: err.message });
  }
});

// ===== CREATE new archive =====
router.post(
  "/",
  upload.fields([
    { name: "barangayClearance" },
    { name: "policeClearance" },
    { name: "diClearance" },
    { name: "nbiClearance" },
    { name: "personalHistory" },
    { name: "residenceHistory" },
    { name: "maritalStatus" },
    { name: "physicalData" },
    { name: "educationData" },
    { name: "characterReference" },
    { name: "employmentHistory" },
    { name: "neighborhoodInvestigation" },
    { name: "militaryRecord" },
  ]),
  async (req, res) => {
    try {
      console.log("📝 Archive POST received");
      console.log("Body:", req.body);
      console.log("Files uploaded:", Object.keys(req.files || {}));

      const { familyName, firstName, middleName, badgeNo, position } = req.body;

      // ✅ Validate required fields
      if (!familyName || !firstName) {
        return res.status(400).json({ 
          message: "Family name and first name are required." 
        });
      }

      if (!badgeNo) {
        return res.status(400).json({ 
          message: "Badge number is required." 
        });
      }

      // ✅ Check if archive already exists
      const existing = await Archive.findOne({ badgeNo });
      if (existing) {
        return res.status(400).json({ 
          message: `Archive already exists for badge number ${badgeNo}.` 
        });
      }

      // ✅ Build folder path (must match upload.js logic)
      const folder = `${familyName.trim()}_${firstName.trim()}`
        .replace(/\s+/g, "_");

      // ✅ Helper function to build credential paths
      const makePath = (fieldname) => {
        if (req.files?.[fieldname]?.[0]) {
          return `${folder}/${req.files[fieldname][0].filename}`;
        }
        return "";
      };

      // ✅ Create new archive document
      const newArchive = new Archive({
        familyName: familyName.trim(),
        firstName: firstName.trim(),
        middleName: middleName?.trim() || "",
        badgeNo: badgeNo.trim(),
        position: position || "Guard",
        status: "Pending",
        credentials: {
          barangayClearance: makePath("barangayClearance"),
          policeClearance: makePath("policeClearance"),
          diClearance: makePath("diClearance"),
          nbiClearance: makePath("nbiClearance"),
          personalHistory: makePath("personalHistory"),
          residenceHistory: makePath("residenceHistory"),
          maritalStatus: makePath("maritalStatus"),
          physicalData: makePath("physicalData"),
          educationData: makePath("educationData"),
          characterReference: makePath("characterReference"),
          employmentHistory: makePath("employmentHistory"),
          neighborhoodInvestigation: makePath("neighborhoodInvestigation"),
          militaryRecord: makePath("militaryRecord"),
        },
      });

      const saved = await newArchive.save();
      
      console.log("✅ Archive created successfully:", {
        id: saved._id,
        name: `${saved.firstName} ${saved.familyName}`,
        badgeNo: saved.badgeNo,
        status: saved.status
      });

      res.status(201).json({ 
        message: "Archived credentials saved successfully!",
        archiveId: saved._id,
        data: {
          familyName: saved.familyName,
          firstName: saved.firstName,
          badgeNo: saved.badgeNo,
          status: saved.status
        }
      });

    } catch (err) {
      console.error("❌ Archive creation error:", {
        message: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });

      // Handle specific MongoDB errors
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ 
          message: `An archive with this ${field} already exists.` 
        });
      }

      res.status(500).json({ 
        message: "Failed to archive credentials", 
        error: err.message
      });
    }
  }
);

router.get("/:familyName", async (req, res) => {
  try {
    const archive = await Archive.findOne({ familyName: req.params.familyName });
    if (!archive) return res.status(404).json({ message: "Archive not found" });
    res.json(archive);
  } catch (err) {
    res.status(500).json({ message: "Failed to retrieve archive", error: err.message });
  }
});

export default router;