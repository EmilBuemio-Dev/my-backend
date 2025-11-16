import mongoose from "mongoose";

const RemarkSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    penaltyLevel: {
      type: String,
      enum: ["Light", "Least Grave", "Grave"],
      required: true,
    },
    dueProcess: {
      type: String,
      enum: ["Notice", "Appearance"],
      required: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    ticketSubject: {
      type: String,
      default: null,
    },
    ticketDetails: {
      concern: String,
      creatorName: String,
      creatorRole: String,
      rating: String,
      source: String,
      createdAt: Date,
    },
    hrComment: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Resolved"],
      default: "Pending",
    },
    createdBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    updatedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      timestamp: Date,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Remark", RemarkSchema);