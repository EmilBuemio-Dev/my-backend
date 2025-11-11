const API_URL = "http://localhost:5000/api/users";

const form = document.getElementById("loginForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpInput = document.getElementById("otp");
const errorP = document.getElementById("error");

// 1) Request OTP
getOtpBtn.addEventListener("click", async () => {
  errorP.textContent = "";
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    errorP.textContent = "Please enter email and password first.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorP.textContent = data.msg || "Failed to send OTP.";
      return;
    }

    otpInput.disabled = false;
    otpInput.focus();
    errorP.textContent = "OTP sent to your email.";
  } catch {
    errorP.textContent = "Server error while requesting OTP.";
  }
});

// 2) Submit with OTP to get token
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.textContent = "";

  const email = document.getElementById("email").value;
  const otp = otpInput.value;

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

    if (!res.ok) {
      errorP.textContent = data.msg || "OTP verification failed.";
      return;
    }

    if (data.role !== "admin") {
      errorP.textContent = "Only admins can log in.";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name);
    localStorage.setItem("role", data.role);
    window.location.href = "dashboard.html";
  } catch {
    errorP.textContent = "Server error during login.";
  }
});
