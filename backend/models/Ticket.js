import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorRole: { type: String, enum: ["employee", "client"], required: true },
  creatorName: { type: String },
  branch: { type: String, default: null },
  reportedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  reportedEmployeeName: { type: String, default: null },
  subject: { type: String, required: true },
  concern: { type: String, required: true },
  source: { type: String, default: "Guard" },
  rating: { type: Number, min: 1, max: 5, default: null }, // ⭐ updated
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

TicketSchema.pre("save", function (next) {
  if (this.creatorRole === "client") {
    this.status = "Urgent";
    this.source = "Client";
  }
  next();
});

export default mongoose.model("Ticket", TicketSchema);
