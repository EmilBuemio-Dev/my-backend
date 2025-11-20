import * as faceapi from "face-api.js";
import canvas from "canvas";
import path from "path";
import { fileURLToPath } from "url";
import Register from "../models/Register.js";
import crypto from "crypto";

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_PATH = path.join(__dirname, "../models-api");

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  
  try {
    console.log("📦 Loading face-api models from:", MODEL_PATH);
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
    ]);
    modelsLoaded = true;
    console.log("✅ Face-api models loaded successfully");
  } catch (err) {
    console.error("❌ Failed to load face-api models:", err);
    throw err;
  }
}

// ===== CRITICAL: Load image properly before face detection =====
function loadImageFromBase64(base64Data) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        console.log("✅ Image loaded successfully");
        resolve(img);
      };
      
      img.onerror = (err) => {
        console.error("❌ Image loading failed:", err);
        reject(new Error("Failed to load image"));
      };

      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64String, "base64");
      
      // Set the buffer as the image source
      img.src = buffer;
    } catch (err) {
      reject(new Error(`Image conversion failed: ${err.message}`));
    }
  });
}

// Euclidean distance between descriptors
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return Infinity;
  }
  return Math.sqrt(desc1.reduce((sum, val, i) => sum + (val - desc2[i]) ** 2, 0));
}

// Enroll face from base64 image
export async function enrollFace(imageBase64, badgeNo, email) {
  try {
    if (!modelsLoaded) await loadModels();

    console.log("🔍 Loading image for enrollment...");
    const img = await loadImageFromBase64(imageBase64);

    console.log("🔍 Detecting face for enrollment...");
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        error: "No face detected in image. Please ensure your face is clearly visible.",
      };
    }

    // Check liveness (basic check - face must be detected with good landmarks)
    const landmarks = detection.landmarks.positions;
    if (landmarks.length < 68) {
      return {
        success: false,
        error: "Face not clear enough. Please try again.",
      };
    }

    const descriptor = Array.from(detection.descriptor);
    const faceEnrollmentId = crypto.randomBytes(12).toString("hex");
    const confidence = Math.min(detection.detection.score, 1);

    console.log(`✅ Face enrolled for ${email}`);
    console.log(`   Enrollment ID: ${faceEnrollmentId}`);
    console.log(`   Confidence: ${confidence}`);

    return {
      success: true,
      faceEnrollmentId,
      descriptor,
      confidence,
      livenessConfidence: confidence,
    };
  } catch (err) {
    console.error("❌ Face enrollment error:", err);
    return {
      success: false,
      error: `Face enrollment failed: ${err.message}`,
    };
  }
}

// Verify face during check-in/login
export async function verifyFace(imageBase64, registeredDescriptor, threshold = 0.6) {
  try {
    if (!modelsLoaded) await loadModels();

    console.log("🔍 Loading image for verification...");
    const img = await loadImageFromBase64(imageBase64);

    console.log("🔐 Detecting face in captured image...");
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.log("❌ No face detected in verification image");
      return {
        success: false,
        error: "No face detected in image. Please ensure your face is clearly visible and well-lit.",
      };
    }

    console.log("✅ Face detected, computing similarity...");
    const incomingDescriptor = Array.from(detection.descriptor);
    const distance = euclideanDistance(incomingDescriptor, registeredDescriptor);
    const confidence = Math.max(0, 1 - distance);

    console.log(`📊 Verification Results:`);
    console.log(`   Distance: ${distance.toFixed(4)}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(2)}%`);
    console.log(`   Threshold: ${threshold}`);

    if (distance < threshold) {
      console.log("✅ Face verification PASSED");
      return {
        success: true,
        distance,
        confidence,
        message: "Face verified successfully",
      };
    } else {
      console.log("❌ Face verification FAILED (distance too high)");
      return {
        success: false,
        distance,
        confidence,
        error: "Face does not match enrolled face. Please retake the photo.",
      };
    }
  } catch (err) {
    console.error("❌ Face verification error:", err);
    return {
      success: false,
      error: `Verification failed: ${err.message}`,
    };
  }
}

// Get all face descriptors for duplicate checking
export async function getAllFaceDescriptors() {
  try {
    const faces = await Register.find(
      { faceEnrollmentStatus: "enrolled" },
      { badgeNo: 1, descriptor: 1, faceEnrollmentId: 1 }
    );
    return faces;
  } catch (err) {
    console.error("Error fetching face descriptors:", err);
    return [];
  }
}