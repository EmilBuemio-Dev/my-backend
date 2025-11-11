import express from "express";
import bcrypt from "bcryptjs";
import Branch from "../models/Branch.js";
import BranchName from "../models/BranchManagement.js";

const router = express.Router();

// ===== CREATE NEW CLIENT BRANCH =====
router.post("/", async (req, res) => {
  try {
    let { name, email, role, clientIdNumber, contract, credentials, guardShift, branchData } = req.body;

    name = name || branchData?.name || "N/A";
    email = email || branchData?.email || "N/A";
    const branchName = branchData?.branch || "N/A";

    if (!clientIdNumber) {
      return res.status(400).json({ message: "clientIdNumber is required" });
    }

    // ✅ Check if a branch with the same clientIdNumber already exists
    let existingBranch = await Branch.findOne({ clientIdNumber });

    // ✅ Hash password if provided
    let hashedPassword = "";
    if (branchData?.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(branchData.password, salt);
    }

    if (existingBranch) {
      // ✅ Update existing branch data
      existingBranch.role = role || existingBranch.role || "client";
      existingBranch.contract = contract || existingBranch.contract || "N/A";
      existingBranch.credentials = {
        ...existingBranch.credentials,
        ...credentials,
        profileImage: credentials?.profileImage || existingBranch.credentials?.profileImage || "/image/default-profile.png"
      };
      existingBranch.guardShift = guardShift || existingBranch.guardShift || { day: "N/A", night: "N/A" };
      existingBranch.branchData = {
        ...existingBranch.branchData,
        ...branchData,
        name,
        email,
        branch: branchName,
        password: hashedPassword || existingBranch.branchData?.password || "",
        contactNumber: branchData?.contactNumber || existingBranch.branchData?.contactNumber || "N/A"
      };
      existingBranch.salary = existingBranch.salary ?? null;
      existingBranch.expirationDate = existingBranch.expirationDate ?? null;

      await existingBranch.save();
      return res.json({ message: "Branch record updated successfully.", branch: existingBranch });
    }

    // ✅ If no existing record, create new branch
    const newBranch = new Branch({
      role: role || "client",
      clientIdNumber,
      contract: contract || "N/A",
      credentials: {
        ...credentials,
        profileImage: credentials?.profileImage || "/image/default-profile.png"
      },
      guardShift: guardShift || { day: "N/A", night: "N/A" },
      branchData: {
        ...branchData,
        name,
        email,
        branch: branchName,
        password: hashedPassword || "",
        contactNumber: branchData?.contactNumber || "N/A"
      },
      salary: null,
      expirationDate: null
    });

    await newBranch.save();
    res.status(201).json({ message: "Branch created successfully.", branch: newBranch });
  } catch (err) {
    console.error("❌ Branch creation/update error:", err);
    res.status(500).json({ message: err.message });
  }
});


// ===== GET ALL CLIENT BRANCHES =====
router.get("/", async (req, res) => {
  try {
    const branches = await Branch.find();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== GET SINGLE BRANCH =====
router.get("/:id", async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== PATCH UPDATE BRANCH DETAILS =====
router.patch("/:id", async (req, res) => {
  try {
    const updates = req.body;
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json({ message: "Branch updated successfully", branch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== UPDATE SALARY & EXPIRATION DATE =====
router.put("/:id", async (req, res) => {
  try {
    let { salary, expirationDate } = req.body;

    // ✅ Normalize salary
    if (!salary || salary === "N/A") salary = null;

    // ✅ Safely convert expirationDate to Date or null
    if (!expirationDate || expirationDate === "N/A" || expirationDate === "") {
      expirationDate = null;
    } else {
      expirationDate = new Date(expirationDate);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ message: "Invalid expiration date format" });
      }
    }

    // ✅ Update document safely
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { $set: { salary, expirationDate } },
      { new: true, runValidators: true }
    );

    if (!branch) return res.status(404).json({ message: "Branch not found" });

    res.json({
      message: "Salary and expiration date updated successfully",
      branch,
    });
  } catch (err) {
    console.error("❌ Branch update error:", err);
    res.status(500).json({ message: err.message });
  }
});


// ===== DELETE CLIENT BRANCH =====
router.delete("/:id", async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json({ message: "Branch deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== BRANCH MANAGEMENT (MODAL) =====
router.get("/management", async (req, res) => {
  try {
    const branches = await BranchName.find();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/management", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Branch name required" });

    const existing = await BranchName.findOne({ name });
    if (existing) return res.status(400).json({ message: "Branch already exists" });

    const newBranch = new BranchName({ name });
    await newBranch.save();
    res.status(201).json(newBranch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/management/:id", async (req, res) => {
  try {
    const branch = await BranchName.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json({ message: "Branch removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
