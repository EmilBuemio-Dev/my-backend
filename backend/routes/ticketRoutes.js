import express from "express";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Branch from "../models/Branch.js";
import upload from "../middleware/upload.js";
import { authMiddleware } from "../middleware/auth.js";

const router = new express.Router();

// ===============================
// CREATE TICKET (with multiple images)
// ===============================
router.post("/", authMiddleware, upload.array("ticketAttachment", 10), async (req, res) => {
  try {
    const { subject, concern, reportedEmployeeId } = req.body;

    // ✅ Ensure the authenticated user is available
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    console.log("\n" + "=".repeat(60));
    console.log("=== TICKET CREATION START ===");
    console.log("=".repeat(60));
    console.log("UserId:", userId);
    console.log("UserEmail:", userEmail);
    console.log("UserRole:", userRole);

    // ===== CHECK FILES =====
    console.log("\n📁 FILES INFO:");
    console.log("req.files exists?", !!req.files);
    console.log("req.files array length:", req.files?.length || 0);
    
    if (req.files && req.files.length > 0) {
      console.log("Files received:");
      req.files.forEach((file, idx) => {
        console.log(`  File ${idx + 1}:`);
        console.log(`    - fieldname: ${file.fieldname}`);
        console.log(`    - originalname: ${file.originalname}`);
        console.log(`    - filename: ${file.filename}`);
        console.log(`    - destination: ${file.destination}`);
        console.log(`    - path: ${file.path}`);
        console.log(`    - size: ${file.size} bytes`);
        console.log(`    - mimetype: ${file.mimetype}`);
      });
    } else {
      console.log("⚠️ NO FILES RECEIVED!");
    }

    if (!userId || !userEmail) {
      return res.status(401).json({ message: "Invalid user session. Please log in again." });
    }

    // Validate inputs
    if (!subject || !concern) {
      return res.status(400).json({ message: "Subject and concern are required." });
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

    // ✅ Handle multiple attachments - FIX: Use relative path format
    let attachmentPaths = [];
    
    console.log("\n📎 PROCESSING ATTACHMENTS:");
    
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} file(s)...`);
      
      attachmentPaths = req.files.map((file, index) => {
        // Use the exact path format: /uploads/ticket_attachments/filename
        const relativePath = `/uploads/ticket_attachments/${file.filename}`;
        console.log(`\n  Attachment ${index + 1}:`);
        console.log(`    - Original: ${file.originalname}`);
        console.log(`    - Saved as: ${file.filename}`);
        console.log(`    - Relative path: ${relativePath}`);
        console.log(`    - Full path: ${file.path}`);
        return relativePath;
      });
      
      console.log(`\n✅ Total attachments to save: ${attachmentPaths.length}`);
      console.log(`Attachment paths:`, attachmentPaths);
    } else {
      console.log("⚠️ No files to process - attachments will be empty");
    }

    console.log("\n📋 TICKET DATA:");
    console.log("  Subject:", subject);
    console.log("  Concern:", concern);
    console.log("  Status: Pending");
    console.log("  Creator:", creatorName);
    console.log("  Branch:", branch);
    console.log("  Attachments count:", attachmentPaths.length);

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
      attachments: attachmentPaths,
      source: creatorRole === "client" ? "Client" : "Guard",
      status: "Pending",
    });

    await newTicket.save();
    
    console.log("\n✅ TICKET SAVED SUCCESSFULLY:");
    console.log("  ID:", newTicket._id);
    console.log("  Subject:", newTicket.subject);
    console.log("  Status:", newTicket.status);
    console.log("  Attachments saved:", newTicket.attachments.length);
    console.log("  Attachments:", newTicket.attachments);
    console.log("=".repeat(60));
    console.log("=== TICKET CREATION END ===");
    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      message: "Ticket created successfully",
      ticket: newTicket,
    });
  } catch (err) {
    console.error("\n❌ ERROR CREATING TICKET:");
    console.error("  Message:", err.message);
    console.error("  Stack:", err.stack);
    console.error("=".repeat(60) + "\n");
    
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
      tickets = await Ticket.find({ reportedEmployeeId }).sort({ createdAt: -1 });
    } else if (req.user.role === "admin" || req.user.role === "hr") {
      tickets = await Ticket.find().sort({ createdAt: -1 });
    } else {
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
// DELETE TICKET (Admin only)
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