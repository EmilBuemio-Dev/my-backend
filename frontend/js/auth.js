const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const currentPage = window.location.pathname;

// Protect Admin + HR pages (shared access)
if (
  currentPage.includes("Feedback&Complaints.html") ||
  currentPage.includes("dashboard.html") ||
  currentPage.includes("employeedashboard.html") ||
  currentPage.includes("message.html") ||
  currentPage.includes("archiveReq.html")
) {
  if (!token || (role !== "admin" && role !== "hr")) {
    // Redirect based on role
    if (role === "hr") {
      window.location.href = "hr_login.html";
    } else {
      window.location.href = "admin.html";
    }
  }
}

// Protect Client page
if (currentPage.includes("client_portal.html")||
 currentPage.includes("clienProfile.html")) {
  if (!token || role !== "client") {
    window.location.href = "loginSection.html";
  }
}

// Protect Employee page
if (
  currentPage.includes("guardduty.html")||
  currentPage.includes("employeeProfile.html")) {
  if (!token || role !== "employee") {
    window.location.href = "loginSection.html";
  }
}

// Logout button (works for all roles)
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    const userRole = localStorage.getItem("role");
    localStorage.clear();

    if (userRole === "admin") {
      window.location.href = "admin.html";
    } else if (userRole === "hr") {
      window.location.href = "hr_login.html";
    } else if (userRole === "client") {
      window.location.href = "client_login.html";
    } else if (userRole === "employee") {
      window.location.href = "employee_login.html";
    } else {
      window.location.href = "index.html";
    }
  });
}
