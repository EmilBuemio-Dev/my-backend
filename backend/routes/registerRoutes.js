import express from "express";
import Register from "../models/Register.js";
import Archive from "../models/Archive.js";
import { enrollFace, verifyFace } from "../services/faceService.js";

const router = express.Router();

// CREATE registration with face descriptor
router.post("/", async (req, res) => {
  try {
    const {
      badgeNo,
      email,
      familyName,
      firstName,
      middleName,
      faceImageBase64,
    } = req.body;

    // Validate required fields
    if (!badgeNo || !email || !familyName || !firstName || !faceImageBase64) {
      return res.status(400).json({
        msg: "Badge number, email, family name, first name, and face image are required.",
      });
    }

    console.log("📋 Registration request:", { badgeNo, email, familyName, firstName });

    // ===== LAYER 1: Check if badge already registered =====
    console.log("LAYER 1: Checking for duplicate badge number...");
    const existingBadge = await Register.findOne({ badgeNo });
    if (existingBadge) {
      return res.status(409).json({
        msg: "This SSS number is already registered.",
        code: "BADGE_ALREADY_REGISTERED",
      });
    }
    console.log("✅ LAYER 1 PASSED");

    // ===== LAYER 2: Check if badge exists in Archive =====
    console.log("LAYER 2: Checking Archive collection...");
    const archiveRecord = await Archive.findOne({ badgeNo });
    if (!archiveRecord) {
      return res.status(404).json({
        msg: "SSS number not found in employee records.",
        code: "BADGE_NOT_IN_ARCHIVE",
      });
    }
    console.log("✅ LAYER 2 PASSED");

    // ===== LAYER 3: Verify names match =====
    console.log("LAYER 3: Verifying names match archive...");
    const nameMatch =
      archiveRecord.familyName.toLowerCase() === familyName.toLowerCase() &&
      archiveRecord.firstName.toLowerCase() === firstName.toLowerCase();

    if (!nameMatch) {
      return res.status(400).json({
        msg: "The name does not match the employee record.",
        code: "NAME_MISMATCH",
      });
    }
    console.log("✅ LAYER 3 PASSED");

    // ===== EMAIL VALIDATION =====
    console.log("EMAIL VALIDATION: Checking for duplicate email...");
    const existingEmail = await Register.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        msg: "This email is already registered.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    }
    console.log("✅ EMAIL VALIDATION PASSED");

    // ===== FACE ENROLLMENT =====
    console.log("🔍 Enrolling face with face-api...");
    const faceResult = await enrollFace(faceImageBase64, badgeNo, email);

    if (!faceResult.success) {
      console.log("❌ FACE ENROLLMENT FAILED:", faceResult.error);
      return res.status(400).json({
        msg: `Face enrollment failed: ${faceResult.error}`,
        code: "FACE_ENROLLMENT_FAILED",
      });
    }
    console.log("✅ FACE ENROLLMENT PASSED");

    // ===== CREATE REGISTRATION =====
    console.log("🎯 Creating registration record...");

    const registerData = {
      badgeNo: badgeNo.trim(),
      email: email.toLowerCase().trim(),
      familyName: familyName.trim(),
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      faceEnrollmentId: faceResult.faceEnrollmentId,
      descriptor: faceResult.descriptor, // Store the descriptor
      faceLivenessConfidence: faceResult.confidence || 0.95,
      faceEnrollmentDate: new Date(),
      faceEnrollmentStatus: "enrolled",
      status: "Active",
    };

    const newRegister = new Register(registerData);
    const savedRegister = await newRegister.save();

    // Update Archive status
    await Archive.findOneAndUpdate({ badgeNo }, { status: "Registered" }, { new: true });

    console.log("✅ Registration created successfully!");

    res.status(201).json({
      msg: "Registration successful! Check your email for activation details.",
      register: {
        _id: savedRegister._id,
        badgeNo: savedRegister.badgeNo,
        email: savedRegister.email,
        familyName: savedRegister.familyName,
        firstName: savedRegister.firstName,
        faceEnrollmentStatus: savedRegister.faceEnrollmentStatus,
        status: savedRegister.status,
        faceConfidence: savedRegister.faceLivenessConfidence,
      },
    });
  } catch (err) {
    console.error("❌ Registration error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        msg: `This ${field} is already registered.`,
        code: "DUPLICATE_FIELD",
      });
    }

    res.status(500).json({
      msg: "Server error during registration.",
      code: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// VERIFY FACE for login
router.post("/verify-face", async (req, res) => {
  try {
    const { email, faceImageBase64 } = req.body;

    if (!email || !faceImageBase64) {
      return res.status(400).json({ msg: "Email and face image are required." });
    }

    console.log("🔐 Verifying face for:", email);

    const register = await Register.findOne({
      email,
      faceEnrollmentStatus: "enrolled",
    });

    if (!register || !register.descriptor) {
      return res.status(404).json({
        msg: "No enrolled face found for this email.",
        code: "NO_FACE_ENROLLED",
      });
    }

    const verifyResult = await verifyFace(faceImageBase64, register.descriptor);

    if (!verifyResult.success) {
      console.log("❌ FACE VERIFICATION FAILED");
      return res.status(401).json({
        msg: verifyResult.error,
        code: "FACE_NOT_RECOGNIZED",
      });
    }

    console.log("✅ Face verified successfully for:", email);

    res.status(200).json({
      msg: "Face verified successfully",
      employee: {
        _id: register._id,
        name: `${register.firstName} ${register.familyName}`,
        email: register.email,
        badgeNo: register.badgeNo,
        faceEnrollmentStatus: register.faceEnrollmentStatus,
        confidence: verifyResult.confidence,
        distance: verifyResult.distance,
      },
    });
  } catch (err) {
    console.error("Face verification error:", err);
    res.status(500).json({
      msg: "Error verifying face",
      code: "SERVER_ERROR",
    });
  }
});

// GET all registrations
router.get("/", async (req, res) => {
  try {
    const { badgeNo, email } = req.query;
    let query = {};

    if (badgeNo) query.badgeNo = { $regex: badgeNo, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };

    const registers = await Register.find(query).select("-descriptor");
    res.status(200).json(registers);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch registrations" });
  }
});

export default router;