import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import resend from "../config/email.js"; // ✅ Import from config, not initialize here
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ===== REGISTER (HR + Admin) =====
router.post(
  "/register",
  authMiddleware,
  roleMiddleware(["admin", "hr"]),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        badgeNumber,
        hrIdNumber,
        clientIdNumber,
        branch,
        employeeId,
        contract,
        salary,
        guardShift,
      } = req.body;

      if (!email || !password || !role) {
        return res.status(400).json({ msg: "Missing required fields" });
      }

      // ✅ Find by email or clientIdNumber to avoid duplicates
      const lookupConditions = [{ email }];
      if (clientIdNumber && clientIdNumber.trim() !== "") {
        lookupConditions.push({ clientIdNumber });
      }

      let existingUser = await User.findOne({ $or: lookupConditions });

      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ If user exists, update existing record instead of creating new one
      if (existingUser) {
        // ✅ Handle client branch linking/update
        if (role === "client") {
          let branchDoc = await Branch.findOne({ clientIdNumber });

          if (branchDoc) {
            // Update branch if exists
            branchDoc.branchData = {
              ...branchDoc.branchData,
              name,
              email,
              branch,
            };
            branchDoc.contract = contract || branchDoc.contract;
            branchDoc.salary = salary || branchDoc.salary;
            branchDoc.guardShift = guardShift || branchDoc.guardShift;
            await branchDoc.save();
            existingUser.branchId = branchDoc._id;
          } else {
            // Create branch if not exists
            const newBranch = new Branch({
              role: "client",
              clientIdNumber,
              branchData: { name, email, branch },
              contract: contract || null,
              salary: salary || null,
              guardShift: guardShift || [],
            });
            const savedBranch = await newBranch.save();
            existingUser.branchId = savedBranch._id;
          }
        }

        if (existingUser.employeeId?.toString() !== employeeId?.toString()) {
          return res.status(400).json({
            msg: "Email already exists. Use a different email address.",
          });
        }
      }

      // ✅ Otherwise, create a brand-new user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role,
        badgeNumber: role === "employee" ? badgeNumber : undefined,
        hrIdNumber: role === "hr" ? hrIdNumber : undefined,
        clientIdNumber: role === "client" ? clientIdNumber : undefined,
        branch: role === "employee" || role === "client" ? branch : undefined,
        employeeId: role === "employee" ? employeeId || null : undefined,
      });

      // ✅ If registering a client, create or link branch
      if (role === "client") {
        let existingBranch = await Branch.findOne({ clientIdNumber });

        if (existingBranch) {
          existingBranch.branchData = {
            ...existingBranch.branchData,
            name,
            email,
            branch,
          };
          existingBranch.contract = contract || existingBranch.contract;
          existingBranch.salary = salary || existingBranch.salary;
          existingBranch.guardShift = guardShift || existingBranch.guardShift;
          await existingBranch.save();
          user.branchId = existingBranch._id;
        } else {
          const newBranch = new Branch({
            role: "client",
            clientIdNumber,
            branchData: { name, email, branch },
            contract: contract || null,
            salary: salary || null,
            guardShift: guardShift || [],
          });
          const savedBranch = await newBranch.save();
          user.branchId = savedBranch._id;
        }
      }

      await user.save();

      res.json({
        msg: "User registered successfully",
        userId: user._id,
        branchId: user.branchId || null,
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).send("Server error");
    }
  }
);

// ===== LOGIN (Step 1: Verify password & send OTP) =====
router.post("/login", async (req, res) => {
  let { email, password, badgeNumber, hrIdNumber, clientIdNumber } = req.body;

  try {
    email = email?.trim();
    password = password?.trim();
    badgeNumber = badgeNumber?.trim();
    hrIdNumber = hrIdNumber?.trim();
    clientIdNumber = clientIdNumber?.trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid Email or Password" });

    // Validate role-specific IDs
    if (user.role === "employee" && (!badgeNumber || user.badgeNumber?.trim() !== badgeNumber)) {
      return res.status(400).json({ msg: "Invalid badge number" });
    }
    if (user.role === "hr" && user.hrIdNumber?.trim() !== hrIdNumber) {
      return res.status(400).json({ msg: "Invalid HR ID number" });
    }
    if (user.role === "client" && user.clientIdNumber?.trim() !== clientIdNumber) {
      return res.status(400).json({ msg: "Invalid Client ID number" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // ✅ Send OTP using Resend (imported from config)
    try {
      console.log("🔄 Attempting to send OTP to:", user.email);
      console.log("📧 Resend instance:", resend ? "Initialized" : "NOT initialized");
      console.log("🔑 RESEND_API_KEY set:", process.env.RESEND_API_KEY ? "Yes" : "NO - THIS IS THE PROBLEM");

      const result = await resend.emails.send({
        from: "noreply@resend.dev",
        to: user.email,
        subject: "Your Login OTP",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #333;">Login Verification</h2>
            <p style="color: #555;">Your OTP code is:</p>
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 20px 0;">${otp}</h1>
            <p style="color: #666;">This OTP will expire in 5 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      console.log("📬 Resend response:", result);

      if (result.error) {
        console.error("❌ Resend API error:", result.error);
        return res.status(500).json({ msg: "Failed to send OTP email.", error: result.error.message });
      }

      console.log("✅ OTP email sent successfully:", result.data.id);
    } catch (emailErr) {
      console.error("❌ Error sending OTP email:", emailErr.message);
      console.error("Full error:", emailErr);
      return res.status(500).json({ msg: "Failed to send OTP email.", error: emailErr.message });
    }

    res.json({ msg: "OTP sent to your email." });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ===== VERIFY OTP =====
router.post("/verify-otp", async (req, res) => {
  let { email, otp } = req.body;

  try {
    email = email?.trim();
    otp = otp?.trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const otpExpiresTime = user.otpExpires ? new Date(user.otpExpires).getTime() : 0;
    if (!user.otp || user.otp !== otp || Date.now() > otpExpiresTime) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Create JWT payload
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    // ✅ Unified response for all roles
    const response = {
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientIdNumber: user.clientIdNumber || null,
      badgeNumber: user.badgeNumber || null,
      employeeId: user.employeeId || null,
      branch: user.branch || null,
      branchId: user.branchId || null,
      msg: "Login successful",
      requirePasswordChange:
        user.role === "employee" && user.firstLogin === true,
    };

    res.json(response);
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ===== CHANGE PASSWORD =====
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ msg: "New password is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.firstLogin = false; // ✅ Mark first login as done
    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ===== GET ALL USERS =====
router.get("/", authMiddleware, roleMiddleware(["admin", "hr"]), async (req, res) => {
  try {
    const users = await User.find().populate("branchId");

    // Enrich branch display for employee users
    const enriched = users.map((u) => {
      let branchName = "-";
      if (u.role === "employee") {
        branchName = u.branch || "-";
      } else if (u.role === "client" && u.branchId) {
        branchName = u.branchId.branchData?.name || "-";
      }
      return {
        ...u._doc,
        branchDetails: { name: branchName },
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("❌ Fetch users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;