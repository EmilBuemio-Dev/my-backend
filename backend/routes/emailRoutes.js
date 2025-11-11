import express from "express";
import transporter from "../config/email.js";

const router = express.Router();

// POST /api/email/send
router.post("/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing email fields." });
    }

    await transporter.sendMail({
      from: `"Mither3 Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    res.json({ msg: "Email sent successfully." });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

export default router;
