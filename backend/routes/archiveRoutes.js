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
      const { familyName, firstName, middleName, badgeNo, position } = req.body;
      if (!familyName || !firstName)
        return res.status(400).json({ message: "Family name and first name are required." });

      const existing = await Archive.findOne({ familyName, firstName, middleName });
      if (existing) return res.status(400).json({ message: "Archive already exists for this person." });

      const folder = `${familyName}_${firstName}`.trim().replace(/\s+/g, "_");
      const makePath = (field) =>
        req.files?.[field]?.[0] ? `${folder}/${req.files[field][0].filename}` : "";

      const newArchive = new Archive({
        familyName,
        firstName,
        middleName,
        badgeNo,
        position,
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

      await newArchive.save();
      res.status(201).json({ message: "Archived credentials saved successfully!" });
    } catch (err) {
      console.error("❌ Archive creation error:", err);
      res.status(500).json({ message: "Failed to archive credentials", error: err.message });
    }
  }
);

// ===== GET single archive by familyName =====
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
