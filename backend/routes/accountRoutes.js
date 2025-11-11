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

/* CREATE ACCOUNT (employee or client) */
router.post(
  "/",
  upload.fields([
    { name: "profileImage", maxCount: 1 }, // employee or client profile
    { name: "contract", maxCount: 1 },     // client contract
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
          password: req.body.password, // hash if needed
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

/* APPROVE ARCHIVE -> MOVE TO ACCOUNT */
/* APPROVE ARCHIVE -> MOVE TO ACCOUNT */
router.post("/approve/:archiveId", upload.single("employeeProfile"), async (req, res) => {
  try {
    const { archiveId } = req.params;
    const archived = await Archive.findById(archiveId);
    if (!archived) return res.status(404).json({ error: "Archive record not found" });

    const incomingBasic = safeParse(req.body.basicInformation, {});
    const incomingPersonal = safeParse(req.body.personalData, {}); // now has familyName, firstName, middleName
    const incomingEducation = safeParse(req.body.educationalBackground, []);
    const incomingFirearms = safeParse(req.body.firearmsIssued, []);

    const newAccountData = {
      role: "employee",
      status: "Approved",
      employeeData: {
        basicInformation: { ...(archived.basicInformation || {}), ...incomingBasic },
        personalData: { ...(archived.personalData || {}), ...incomingPersonal },
        educationalBackground: incomingEducation.length ? incomingEducation : (archived.educationalBackground || []),
        firearmsIssued: incomingFirearms.length ? incomingFirearms : (archived.firearmsIssued || []),
        credentials: archived.credentials || {},
      },
    };

    if (req.file) {
      newAccountData.employeeData.credentials = {
        ...(newAccountData.employeeData.credentials || {}),
        profileImage: `/uploads/employee_profiles/${req.file.filename}`,
      };
    }

    const newAccount = new Account(newAccountData);
    await newAccount.save();
    await Archive.findByIdAndDelete(archiveId);

    res.status(201).json({ message: "Employee approved successfully", newAccount });
  } catch (err) {
    console.error("❌ Error approving employee:", err);
    res.status(500).json({ error: "Failed to approve employee" });
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

router.put("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find the account
    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ error: "Account not found" });

    // 2️⃣ Only approve employees
    if (account.role !== "employee") {
      return res.status(400).json({ error: "Only employee accounts can be approved here." });
    }

    // 3️⃣ Extract full employee data
    const employeeData = account.employeeData || {};

    // 4️⃣ Create and save to Employee collection
    const newEmployee = new Employee({
      role: "employee",
      status: "Approved",
      employeeData,
    });

    const savedEmployee = await newEmployee.save();

    // 5️⃣ Update account status (optional)
    account.status = "Approved";
    await account.save();

    res.status(200).json({
      msg: "Employee approved and data stored in Employee collection.",
      employee: savedEmployee,
    });
  } catch (err) {
    console.error("❌ Error approving employee:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SINGLE ACCOUNT BY ID
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
