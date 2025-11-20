import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorEmail: { type: String },
  creatorRole: { type: String, enum: ["employee", "client"], required: true },
  creatorName: { type: String },
  branch: { type: String, default: null },
  reportedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  reportedEmployeeName: { type: String, default: null },
  subject: { type: String, required: true },
  concern: { type: String, required: true },
  priority: { type: String, enum: ["Pending", "Urgent"], default: "Pending" },
  // ✅ Multiple attachments array
  attachments: [
    { type: String }
  ],
  source: { type: String, default: "Guard" },
  status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to set source based on role
TicketSchema.pre("save", function (next) {
  if (this.creatorRole === "client") {
    this.source = "Client";
  }
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Ticket", TicketSchema);