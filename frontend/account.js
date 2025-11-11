const API_URL = "http://localhost:5000/api/users";
const BRANCH_API = "http://localhost:5000/api/branches";
const EMPLOYEE_API = "http://localhost:5000/employees";
const CLIENT_API = "http://localhost:5000/api/branches";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

// === Access Protection (HR or Admin only) ===
if (!token || role !== "hr") {
  alert("Access denied. HR only!");
  window.location.href = "dashboard.html";
}

const branchSelect = document.getElementById("branch");

// === Load Branches ===
async function loadBranches() {
  try {
    const res = await fetch(BRANCH_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch branches");
    const branches = await res.json();

    branchSelect.innerHTML = `<option value="">Select Branch (Employee/Client only)</option>`;
    branches.forEach((b) => {
      const branchName = b.branchData?.name || b.branchData?.branch || b.name || b._id;
      branchSelect.innerHTML += `<option value="${branchName}">${branchName}</option>`;
    });
  } catch (err) {
    console.error("❌ Failed to load branches:", err);
  }
}
loadBranches();

// === Enable/Disable Branch Field Based on Role ===
document.getElementById("role").addEventListener("change", (e) => {
  const selected = e.target.value;
  if (selected === "employee" || selected === "client") {
    branchSelect.disabled = false;
  } else {
    branchSelect.disabled = true;
    branchSelect.value = "";
  }
});

// === Register New User ===
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    role: document.getElementById("role").value,
    branch: branchSelect.value || null,
    badgeNumber: document.getElementById("badgeNumber").value.trim(),
    hrIdNumber: document.getElementById("hrIdNumber").value.trim(),
    clientIdNumber: document.getElementById("clientIdNumber").value.trim(),
  };

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.msg || "Registration failed");
    alert(result.msg || "User registered successfully");
    loadUsers();
  } catch (err) {
    console.error("❌ Registration error:", err);
    alert(err.message || "Server error");
  }
});

// === Load All Users ===
async function loadUsers() {
  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("❌ Failed to fetch users:", res.status);
      return;
    }

    const users = await res.json();
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";

    if (!Array.isArray(users) || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No users found.</td></tr>`;
      return;
    }

    users.forEach((u) => {
      const identifier =
        u.role === "employee"
          ? u.badgeNumber || "-"
          : u.role === "hr"
          ? u.hrIdNumber || "-"
          : u.role === "client"
          ? u.clientIdNumber || "-"
          : "-";

      const branchName =
        u.branch && typeof u.branch === "object"
          ? u.branch?.name || u.branch?.branch || "-"
          : typeof u.branch === "string" && u.branch.trim() !== ""
          ? u.branch
          : u.branchDetails?.name || "-";


      const row = `
        <tr>
          <td>${u.name || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>${u.role || "-"}</td>
          <td>${identifier}</td>
          <td>${branchName}</td>
          <td>
            <button class="delete-btn" onclick="deleteUser('${u._id}')">Delete</button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("❌ Load users error:", err);
  }
}

// === Delete User ===
async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await res.json();
    alert(result.msg || "User deleted");
    loadUsers();
  } catch (err) {
    console.error("❌ Delete user error:", err);
    alert("Server error");
  }
}


// === Sync Approved Employees & Clients to Users ===
async function syncAccountsToUsers() {
  try {
    const [empRes, clientRes, userRes] = await Promise.all([
      fetch(EMPLOYEE_API, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(CLIENT_API, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const [employees, clients, users] = await Promise.all([
      empRes.json(),
      clientRes.json(),
      userRes.json(),
    ]);

    const existingEmails = new Set(users.map((u) => u.email));

    // === Sync Employees
    for (const emp of employees) {
      const email = emp.employeeData?.personalData?.email;
      if (email && !existingEmails.has(email)) {
        await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: emp.employeeData?.basicInformation?.fullName || "Unnamed Employee",
            email,
            password: "temporary123",
            role: "employee",
            badgeNumber: emp.employeeData?.basicInformation?.badgeNo || "",
            branch: emp.employeeData?.basicInformation?.branch || "",
          }),
        });
      }
    }

    // === Sync Clients
    for (const client of clients) {
      const email = client.branchData?.email;
      if (email && !existingEmails.has(email)) {
        await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: client.branchData?.name || "Unnamed Client",
            email,
            password: "temporary123",
            role: "client",
            clientIdNumber: client.clientIdNumber || "",
            branch: client.branchData?.name || "",
          }),
        });
      }
    }

    loadUsers();
  } catch (err) {
    console.error("❌ Sync error:", err);
  }
}

// === Delete User ===
async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await res.json();
    alert(result.msg || "User deleted");
    loadUsers();
  } catch (err) {
    console.error("❌ Delete user error:", err);
    alert("Server error");
  }
}

// === Initial Load ===
loadUsers();
syncAccountsToUsers();
