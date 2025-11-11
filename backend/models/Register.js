import mongoose from "mongoose";

const registerSchema = new mongoose.Schema(
  {
    familyName: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    email: { type: String, required: true },
    badgeNo: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Register", registerSchema);
