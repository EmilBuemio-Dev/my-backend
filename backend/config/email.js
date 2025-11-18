import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);


const verifyResend = async () => {
  try {

    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is not set in environment variables");
      return;
    }
    console.log("✅ Resend email service ready");
  } catch (error) {
    console.error("❌ Resend initialization error:", error);
  }
};

verifyResend();

export default resend;