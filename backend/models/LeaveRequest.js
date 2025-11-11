import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  placeOfDuty: { type: String, required: true },
  leaveType: { type: String, required: true },
  dateOfEffectivity: { type: Date, required: true },
  reason: { type: String, required: true },
  addressWhileOnLeave: { type: String, required: true },
  contactNumber: { type: String, required: true },
  status: { type: String, default: 'Pending' },
}, { timestamps: true });

export default mongoose.model("LeaveRequest", leaveRequestSchema);
