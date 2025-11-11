// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    employeeName: { type: String, required: true },
    checkinTime: { type: Date, required: true },
    // made optional because auto-marked 'Absent' records won't have an image
    checkinImageUrl: { type: String, required: false, default: null },
    checkoutTime: { type: Date, default: null },
    shift: { type: String, default: "Day Shift" },
    status: { type: String, default: "On-Time" },
  },
  { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
