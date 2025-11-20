router.post("/", authMiddleware, upload.array("ticketAttachment", 10), async (req, res) => {
  try {
    const { subject, concern, priority, reportedEmployeeId } = req.body;

    // ✅ Ensure the authenticated user is available
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    console.log("=== TICKET CREATION START ===");
    console.log("UserId:", userId);
    console.log("UserEmail:", userEmail);
    console.log("UserRole:", userRole);

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
    if (req.files && req.files.length > 0) {
      console.log("=== FILES RECEIVED ===");
      console.log("Number of files:", req.files.length);
      
      attachmentPaths = req.files.map((file, index) => {
        // Use the exact path format: /uploads/ticket_attachments/filename
        const relativePath = `/uploads/ticket_attachments/${file.filename}`;
        console.log(`File ${index + 1}:`);
        console.log("  Fieldname:", file.fieldname);
        console.log("  Original:", file.originalname);
        console.log("  Filename:", file.filename);
        console.log("  Path:", relativePath);
        return relativePath;
      });
      
      console.log("Final attachmentPaths:", attachmentPaths);
    } else {
      console.log("⚠️ No files received");
    }

    // ===== Validate priority =====
    const validPriorities = ["Pending", "Urgent"];
    const ticketPriority = validPriorities.includes(priority) ? priority : "Pending";

    console.log("=== TICKET DATA ===");
    console.log("Subject:", subject);
    console.log("Priority:", ticketPriority);
    console.log("Status: Pending (always)");
    console.log("Attachments:", attachmentPaths);

    // ===== Create Ticket =====
    const newTicket = new Ticket({
      creatorId: userId,
      creatorEmail: userEmail,
      creatorRole,
      creatorName,
      branch,
      subject,
      concern,
      priority: ticketPriority,
      reportedEmployeeId: reportedEmployeeId || null,
      reportedEmployeeName,
      attachments: attachmentPaths,
      source: creatorRole === "client" ? "Client" : "Guard",
      status: "Pending",
    });

    await newTicket.save();
    
    console.log("✅ TICKET SAVED:");
    console.log("  ID:", newTicket._id);
    console.log("  Subject:", newTicket.subject);
    console.log("  Priority:", newTicket.priority);
    console.log("  Status:", newTicket.status);
    console.log("  Attachments:", newTicket.attachments);
    console.log("=== TICKET CREATION END ===\n");

    res.status(201).json({
      message: "Ticket created successfully",
      ticket: newTicket,
    });
  } catch (err) {
    console.error("❌ Error creating ticket:", err);
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