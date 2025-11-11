import mongoose from "mongoose";

const requirementSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  branch: { type: String, required: true },
  salary: { type: Number, required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
}, { timestamps: true });

const Requirement = mongoose.model("Requirement", requirementSchema);
export default Requirement;
