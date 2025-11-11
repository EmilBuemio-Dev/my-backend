const API_URL = "http://localhost:5000/api/users";

const form = document.getElementById("loginForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpInput = document.getElementById("otp");
const errorP = document.getElementById("error");

// ===== Step 1: Request OTP =====
getOtpBtn.addEventListener("click", async () => {
  errorP.textContent = "";
  const email = document.getElementById("email").value.trim();
  const hrIdNumber = document.getElementById("IdNumber").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !hrIdNumber || !password) {
    errorP.textContent = "Please fill Email, ID Number, and Password first.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, hrIdNumber }),
    });

    const data = await res.json();
    console.log("HR login response:", data);

    if (!res.ok) {
      errorP.textContent = data.msg || "Failed to send OTP.";
      return;
    }

    otpInput.disabled = false;
    otpInput.value = "";
    otpInput.focus();
    errorP.textContent = "OTP sent to your email.";
  } catch (err) {
    console.error("OTP request error:", err);
    errorP.textContent = "Server error while requesting OTP.";
  }
});

// ===== Step 2: Submit OTP =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.textContent = "";

  const email = document.getElementById("email").value.trim();
  const otp = otpInput.value.trim();

  if (otpInput.disabled) {
    errorP.textContent = "Please click 'Get OTP' first.";
    return;
  }

  if (!otp) {
    errorP.textContent = "Please enter the OTP.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    console.log("HR OTP verification response:", data);

    if (!res.ok) {
      errorP.textContent = data.msg || "OTP verification failed.";
      return;
    }

    // Save token + session info
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("name", data.name);

    // Redirect to HR dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("OTP verification error:", err);
    errorP.textContent = "Server error during login.";
  }
});
