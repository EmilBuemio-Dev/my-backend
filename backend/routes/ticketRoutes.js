import express from "express";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Branch from "../models/Branch.js";
import upload from "../middleware/upload.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ===============================
// CREATE TICKET (with optional image)
// ===============================
router.post("/", authMiddleware, upload.single("ticketAttachment"), async (req, res) => {
  try {
    const { subject, concern, reportedEmployeeId } = req.body;

    // ✅ Ensure the authenticated user is available
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    if (!userId || !userEmail) {
      return res.status(401).json({ message: "Invalid user session. Please log in again." });
    }

    let creatorRole = userRole || "employee";
    let creatorName = "Unknown";
    let branch = null;

    // === Try to find user in Employee collection ===
    const employee = await Employee.findOne({
      "employeeData.personalData.email": userEmail,
    });

    if (employee) {
      creatorRole = "employee";
      creatorName = employee.employeeData?.personalData?.name || "Unknown Employee";
      branch = employee.employeeData?.basicInformation?.branch || null;
    } else {
      // === Try to find in Branch (Client) ===
      const branchClient = await Branch.findOne({
        "branchData.email": userEmail,
      });

      if (branchClient) {
        creatorRole = "client";
        creatorName = branchClient.branchData?.name || "Unknown Client";
        branch = branchClient.branchData?.branch || null;
      } else {
        // If not found in either Employee or Branch, use fallback from User model
        const user = await User.findById(userId);
        if (user) {
          creatorName = user.name;
          branch = user.branch || null;
        } else {
          return res.status(400).json({ message: "User not found in Employee, Branch, or User collection" });
        }
      }
    }

    // ===== Get reported employee name if applicable =====
    let reportedEmployeeName = null;
    if (reportedEmployeeId) {
      const reportedEmployee = await Employee.findById(reportedEmployeeId);
      if (reportedEmployee) {
        reportedEmployeeName = reportedEmployee.employeeData?.personalData?.name || null;
      }
    }

    // ✅ Handle attachment (only for client tickets)
    let attachmentPath = null;
    if (creatorRole === "client" && req.file) {
      attachmentPath = `/uploads/ticket_attachments/${req.file.filename}`;
      console.log("✅ Client ticket attachment:", attachmentPath);
    }

    // ===== Create Ticket =====
    const newTicket = new Ticket({
      creatorId: userId,
      creatorEmail: userEmail,
      creatorRole,
      creatorName,
      branch,
      subject,
      concern,
      reportedEmployeeId: reportedEmployeeId || null,
      reportedEmployeeName,
      attachment: attachmentPath,
      source: creatorRole === "client" ? "Client" : "Guard",
      status: creatorRole === "client" ? "Urgent" : "Pending",
    });

    await newTicket.save();
    res.status(201).json({
      message: "Ticket created successfully",
      ticket: newTicket,
    });
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({
      message: "Server error while creating ticket",
      error: err.message,
    });
  }
});

// ===============================
// GET ALL TICKETS (Supports Filtering)
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { reportedEmployeeId } = req.query;
    let tickets;

    if (reportedEmployeeId) {
      // ✅ If client wants to see all concerns for a specific guard
      tickets = await Ticket.find({ reportedEmployeeId }).sort({ createdAt: -1 });
    } else if (req.user.role === "admin" || req.user.role === "hr") {
      // ✅ Admin/HR can see all tickets
      tickets = await Ticket.find().sort({ createdAt: -1 });
    } else {
      // ✅ Regular user sees only their own tickets
      tickets = await Ticket.find({ creatorId: req.user.id }).sort({ createdAt: -1 });
    }

    res.json(tickets);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ message: "Failed to fetch tickets", error: err.message });
  }
});

// ===============================
// GET SINGLE TICKET
// ===============================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    console.error("Error fetching ticket:", err);
    res.status(500).json({ message: "Failed to fetch ticket", error: err.message });
  }
});

// ===============================
// UPDATE TICKET STATUS
// ===============================
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedTicket) return res.status(404).json({ message: "Ticket not found" });
    res.json(updatedTicket);
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ message: "Failed to update ticket", error: err.message });
  }
});

// ===============================
// DELETE (Admin only)
// ===============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await Ticket.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    res.status(500).json({ message: "Server error while deleting ticket" });
  }
});

export default router;