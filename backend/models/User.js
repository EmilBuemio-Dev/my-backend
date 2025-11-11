import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "employee", "hr", "client"],
      required: true,
      default: "employee",
    },

    // IDs for specific roles
    badgeNumber: { type: String, trim: true },   // Employee
    hrIdNumber: { type: String, trim: true },    // HR
    clientIdNumber: { type: String, trim: true },// Client

    // Branch for employee/client
    branch: { type: String, trim: true },

    // ✅ Link to Employee collection
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },

    otp: String,
    otpExpires: Date,

    // ✅ Track first login
    firstLogin: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "user",
  }
);

export default mongoose.model("User", userSchema);
