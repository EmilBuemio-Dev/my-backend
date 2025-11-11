import express from "express";
import LeaveRequest from "../models/LeaveRequest.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

// POST create leave request
router.post("/leave-requests", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      placeOfDuty,
      leaveType,
      dateOfEffectivity,
      reason,
      addressWhileOnLeave,
      contactNumber,
    } = req.body;

    if (!name || !leaveType || !dateOfEffectivity)
      return res.status(400).json({ message: "Missing required fields" });

    const newLeave = new LeaveRequest({
      employeeId: req.user.id, // ✅ Always use the token's user ID
      name,
      placeOfDuty,
      leaveType,
      dateOfEffectivity,
      reason,
      addressWhileOnLeave,
      contactNumber,
      status: "Pending",
    });

    await newLeave.save();
    res.status(201).json({ message: "Leave request submitted successfully", newLeave });
  } catch (err) {
    console.error("❌ Error creating leave request:", err);
    res.status(500).json({ message: "Failed to submit leave request" });
  }
});

  
// GET Leave Requests
router.get("/leave-requests", authMiddleware, async (req, res) => {
  try {
    let leaveRequests;

    if (req.user.role === "admin" || req.user.role === "hr") {
      // Admin/HR see all leave requests
      leaveRequests = await LeaveRequest.find().sort({ createdAt: -1 });
    } else {
      // Employee sees only their requests
      leaveRequests = await LeaveRequest.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    }

    res.json(leaveRequests);
  } catch (err) {
    console.error("❌ Error fetching leave requests:", err);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
});

// GET single leave request
router.get("/leave-requests/:id", authMiddleware, async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    
    // Employee can only see their own leaves
    if (req.user.role !== "admin" && req.user.role !== "hr" && leave.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(leave);
  } catch (err) {
    console.error("❌ Error fetching leave request:", err);
    res.status(500).json({ message: "Failed to fetch leave request" });
  }
});

// PATCH update leave status (Admin/HR only)
router.patch("/leave-requests/:id", authMiddleware, roleMiddleware(["admin","hr"]), async (req, res) => {
  try {
    const { status } = req.body;
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!leave) return res.status(404).json({ message: "Leave request not found" });

    res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (err) {
    console.error("❌ Error updating leave status:", err);
    res.status(500).json({ message: "Failed to update leave status" });
  }
});

export default router;
