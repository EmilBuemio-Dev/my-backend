// login.js (updated)

// API URL
const API_URL = "http://localhost:5000/api/users";

const form = document.getElementById("loginForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpInput = document.getElementById("otp");
const errorP = document.getElementById("error");

// ===== Step 1: Request OTP =====
getOtpBtn.addEventListener("click", async () => {
  errorP.textContent = "";
  const email = document.getElementById("email").value.trim();
  const clientIdNumber = document.getElementById("IdNumber").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !clientIdNumber || !password) {
    errorP.textContent = "Please fill Email, ID Number, and Password first.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, clientIdNumber }),
    });

    const data = await res.json();
    console.log("Client login response:", data);

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
    console.log("Client OTP verification response:", data);

    if (!res.ok) {
      errorP.textContent = data.msg || "OTP verification failed.";
      return;
    }

    // ✅ Save full client info + token in localStorage
    const userData = {
  _id: data._id,
  name: data.name,
  email: data.email,
  role: data.role,
  clientIdNumber: data.clientIdNumber,
  branch: data.branch,   // human-readable branch name
  branchId: data.branchId,  // ✅ store the ID too
  token: data.token
};

    localStorage.setItem("user", JSON.stringify(userData));

    // Redirect to Client portal
    window.location.href = "client_portal.html";
  } catch (err) {
    console.error("OTP verification error:", err);
    errorP.textContent = "Server error during login.";
  }
});
