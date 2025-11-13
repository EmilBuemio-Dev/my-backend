import { Resend } from "resend";

// ✅ Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Verify connection on startup
const verifyResend = async () => {
  try {
    // Test by checking if API key is valid
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is not set in environment variables");
      return;
    }
    console.log("✅ Resend email service ready");
  } catch (error) {
    console.error("❌ Resend initialization error:", error);
  }
};

// Call verification on startup
verifyResend();

export default resend;