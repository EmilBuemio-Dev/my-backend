import express from "express";
import resend from "../config/email.js";

const router = express.Router();

// POST /api/email/send
router.post("/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing email fields." });
    }

    // Send email through Resend
    const result = await resend.emails.send({
      from: "noreply@mither3security.com", // MUST BE VERIFIED IN RESEND
      to,
      subject,
      html: html || `<p>${text}</p>`
    });

    if (result.error) {
      console.error("❌ Resend error:", result.error);
      return res.status(400).json({ error: result.error.message });
    }

    res.json({
      msg: "Email sent successfully",
      emailId: result.data?.id
    });
  } catch (err) {
    console.error("❌ Email sending error:", err);
    res.status(500).json({ error: "Failed to send email.", details: err.message });
  }
});

export default router;
