import express from "express";
import Register from "../models/Register.js";
import Archive from "../models/Archive.js";

const router = express.Router();

// ===== CREATE new registration with 3-layer validation =====
router.post("/", async (req, res) => {
  try {
    const { badgeNo, email, familyName, firstName, middleName } = req.body;

    // Validate required fields
    if (!badgeNo || !email || !familyName || !firstName) {
      return res.status(400).json({ 
        msg: "Badge number, email, family name, and first name are required." 
      });
    }

    console.log("📋 Registration request:", { badgeNo, email, familyName, firstName });

    // ===== LAYER 1: Check if badge number already exists in Register collection =====
    console.log("LAYER 1: Checking Register collection for duplicate badge number...");
    const existingBadgeInRegister = await Register.findOne({ badgeNo });
    if (existingBadgeInRegister) {
      console.log("❌ LAYER 1 FAILED: Badge already registered");
      return res.status(409).json({ 
        msg: "This SSS number is already registered. Please use a different SSS number.",
        code: "BADGE_ALREADY_REGISTERED"
      });
    }
    console.log("✅ LAYER 1 PASSED: Badge not in Register collection");

    // ===== LAYER 2: Check if badge number exists in Archive collection =====
    console.log("LAYER 2: Checking Archive collection for employee record...");
    const archiveRecord = await Archive.findOne({ badgeNo });
    if (!archiveRecord) {
      console.log("❌ LAYER 2 FAILED: Badge not found in Archive");
      return res.status(404).json({ 
        msg: "SSS number not found in employee records. Cannot register.",
        code: "BADGE_NOT_IN_ARCHIVE"
      });
    }
    console.log("✅ LAYER 2 PASSED: Badge found in Archive");

    // ===== LAYER 3: Verify badge details match archive =====
    console.log("LAYER 3: Verifying badge details match archive record...");
    const nameMatch = 
      archiveRecord.familyName.toLowerCase() === familyName.toLowerCase() &&
      archiveRecord.firstName.toLowerCase() === firstName.toLowerCase();
    
    if (!nameMatch) {
      console.log("❌ LAYER 3 FAILED: Name doesn't match archive record");
      return res.status(400).json({ 
        msg: "The name provided does not match the employee record for this SSS number.",
        code: "NAME_MISMATCH"
      });
    }
    console.log("✅ LAYER 3 PASSED: Name matches archive record");

    // ===== EMAIL VALIDATION: Check if email already exists in Register collection =====
    console.log("EMAIL VALIDATION: Checking Register collection for duplicate email...");
    const existingEmail = await Register.findOne({ email });
    if (existingEmail) {
      console.log("❌ EMAIL VALIDATION FAILED: Email already registered");
      return res.status(409).json({ 
        msg: "This email is already registered. Please use a different email.",
        code: "EMAIL_ALREADY_REGISTERED"
      });
    }
    console.log("✅ EMAIL VALIDATION PASSED: Email not registered yet");

    // ===== ALL VALIDATIONS PASSED: Create registration =====
    console.log("🎯 All validations passed! Creating registration...");
    
    const registerData = {
      badgeNo: badgeNo.trim(),
      email: email.toLowerCase().trim(),
      familyName: familyName.trim(),
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      status: "Active"
    };

    const newRegister = new Register(registerData);
    const savedRegister = await newRegister.save();
    
    // Update Archive status to "Registered"
    await Archive.findOneAndUpdate(
      { badgeNo },
      { status: "Registered" },
      { new: true }
    );

    console.log("✅ Registration created successfully:", {
      id: savedRegister._id,
      name: `${savedRegister.firstName} ${savedRegister.familyName}`,
      badgeNo: savedRegister.badgeNo,
      email: savedRegister.email
    });

    res.status(201).json({ 
      msg: "Registration successful! Account activation details have been sent to your email.",
      register: {
        _id: savedRegister._id,
        badgeNo: savedRegister.badgeNo,
        email: savedRegister.email,
        familyName: savedRegister.familyName,
        firstName: savedRegister.firstName,
        status: savedRegister.status
      }
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ 
        msg: `This ${field} is already registered.`,
        code: "DUPLICATE_FIELD"
      });
    }

    res.status(500).json({ 
      msg: "Server error during registration. Please try again later.",
      code: "SERVER_ERROR"
    });
  }
});

// ===== GET all registered users =====
router.get("/", async (req, res) => {
  try {
    const badgeNo = req.query.badgeNo;
    const email = req.query.email;

    let query = {};

    // If query params provided, search; otherwise return all
    if (badgeNo) {
      query.badgeNo = { $regex: badgeNo, $options: "i" };
    }
    if (email) {
      query.email = { $regex: email, $options: "i" };
    }

    const registers = await Register.find(query);
    res.status(200).json(registers);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch registrations" });
  }
});

// ===== SEARCH by name and badge number + auto status update =====
router.get("/search", async (req, res) => {
  try {
    const { familyName, firstName, middleName, badgeNo } = req.query;

    // Validate inputs
    if (!familyName || !firstName || !badgeNo) {
      return res.status(400).json({ msg: "familyName, firstName, and badgeNo are required." });
    }

    console.log("🔍 Searching for registered employee:", { familyName, firstName, badgeNo });

    // Build the search filter
    const query = {
      familyName: { $regex: new RegExp(`^${familyName}$`, "i") },
      firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
      badgeNo,
    };

    if (middleName) {
      query.middleName = { $regex: new RegExp(`^${middleName}$`, "i") };
    }

    // Find the record in Register
    const register = await Register.findOne(query);

    if (!register) {
      console.log("❌ No matching registered employee found");
      return res.status(404).json({ msg: "No matching registered employee found." });
    }

    console.log("✅ Employee found:", { name: `${register.firstName} ${register.familyName}` });

    // Automatically update status in Archive if found
    const archiveUpdate = await Archive.findOneAndUpdate(
      { badgeNo },
      { status: "Registered" },
      { new: true }
    );

    // Also update Register collection's status if not already
    if (register.status !== "Registered") {
      register.status = "Registered";
      await register.save();
    }

    res.status(200).json({
      msg: "Registered employee found and status updated.",
      register: {
        _id: register._id,
        badgeNo: register.badgeNo,
        email: register.email,
        familyName: register.familyName,
        firstName: register.firstName,
        middleName: register.middleName,
        status: register.status
      },
      archiveUpdated: !!archiveUpdate,
    });
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ msg: "Server error while fetching employee data." });
  }
});

export default router;