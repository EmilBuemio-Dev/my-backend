import express from "express";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import upload from "../middleware/upload.js";
import jwt from "jsonwebtoken";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import cron from "node-cron";

const router = express.Router();

// ===== TIMEZONE UTILITY =====
// Get current time in Philippines timezone (UTC+8)
function getNowInPH() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}

// ===== PARSE SHIFT TIME HELPER =====
function parseShiftTime(timeStr) {
  // Matches: "8:00AM", "08:00AM", "8:00 AM", "08:00 AM", etc.
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return { hour, minute };
}

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
    const empShift = employee.employeeData?.basicInformation?.shift || "8:00 AM-5:00 PM";

    console.log(`📝 Check-in attempt for: ${employeeName}`);
    console.log(`🕐 Shift: ${empShift}`);

    // ===== Extract shift start time - handles multiple formats =====
    // Formats: "8:00AM-5:00PM", "Day, 8:00AM-8:00PM", "8:00 AM - 5:00 PM", etc.
    const timePattern = /(\d{1,2}):(\d{2})\s*([AP]M)/i;
    const match = empShift.match(timePattern);
    
    if (!match) {
      console.error(`Invalid shift format: ${empShift}`);
      return res.status(400).json({ 
        message: "Invalid shift format in employee record",
        detail: `Expected format like '8:00AM-5:00PM', got: '${empShift}'`
      });
    }

    // Parse shift start time
    const shiftStartTime = parseShiftTime(`${match[1]}:${match[2]} ${match[3]}`);
    if (!shiftStartTime) {
      return res.status(400).json({ message: "Could not parse shift start time." });
    }

    // ===== USE PHILIPPINES TIME FOR ALL CALCULATIONS =====
    const now = getNowInPH();
    const shiftStart = new Date(now);
    shiftStart.setHours(shiftStartTime.hour, shiftStartTime.minute, 0, 0);

    const diffMinutes = (now - shiftStart) / 60000; // difference in minutes

    console.log(`🕐 Philippines Now: ${now.toLocaleString()}`);
    console.log(`🕐 Shift Start: ${shiftStart.toLocaleString()}`);
    console.log(`⏱️  Minutes diff: ${diffMinutes}`);

    // ===== Prevent check-in more than 30 minutes early =====
    if (diffMinutes < -30) {
      return res.status(400).json({
        message: `Too early to check in. You can only check in 30 minutes before your shift starts.`,
        shiftStartTime: `${shiftStartTime.hour}:${shiftStartTime.minute.toString().padStart(2, '0')}`
      });
    }

    // ===== Determine status =====
    let status = "On-Time";
    if (diffMinutes > 10) status = "Late"; // late if more than 10 min after shift start

    // ===== Check if already checked in today (in PH timezone) =====
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
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

    // ===== Save using UTC time (for database storage) =====
    const record = new Attendance({
      employeeId,
      employeeName,
      checkinTime: new Date(), // Store as UTC
      checkinImageUrl,
      shift: empShift,
      status,
      timezone: "Asia/Manila",
    });

    await record.save();
    
    console.log(`✅ Check-in successful: ${employeeName} (Status: ${status})`);
    
    res.status(201).json({ 
      message: "Check-in successful", 
      record,
      displayTime: now.toLocaleString()
    });

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

    // ===== USE PHILIPPINES TIME =====
    const now = getNowInPH();
    record.checkoutTime = new Date(); // Store as UTC

    // ===== Determine shift end from employee shift =====
    const empShift = employee.employeeData?.basicInformation?.shift || "8:00 AM-5:00 PM";
    
    // Extract the second time (shift end) - handles multiple formats
    const timePattern = /(\d{1,2}):(\d{2})\s*([AP]M)/gi;
    const matches = [...empShift.matchAll(timePattern)];
    
    if (matches.length >= 2) {
      const endTimeMatch = matches[1];
      const shiftEndTime = parseShiftTime(`${endTimeMatch[1]}:${endTimeMatch[2]} ${endTimeMatch[3]}`);
      
      if (shiftEndTime) {
        const shiftEnd = new Date(now);
        shiftEnd.setHours(shiftEndTime.hour, shiftEndTime.minute, 0, 0);

        // Check if leaving early
        if (now < shiftEnd) {
          record.status = record.status ? record.status + ", Early Out" : "Early Out";
        }
      }
    }

    await record.save();

    res.json({ 
      message: "Check-out successful", 
      record,
      displayTime: now.toLocaleString()
    });
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

// ===== GET /attendance/all (HR/Admin view - used for weekly report) =====
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
    const now = getNowInPH();

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
    const now = getNowInPH();

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

// ===== DAILY ABSENCE CHECK CRON (3:00 AM PH TIME) =====
cron.schedule("0 3 * * *", async () => {
  try {
    console.log("🕒 Running daily absence check (3:00 AM PH time)...");

    const now = getNowInPH();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const employees = await Employee.find({
      "employeeData.basicInformation.status": { $ne: "Resigned" },
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
          checkinTime: new Date(todayStart),
          checkoutTime: new Date(todayEnd),
          shift: empShift,
          status: "Absent",
          checkinImageUrl: null,
          timezone: "Asia/Manila",
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