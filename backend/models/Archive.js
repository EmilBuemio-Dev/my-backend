import mongoose from "mongoose";

const archiveSchema = new mongoose.Schema(
  {
    familyName: { 
      type: String, 
      required: true,
      trim: true,
      index: true 
    },
    firstName: { 
      type: String, 
      required: true,
      trim: true,
      index: true 
    },
    middleName: { 
      type: String,
      trim: true,
      default: ""
    },
    badgeNo: { 
      type: String, 
      required: true,
      unique: true,
      index: true 
    },
    position: { 
      type: String, 
      default: "Guard",
      trim: true 
    },
    status: { 
      type: String, 
      default: "Pending",
      enum: ["Pending", "Approved", "Rejected"],
      index: true 
    },
    credentials: {
      barangayClearance: { type: String, default: "" },
      policeClearance: { type: String, default: "" },
      diClearance: { type: String, default: "" },
      nbiClearance: { type: String, default: "" },
      personalHistory: { type: String, default: "" },
      residenceHistory: { type: String, default: "" },
      maritalStatus: { type: String, default: "" },
      physicalData: { type: String, default: "" },
      educationData: { type: String, default: "" },
      characterReference: { type: String, default: "" },
      employmentHistory: { type: String, default: "" },
      neighborhoodInvestigation: { type: String, default: "" },
      militaryRecord: { type: String, default: "" },
    },
    createdAt: { 
      type: Date, 
      default: Date.now,
      index: true 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ===== Virtual Field: Requirement Status =====
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
  
  const missing = requiredDocs.filter((doc) => !this.credentials?.[doc]);
  
  return {
    complete: missing.length === 0,
    missing,
    totalRequired: requiredDocs.length,
    uploaded: requiredDocs.length - missing.length,
  };
});

// ===== Create Compound Index for faster queries =====
archiveSchema.index({ familyName: 1, firstName: 1, middleName: 1 });
archiveSchema.index({ status: 1, createdAt: -1 });

// ===== Pre-save middleware to update timestamp =====
archiveSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Archive", archiveSchema);