import mongoose from "mongoose";

const registerSchema = new mongoose.Schema(
  {
    familyName: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    email: { type: String, required: true, unique: true },
    badgeNo: { type: String, required: true, unique: true },

    // Face Recognition Fields
    faceEnrollmentId: { type: String, unique: true, sparse: true },
    descriptor: { type: [Number], required: true }, // Face-api descriptor (128 values)
    faceLivenessConfidence: { type: Number, min: 0, max: 1 },
    faceEnrollmentDate: { type: Date },
    faceEnrollmentStatus: {
      type: String,
      enum: ["enrolled", "pending", "failed"],
      default: "pending",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true }
);


export default mongoose.model("Register", registerSchema);