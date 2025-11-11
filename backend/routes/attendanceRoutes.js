import express from "express";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import upload from "../middleware/upload.js";
import jwt from "jsonwebtoken";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import cron from "node-cron";

const router = express.Router();

// ===== Middleware: Verify Token =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

router.post("/checkin", authenticateToken, upload.single("checkinImage"), async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: "Missing employee ID." });
    if (!req.file) return res.status(400).json({ message: "Check-in image is required." });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const employeeName = employee.employeeData?.personalData?.name || "Unknown Employee";
    const empShift = employee.employeeData?.basicInformation?.shift || "Day, 8:00AM-8:00PM";

    // ===== Parse shift start time =====
    const shiftTimeMatch = empShift.match(/(\d{1,2}:\d{2}[AP]M)/); // first time in shift string
    if (!shiftTimeMatch) return res.status(400).json({ message: "Invalid shift format." });

    let [shiftHour, shiftMinute, shiftPeriod] = shiftTimeMatch[1].match(/(\d{1,2}):(\d{2})(AM|PM)/).slice(1);
    shiftHour = parseInt(shiftHour, 10);
    shiftMinute = parseInt(shiftMinute, 10);
    if (shiftPeriod === "PM" && shiftHour !== 12) shiftHour += 12;
    if (shiftPeriod === "AM" && shiftHour === 12) shiftHour = 0;

    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(shiftHour, shiftMinute, 0, 0);

    const diffMinutes = (now - shiftStart) / 60000; // difference in minutes

    // ===== Prevent check-in more than 30 minutes early =====
    if (diffMinutes < -30) {
      return res.status(400).json({
        message: `Too early to check in. You can only check in 30 minutes before your shift.`,
      });
    }

    // ===== Determine status =====
    let status = "On-Time";
    if (diffMinutes > 10) status = "Late"; // late up to 10 min
    // all early check-ins within 30 mins before shift are "On-Time"

    // ===== Check if already checked in today =====
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingCheckin = await Attendance.findOne({
      employeeId,
      checkinTime: { $gte: todayStart, $lte: todayEnd },
    });

    if (existingCheckin && !existingCheckin.checkoutTime) {
      return res.status(400).json({
        message: "Already checked in today. Please check out first.",
      });
    }

    const checkinImageUrl = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    const record = new Attendance({
      employeeId,
      employeeName,
      checkinTime: now,
      checkinImageUrl,
      shift: empShift,
      status,
    });

    await record.save();
    res.status(201).json({ message: "Check-in successful", record });

  } catch (err) {
    console.error("❌ Check-in error:", err);
    res.status(500).json({ message: "Failed to check-in", error: err.message });
  }
});


router.post("/checkout", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: "Missing employee ID." });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const record = await Attendance.findOne({
      employeeId,
      checkoutTime: null,
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(404).json({ message: "No active check-in found for today." });
    }

    const now = new Date();
    record.checkoutTime = now;

    // ===== Determine shift end from employee shift =====
    const empShift = employee.employeeData?.basicInformation?.shift || "Day, 8:00AM-8:00PM";
    const shiftTimesMatch = empShift.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);

    if (shiftTimesMatch) {
      let [_, startTimeStr, endTimeStr] = shiftTimesMatch;

      // Parse end time
      let [endHour, endMinute, endPeriod] = endTimeStr.match(/(\d{1,2}):(\d{2})(AM|PM)/).slice(1);
      endHour = parseInt(endHour, 10);
      endMinute = parseInt(endMinute, 10);
      if (endPeriod === "PM" && endHour !== 12) endHour += 12;
      if (endPeriod === "AM" && endHour === 12) endHour = 0;

      const shiftEnd = new Date();
      shiftEnd.setHours(endHour, endMinute, 0, 0);

      // Check if leaving early
      if (now < shiftEnd) {
        record.status = record.status ? record.status + ", Early Leave" : "Early Leave";
      }
    }

    await record.save();

    res.json({ message: "Check-out successful", record });
  } catch (err) {
    console.error("❌ Check-out error:", err);
    res.status(500).json({ message: "Failed to check-out", error: err.message });
  }
});

/* ------------------------- GET ATTENDANCE (USER) ------------------------- */
router.get("/attendance", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const records = await Attendance.find({ employeeId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error("❌ Fetch attendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
});

// ===== GET /attendance/all (HR/Admin view) =====
router.get("/attendance/all", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error("❌ Fetch all attendance error:", err);
    res.status(500).json({ message: "Failed to fetch all attendance", error: err.message });
  }
});


// ===== GET WEEKLY ATTENDANCE =====
router.get("/attendance/:employeeId/weekly", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const now = new Date();

    // Using date-fns to get week boundaries (Monday as first day)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const records = await Attendance.find({
      employeeId,
      checkinTime: { $gte: weekStart, $lte: weekEnd },
    }).sort({ checkinTime: 1 });

    res.json(records);
  } catch (err) {
    console.error("❌ Weekly attendance fetch error:", err);
    res.status(500).json({ message: "Failed to fetch weekly attendance" });
  }
});

// ===== GET MONTHLY ATTENDANCE SUMMARY =====
router.get("/attendance/:employeeId/monthly-summary", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const now = new Date();

    // Using date-fns to get month boundaries
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const records = await Attendance.find({
      employeeId,
      checkinTime: { $gte: monthStart, $lte: monthEnd },
    }).sort({ checkinTime: 1 });

    const summary = { OnTime: 0, Late: 0, Absent: 0 };

    records.forEach((r) => {
      if (!r.status) return;
      const status = r.status.toLowerCase();
      if (status.includes("late")) summary.Late++;
      else if (status.includes("absent")) summary.Absent++;
      else summary.OnTime++;
    });

    res.json({ summary, records });
  } catch (err) {
    console.error("❌ Monthly summary fetch error:", err);
    res.status(500).json({ message: "Failed to fetch monthly summary" });
  }
});

router.get("/attendance/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await Attendance.find({ employeeId }).sort({ checkinTime: -1 });

    if (!records.length) {
      return res.status(404).json({ message: "No attendance records found." });
    }

    res.json({ records });
  } catch (err) {
    console.error("❌ Fetch attendance by ID error:", err);
    res.status(500).json({ message: "Failed to fetch attendance by ID", error: err.message });
  }
});

cron.schedule("0 3 * * *", async () => {
  try {
    console.log("🕒 Running daily absence check (3:00 AM)...");

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const employees = await Employee.find({
      "employeeData.employmentData.status": { $ne: "Resigned" },
    });

    for (const emp of employees) {
      const empId = emp._id;
      const empName = emp.employeeData?.personalData?.name;
      const empShift = emp.employeeData?.basicInformation?.shift || "Day Shift";
      if (!empName) continue;

      const hasCheckin = await Attendance.exists({
        employeeId: empId,
        checkinTime: { $gte: todayStart, $lte: todayEnd },
      });

      if (!hasCheckin) {
        await Attendance.create({
          employeeId: empId,
          employeeName: empName,
          checkinTime: todayStart,
          checkoutTime: todayEnd,
          shift: empShift,
          status: "Absent",
          checkinImageUrl: null,
        });
        console.log(`❌ Marked Absent: ${empName}`);
      }
    }

    console.log("✅ Daily absence marking completed.");
  } catch (err) {
    console.error("❌ Error running absence cron job:", err);
  }
});

export default router;
