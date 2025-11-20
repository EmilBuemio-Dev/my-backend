import express from "express";
import Register from "../models/Register.js";
import { loadModels, verifyFace } from "../services/faceService.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Load models when server starts
loadModels().then(() => console.log("✅ Face models loaded for check-in"));

// ===== Middleware: Verify Token =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

// ===== VERIFY FACE FOR CHECK-IN =====
router.post("/verify-checkin", authenticateToken, async (req, res) => {
  try {
    const { imageBase64, badgeNo } = req.body;

    if (!imageBase64 || !badgeNo) {
      return res.status(400).json({
        success: false,
        message: "Image and badge number are required.",
        code: "MISSING_DATA",
      });
    }

    console.log(`🔐 Verifying face for badge: ${badgeNo}`);

    // ===== FETCH ENROLLED FACE FROM REGISTER =====
    const register = await Register.findOne({
      badgeNo,
      faceEnrollmentStatus: "enrolled",
    });

    if (!register) {
      return res.status(404).json({
        success: false,
        message: "No enrolled face found for this badge number.",
        code: "NO_FACE_ENROLLED",
      });
    }

    if (!register.descriptor) {
      return res.status(400).json({
        success: false,
        message: "Face descriptor not found. Please re-enroll your face.",
        code: "INVALID_FACE_DATA",
      });
    }

    console.log(`👤 Found enrolled face for: ${register.firstName} ${register.familyName}`);

    // ===== VERIFY CAPTURED FACE =====
    const verifyResult = await verifyFace(imageBase64, register.descriptor, 0.6);

    if (!verifyResult.success) {
      console.log(`❌ Face verification failed for badge ${badgeNo}`);
      return res.status(401).json({
        success: false,
        message: verifyResult.error || "Face does not match. Please retake the photo.",
        code: "FACE_NOT_RECOGNIZED",
        distance: verifyResult.distance,
        confidence: verifyResult.confidence,
        requireRetake: true, // Signal frontend to force retake
      });
    }

    console.log(`✅ Face verified successfully for badge: ${badgeNo}`);
    console.log(`   Distance: ${verifyResult.distance.toFixed(2)}`);
    console.log(`   Confidence: ${verifyResult.confidence.toFixed(2)}`);

    // ===== RETURN SUCCESS WITH EMPLOYEE DATA =====
    res.status(200).json({
      success: true,
      message: "Face verified successfully",
      code: "FACE_VERIFIED",
      employee: {
        badgeNo: register.badgeNo,
        email: register.email,
        name: `${register.firstName} ${register.familyName}`,
        faceEnrollmentStatus: register.faceEnrollmentStatus,
      },
      faceMetrics: {
        distance: verifyResult.distance,
        confidence: verifyResult.confidence,
      },
    });
  } catch (err) {
    console.error("❌ Face verification error:", err);
    res.status(500).json({
      success: false,
      message: "Error verifying face",
      code: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ===== DETECT FACE (Check if face exists in image) =====
router.post("/detect-face", authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
        code: "MISSING_IMAGE",
      });
    }

    console.log("👁 Detecting face in image...");

    // Import face-api dynamically for detection only
    const faceapi = await import("face-api.js");
    const canvas = await import("canvas");
    const { Canvas, Image, ImageData } = canvas;
    faceapi.default.env.monkeyPatch({ Canvas, Image, ImageData });

    const buffer = Buffer.from(imageBase64, "base64");
    const img = new Image();
    img.src = buffer;

    const detection = await faceapi.default
      .detectSingleFace(img)
      .withFaceLandmarks();

    if (!detection) {
      console.log("❌ No face detected in image");
      return res.status(400).json({
        success: false,
        message: "No face detected. Please ensure your face is clearly visible.",
        code: "NO_FACE_DETECTED",
        requireRetake: true,
      });
    }

    console.log("✅ Face detected successfully");

    res.status(200).json({
      success: true,
      message: "Face detected",
      code: "FACE_DETECTED",
      faceMetrics: {
        detectionScore: detection.detection.score,
      },
    });
  } catch (err) {
    console.error("❌ Face detection error:", err);
    res.status(500).json({
      success: false,
      message: "Error detecting face",
      code: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ===== GET FACE ENROLLMENT STATUS =====
router.get("/enrollment-status/:badgeNo", authenticateToken, async (req, res) => {
  try {
    const { badgeNo } = req.params;

    const register = await Register.findOne({ badgeNo });

    if (!register) {
      return res.status(404).json({
        success: false,
        message: "Badge number not found.",
        enrolled: false,
      });
    }

    res.status(200).json({
      success: true,
      badgeNo: register.badgeNo,
      name: `${register.firstName} ${register.familyName}`,
      enrolled: register.faceEnrollmentStatus === "enrolled",
      enrollmentStatus: register.faceEnrollmentStatus,
      enrollmentDate: register.faceEnrollmentDate,
    });
  } catch (err) {
    console.error("❌ Error checking enrollment status:", err);
    res.status(500).json({
      success: false,
      message: "Error checking enrollment status",
      code: "SERVER_ERROR",
    });
  }
});

export default router;