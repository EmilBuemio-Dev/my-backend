// routes/accountRoutes.js
import express from "express";
import Account from "../models/Account.js";
import Archive from "../models/Archive.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Helper: safe JSON parse
function safeParse(str, fallback) {
  if (typeof str === "string") {
    try {
      return JSON.parse(str || (Array.isArray(fallback) ? "[]" : "{}"));
    } catch (e) {
      console.warn("safeParse failed:", e.message);
      return fallback;
    }
  }
  return str ?? fallback;
}

function isValidBranch(branch) {
  if (!branch) return false;
  const invalidValues = ["toBeSet", "N/A", "", null, undefined];
  return !invalidValues.includes(branch);
}

router.post(
  "/",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "contract", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const role = req.body.role;

      // ===== CLIENT =====
      if (role === "client") {
        const guardShift = req.body.guardShift ? safeParse(req.body.guardShift, {}) : {};

        const clientData = {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          branch: req.body.branch,
          guardShift,
          contract: req.files.contract ? `/uploads/contracts/${req.files.contract[0].filename}` : undefined,
          credentials: {},
        };

        if (req.files.profileImage) {
          clientData.credentials.profileImage = `/uploads/client_profiles/${req.files.profileImage[0].filename}`;
        }

        const clientAccount = new Account({
          role,
          status: "Pending",
          clientData,
        });

        await clientAccount.save();
        return res.status(201).json({ message: "Client account created", account: clientAccount });
      }

      // ===== EMPLOYEE =====
      if (role === "employee") {
        const basicInformation = safeParse(req.body.basicInformation, {});
        const personalData = safeParse(req.body.personalData, {});
        const educationalBackground = safeParse(req.body.educationalBackground, []);
        const credentials = req.body.credentials ? safeParse(req.body.credentials, {}) : {};

        if (req.files.profileImage) {
          credentials.profileImage = `/uploads/employee_profiles/${req.files.profileImage[0].filename}`;
        }

        const employeeAccount = new Account({
          role,
          status: req.body.status || "Pending",
          employeeData: {
            basicInformation,
            personalData,
            educationalBackground,
            credentials,
          },
        });

        await employeeAccount.save();
        return res.status(201).json({ message: "Employee account created", account: employeeAccount });
      }

      return res.status(400).json({ error: "Invalid role provided" });
    } catch (err) {
      console.error("❌ Error creating account:", err);
      res.status(500).json({ error: "Failed to create account" });
    }
  }
);

router.post("/approve/:archiveId", upload.single("employeeProfile"), async (req, res) => {
  try {
    const { archiveId } = req.params;
    const archived = await Archive.findById(archiveId);
    if (!archived) return res.status(404).json({ error: "Archive record not found" });

    // ✅ Parse incoming data
    const incomingBasic = safeParse(req.body.basicInformation, {});
    const incomingPersonal = safeParse(req.body.personalData, {});
    const incomingEducation = safeParse(req.body.educationalBackground, []);
    const incomingFirearms = safeParse(req.body.firearmsIssued, []);

    console.log("📥 INCOMING APPROVAL DATA:");
    console.log("   Basic info:", JSON.stringify(incomingBasic, null, 2));

    // ✅ GET BRANCH VALUE - USE INCOMING DATA
    const submittedBranch = incomingBasic.branch;
    console.log("📌 Branch value:", submittedBranch);
    console.log("📌 Branch type:", typeof submittedBranch);

    // ✅ DETERMINE STATUS: Valid branch = Approved, Invalid/toBeSet = Pending
    const hasBranch = isValidBranch(submittedBranch);
    const accountStatus = hasBranch ? "Approved" : "Pending";

    console.log("✅ STATUS DETERMINATION:");
    console.log("   hasBranch:", hasBranch);
    console.log("   Final status:", accountStatus);

    // ✅ MERGE DATA WITH PRIORITY TO INCOMING
    const newAccountData = {
      role: "employee",
      status: accountStatus, // ✅ Use determined status
      employeeData: {
        basicInformation: { 
          ...(archived.basicInformation || {}), 
          ...incomingBasic,
          branch: submittedBranch, // ✅ Preserve exact branch value
        },
        personalData: { 
          ...(archived.personalData || {}), 
          ...incomingPersonal 
        },
        educationalBackground: incomingEducation.length ? incomingEducation : (archived.educationalBackground || []),
        firearmsIssued: incomingFirearms.length ? incomingFirearms : (archived.firearmsIssued || []),
        credentials: archived.credentials || {},
      },
    };

    // ✅ Add profile image if provided
    if (req.file) {
      newAccountData.employeeData.credentials = {
        ...(newAccountData.employeeData.credentials || {}),
        profileImage: `/uploads/employee_profiles/${req.file.filename}`,
      };
    }

    // ✅ SAVE ACCOUNT
    const newAccount = new Account(newAccountData);
    await newAccount.save();

    console.log("✅ ACCOUNT SAVED:");
    console.log("   ID:", newAccount._id);
    console.log("   Status:", newAccount.status);
    console.log("   Branch:", newAccount.employeeData.basicInformation.branch);

    // ✅ DELETE ARCHIVE RECORD
    await Archive.findByIdAndDelete(archiveId);

    res.status(201).json({ 
      message: "Employee created successfully",
      newAccount,
      status: accountStatus,
      branch: submittedBranch
    });
  } catch (err) {
    console.error("❌ Error approving employee:", err);
    res.status(500).json({ error: err.message || "Failed to approve employee" });
  }
});

/* GET ALL ACCOUNTS */
router.get("/", async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/* ✅ GET PENDING EMPLOYEE ACCOUNTS (no valid branch) */
router.get("/employees/pending", async (req, res) => {
  try {
    const pendingAccounts = await Account.find({
      role: "employee",
      status: "Pending",
      "employeeData.basicInformation.branch": { 
        $in: [null, "", "toBeSet", "N/A", undefined] 
      }
    });
    console.log("📋 Found pending accounts:", pendingAccounts.length);
    res.json(pendingAccounts);
  } catch (err) {
    console.error("❌ Error fetching pending accounts:", err);
    res.status(500).json({ error: "Failed to fetch pending accounts" });
  }
});

/* ✅ GET APPROVED EMPLOYEE ACCOUNTS (valid branch) */
router.get("/employees/approved", async (req, res) => {
  try {
    const approvedAccounts = await Account.find({
      role: "employee",
      status: "Approved",
      "employeeData.basicInformation.branch": { 
        $nin: [null, "", "toBeSet", "N/A", undefined] 
      }
    });
    console.log("📋 Found approved accounts:", approvedAccounts.length);
    res.json(approvedAccounts);
  } catch (err) {
    console.error("❌ Error fetching approved accounts:", err);
    res.status(500).json({ error: "Failed to fetch approved accounts" });
  }
});

/* ✅ UPDATE ACCOUNT STATUS AND BRANCH */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { branch, shift, salary, expiryDate, status } = req.body;

    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ error: "Account not found" });

    if (account.role !== "employee") {
      return res.status(400).json({ error: "Only employee accounts can be updated" });
    }

    // ✅ Update basic information
    if (account.employeeData?.basicInformation) {
      if (branch !== undefined && isValidBranch(branch)) {
        account.employeeData.basicInformation.branch = branch;
      }
      if (shift) account.employeeData.basicInformation.shift = shift;
      if (salary) account.employeeData.basicInformation.salary = salary;
      if (expiryDate) account.employeeData.basicInformation.expiryDate = expiryDate;
    }

    // ✅ Update status based on branch validity
    if (branch !== undefined) {
      if (isValidBranch(branch)) {
        account.status = "Approved";
      } else {
        account.status = "Pending";
      }
    } else if (status) {
      account.status = status;
    }

    await account.save();
    res.json({ message: "Account updated successfully", account });
  } catch (err) {
    console.error("❌ Error updating account:", err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

/* ✅ GET SINGLE ACCOUNT BY ID */
router.get("/:id", async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json(account);
  } catch (err) {
    console.error("❌ Error fetching account by ID:", err);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

/* DELETE ACCOUNT */
router.delete("/:id", async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;