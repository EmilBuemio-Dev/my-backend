const API_URL = "http://localhost:5000/api/users";

const form = document.getElementById("loginForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpInput = document.getElementById("otp");
const errorP = document.getElementById("error");

const changePasswordModal = document.getElementById("changePasswordModal");
const changePasswordForm = document.getElementById("changePasswordForm");

// ===== Step 1: Request OTP =====
getOtpBtn.addEventListener("click", async () => {
  errorP.textContent = "";
  const email = document.getElementById("email").value.trim();
  const badgeNumber = document.getElementById("badgeNumber").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !badgeNumber || !password) {
    errorP.textContent = "Please fill Email, Badge Number, and Password first.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, badgeNumber }),
    });

    const data = await res.json();
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

    if (!res.ok) {
      errorP.textContent = data.msg || "OTP verification failed.";
      return;
    }

    // ✅ Store data locally
    localStorage.setItem("token", data.token);
    localStorage.setItem("name", data.name);
    localStorage.setItem("role", data.role);
    localStorage.setItem("employeeId", data.employeeId || "N/A"); // always non-null

    // ✅ Redirect or show change password modal
    if (data.requirePasswordChange) {
      changePasswordModal.style.display = "flex";
      return;
    }

    window.location.href = "guardduty.html";
  } catch (err) {
    console.error("OTP verification error:", err);
    errorP.textContent = "Server error during login.";
  }
});

// ===== Change Password on First Login =====
changePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.msg || "Failed to update password.");
      return;
    }

    alert("Password updated successfully. You can now proceed.");
    changePasswordModal.style.display = "none";
    window.location.href = "guardduty.html";
  } catch (err) {
    console.error("Change password error:", err);
    alert("Server error while updating password.");
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const registerLink = document.getElementById("registerLink");
  const registerModal = document.getElementById("registerModal");
  const closeRegister = document.getElementById("closeRegister");

  // Open Register Modal
  registerLink.addEventListener("click", (e) => {
    e.preventDefault();
    registerModal.style.display = "flex";
  });

  // Close Register Modal
  closeRegister.addEventListener("click", () => {
    registerModal.style.display = "none";
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === registerModal) {
      registerModal.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");

  nextBtn.addEventListener("click", () => {
    step1.style.display = "none";
    step2.style.display = "block";
  });

  prevBtn.addEventListener("click", () => {
    step2.style.display = "none";
    step1.style.display = "block";
  });
});document.addEventListener("DOMContentLoaded", () => {
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const steps = document.querySelectorAll(".form-step");

  let currentStep = 0;

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
  }

  nextBtn.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      showStep(currentStep);
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // Initialize view
  showStep(currentStep);
});

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const familyName = document.getElementById("familyName").value.trim();
    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const badgeNo = document.getElementById("badgeNo").value.trim();

    if (!familyName || !firstName || !email || !badgeNo) {
      alert("Please fill in all required fields.");
      return;
    }

    const data = { familyName, firstName, middleName, email, badgeNo };

    try {
      const res = await fetch("http://localhost:5000/api/registers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      console.log("Response status:", res.status);
      const result = await res.json();
      console.log("Response body:", result);

      if (!res.ok) {
        alert(result.msg || "Registration failed!");
        return;
      }

      alert("Registration successful!");
      document.getElementById("registerModal").style.display = "none";
      registerForm.reset();
    } catch (err) {
      console.error("Register error:", err);
      alert("Server error during registration.");
    }
  });
});
