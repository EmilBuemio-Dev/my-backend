import express from "express";
import Remark from "../models/Remark.js";
import Employee from "../models/Employee.js";
import Ticket from "../models/Ticket.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ===============================
// CREATE REMARK
// ===============================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, penaltyLevel, dueProcess, ticketId, hrComment } = req.body;

    // ✅ Validate required fields
    if (!employeeId || !penaltyLevel || !dueProcess || !hrComment) {
      return res.status(400).json({
        message: "Missing required fields: employeeId, penaltyLevel, dueProcess, hrComment",
      });
    }

    // ✅ Validate penalty level
    if (!["Light", "Least Grave", "Grave"].includes(penaltyLevel)) {
      return res.status(400).json({ message: "Invalid penalty level" });
    }

    // ✅ Validate due process
    if (!["Notice", "Appearance"].includes(dueProcess)) {
      return res.status(400).json({ message: "Invalid due process type" });
    }

    // ✅ Get employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employeeName = employee.employeeData?.personalData?.name || "Unknown";

    // ✅ Get ticket details if provided
    let ticketSubject = null;
    let ticketDetails = null;

    if (ticketId) {
      const ticket = await Ticket.findById(ticketId);
      if (ticket) {
        ticketSubject = ticket.subject;
        // ✅ Store ticket details for later reference
        ticketDetails = {
          concern: ticket.concern || null,
          creatorName: ticket.creatorName || null,
          creatorRole: ticket.creatorRole || null,
          rating: ticket.rating || null,
          source: ticket.source || null,
          createdAt: ticket.createdAt || null,
        };
      }
    }

    // ✅ Create remark
    const newRemark = new Remark({
      employeeId,
      employeeName,
      penaltyLevel,
      dueProcess,
      ticketId: ticketId || null,
      ticketSubject,
      ticketDetails,
      hrComment,
      status: "Pending",
      createdBy: {
        userId: req.user.id,
        name: req.user.name,
        timestamp: new Date(),
      },
    });

    await newRemark.save();

    res.status(201).json({
      message: "Remark created successfully",
      remark: newRemark,
    });
  } catch (err) {
    console.error("Error creating remark:", err);
    res.status(500).json({
      message: "Server error while creating remark",
      error: err.message,
    });
  }
});

// ===============================
// GET ALL REMARKS
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    // ✅ Only admin/hr can view all remarks
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Access denied" });
    }

    const remarks = await Remark.find()
      .populate("employeeId", "employeeData.personalData.name")
      .populate("ticketId", "subject")
      .sort({ createdAt: -1 });

    res.json(remarks);
  } catch (err) {
    console.error("Error fetching remarks:", err);
    res.status(500).json({
      message: "Failed to fetch remarks",
      error: err.message,
    });
  }
});

// ===============================
// GET SINGLE REMARK
// ===============================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const remark = await Remark.findById(req.params.id)
      .populate("employeeId")
      .populate("ticketId");

    if (!remark) {
      return res.status(404).json({ message: "Remark not found" });
    }

    res.json(remark);
  } catch (err) {
    console.error("Error fetching remark:", err);
    res.status(500).json({
      message: "Failed to fetch remark",
      error: err.message,
    });
  }
});

// ===============================
// GET REMARKS BY EMPLOYEE
// ===============================
router.get("/employee/:employeeId", authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const remarks = await Remark.find({ employeeId })
      .sort({ createdAt: -1 });

    res.json({ remarks });
  } catch (err) {
    console.error("Error fetching employee remarks:", err);
    res.status(500).json({
      message: "Failed to fetch employee remarks",
      error: err.message,
    });
  }
});

// ===============================
// UPDATE REMARK STATUS
// ===============================
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    // ✅ Validate status
    if (status && !["Pending", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // ✅ Only admin/hr can update
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {
      updatedBy: {
        userId: req.user.id,
        name: req.user.name,
        timestamp: new Date(),
      },
    };

    if (status) updateData.status = status;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;

    const updatedRemark = await Remark.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedRemark) {
      return res.status(404).json({ message: "Remark not found" });
    }

    res.json({
      message: "Remark updated successfully",
      remark: updatedRemark,
    });
  } catch (err) {
    console.error("Error updating remark:", err);
    res.status(500).json({
      message: "Failed to update remark",
      error: err.message,
    });
  }
});

// ===============================
// DELETE REMARK
// ===============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // ✅ Only admin can delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await Remark.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Remark not found" });
    }

    res.status(200).json({ message: "Remark deleted successfully" });
  } catch (err) {
    console.error("Error deleting remark:", err);
    res.status(500).json({
      message: "Server error while deleting remark",
      error: err.message,
    });
  }
});

export default router;