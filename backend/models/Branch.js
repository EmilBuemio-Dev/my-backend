import mongoose from "mongoose";

const defaultString = (val) => val || "N/A";

const branchSchema = new mongoose.Schema(
  {
    role: { type: String, default: "client" },
    clientIdNumber: { type: String, required: true, unique: true },
    contract: { type: String, default: "N/A" },
    credentials: {
      type: Object,
      default: () => ({ profileImage: "/image/default-profile.png" })
    },
    guardShift: {
      type: Object,
      default: () => ({ day: "N/A", night: "N/A" })
    },
    branchData: {
      type: Object,
      default: () => ({
        name: "N/A",
        email: "N/A",
        branch: "N/A",
        password: "",
        contactNumber: "N/A" // ✅ Added new field
      })
    },
    salary: { type: Number, default: null },
    expirationDate: { type: Date, default: null }
  },
  { timestamps: true }
);

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
