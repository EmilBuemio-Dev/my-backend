import express from "express";
import Register from "../models/Register.js";
import Archive from "../models/Archive.js";

const router = express.Router();

// Create new registration with duplicate validation
router.post("/", async (req, res) => {
  try {
    const { badgeNo, email } = req.body;

    // Validate required fields
    if (!badgeNo || !email) {
      return res.status(400).json({ msg: "Badge number and email are required." });
    }

    // Check if badge number already exists in Register collection
    const existingBadge = await Register.findOne({ badgeNo });
    if (existingBadge) {
      return res.status(409).json({ 
        msg: "This SSS number is already registered. Please use a different SSS number." 
      });
    }

    // Check if email already exists in Register collection
    const existingEmail = await Register.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ 
        msg: "This email is already registered. Please use a different email." 
      });
    }

    // If no duplicates, proceed with registration
    const registerData = req.body;
    const newRegister = new Register(registerData);
    await newRegister.save();
    
    res.status(201).json({ 
      msg: "Registration successful", 
      register: newRegister 
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ msg: "Server error during registration" });
  }
});

// Get all registered users
router.get("/", async (req, res) => {
  try {
    const registers = await Register.find();
    res.status(200).json(registers);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch registrations" });
  }
});

// Search by name and badge number + auto status update
router.get("/search", async (req, res) => {
  try {
    const { familyName, firstName, middleName, badgeNo } = req.query;

    // Validate inputs
    if (!familyName || !firstName || !badgeNo) {
      return res.status(400).json({ msg: "familyName, firstName, and badgeNo are required." });
    }

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
      return res.status(404).json({ msg: "No matching employee found." });
    }

    // Automatically update status in Archive if found
    const archiveUpdate = await Archive.findOneAndUpdate(
      { familyName, firstName, badgeNo },
      { status: "Registered" },
      { new: true }
    );

    // Also update Register collection's status (optional)
    register.status = "Registered";
    await register.save();

    res.status(200).json({
      msg: "Registered employee found and status updated.",
      register,
      archiveUpdated: !!archiveUpdate,
    });
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ msg: "Server error while fetching employee data." });
  }
});

export default router;