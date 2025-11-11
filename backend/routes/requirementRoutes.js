import express from "express";
import Requirement from "../models/Requirement.js";

const router = express.Router();

// Create requirement (existing)
router.post("/", async (req, res) => {
  try {
    const { clientName, branch, salary, height, weight } = req.body;
    if (!clientName || !branch || !salary || !height || !weight) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const newReq = new Requirement({ clientName, branch, salary, height, weight });
    await newReq.save();
    res.status(201).json(newReq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create requirement" });
  }
});

// Get all requirements (existing)
router.get("/", async (req, res) => {
  try {
    const requirements = await Requirement.find();
    res.json(requirements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requirements" });
  }
});

// ===== Delete Requirement =====
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Requirement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Requirement not found" });
    res.json({ message: "Requirement deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete requirement" });
  }
});

export default router;
