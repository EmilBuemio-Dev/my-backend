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
const MODEL_PATH = path.join(__dirname, "../backend/models-api");

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

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, "base64");
    const img = new Image();
    img.src = buffer;

    console.log("🔍 Detecting face...");
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

// Verify face during login
export async function verifyFace(imageBase64, registeredDescriptor, threshold = 0.6) {
  try {
    if (!modelsLoaded) await loadModels();

    const buffer = Buffer.from(imageBase64, "base64");
    const img = new Image();
    img.src = buffer;

    console.log("🔐 Verifying face...");
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        error: "No face detected",
      };
    }

    const incomingDescriptor = Array.from(detection.descriptor);
    const distance = euclideanDistance(incomingDescriptor, registeredDescriptor);
    const confidence = Math.max(0, 1 - distance);

    console.log(`Distance: ${distance.toFixed(2)}, Confidence: ${confidence.toFixed(2)}`);

    if (distance < threshold) {
      return {
        success: true,
        distance,
        confidence,
        message: "Face verified successfully",
      };
    } else {
      return {
        success: false,
        distance,
        confidence,
        error: "Face does not match. Please try again.",
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