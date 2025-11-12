import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 587,
  secure: false, // use true only if port 465
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY?.trim(),
  },
});

// Optional: test the connection when server starts
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter failed:", error);
  } else {
    console.log("✅ Resend email transporter is ready");
  }
});

export default transporter;
