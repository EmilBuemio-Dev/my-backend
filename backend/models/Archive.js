import mongoose from "mongoose";

const archiveSchema = new mongoose.Schema({
  familyName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String },
  badgeNo: { type: String, required: true },
  position: { type: String, default: "Guard" },
  status: { type: String, default: "Pending" },
  credentials: {
    barangayClearance: String,
    policeClearance: String,
    diClearance: String,
    nbiClearance: String,
    personalHistory: String,
    residenceHistory: String,
    maritalStatus: String,
    physicalData: String,
    educationData: String,
    characterReference: String,
    employmentHistory: String,
    neighborhoodInvestigation: String,
    militaryRecord: String,
  },
  createdAt: { type: Date, default: Date.now },
});

archiveSchema.virtual("requirementStatus").get(function () {
  const requiredDocs = [
    "barangayClearance",
    "policeClearance",
    "diClearance",
    "nbiClearance",
    "personalHistory",
    "residenceHistory",
    "maritalStatus",
    "physicalData",
    "educationData",
    "characterReference",
    "employmentHistory",
    "neighborhoodInvestigation",
    "militaryRecord",
  ];
  const missing = requiredDocs.filter((f) => !this.credentials?.[f]);
  return { complete: missing.length === 0, missing };
});

archiveSchema.set("toJSON", { virtuals: true });
archiveSchema.set("toObject", { virtuals: true });

export default mongoose.model("Archive", archiveSchema);
