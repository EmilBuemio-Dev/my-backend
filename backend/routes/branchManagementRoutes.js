import express from "express";
import Branch from "../models/BranchManagement.js"; // new Branch model

const router = express.Router();

// GET all branches
router.get("/", async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new branch
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Branch name is required." });

    const branch = new Branch({ name });
    await branch.save();
    res.json(branch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE branch
router.delete("/:id", async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    res.json({ message: "Branch removed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
