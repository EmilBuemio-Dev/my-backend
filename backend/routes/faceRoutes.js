import express from "express";
import multer from "multer";
import { loadModels, registerFace, recognizeFace } from "../services/faceService.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Load models once at server start
loadModels().then(() => console.log("Face-api models loaded"));

// Register face
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    const filePath = req.file.path;
    const result = await registerFace(name, filePath);
    res.json({ message: "Face registered", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Recognize face
router.post("/recognize", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const result = await recognizeFace(filePath);
    res.json({ result: result || "No match found" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
