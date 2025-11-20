import express from "express";
import multer from "multer";
import { loadModels, enrollFace, verifyFace, getAllFaceDescriptors } from "../services/faceService.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Load models when server starts
loadModels().then(() => console.log("Face models loaded"));

/**
 * ENROLL FACE (REGISTER)
 * expects:
 *   - image (base64 string)
 *   - badgeNo
 *   - email
 */
router.post("/register", async (req, res) => {
  try {
    const { imageBase64, badgeNo, email } = req.body;

    const result = await enrollFace(imageBase64, badgeNo, email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ message: "Face enrolled", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * VERIFY FACE (LOGIN)
 * expects:
 *   - imageBase64
 *   - registeredDescriptor (array)
 */
router.post("/recognize", async (req, res) => {
  try {
    const { imageBase64, registeredDescriptor } = req.body;

    const result = await verifyFace(imageBase64, registeredDescriptor);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** OPTIONAL: VIEW STORED DESCRIPTORS */
router.get("/descriptors", async (req, res) => {
  try {
    const result = await getAllFaceDescriptors();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
