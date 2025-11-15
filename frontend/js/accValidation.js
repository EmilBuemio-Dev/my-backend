
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("role");
    localStorage.clear();
    if (userRole === "hr") {
      window.location.href = "loginSection.html";
    } else {
      window.location.href = "loginSection.html";
    }
  });
}

async function parseError(res) {
  try {
    const data = await res.clone().json();
    return data.error || data.msg || JSON.stringify(data);
  } catch {
    try {
      return await res.clone().text();
    } catch {
      return "Unknown error";
    }
  }
}

// ===== ID / Password Generators =====
function generateClientId() {
  return `C-${Math.floor(100000 + Math.random() * 900000)}`;
}
function generatePassword() {
  return `employee${Math.floor(100000 + Math.random() * 900000)}`;
}

// ===== Local Cache for Temporary Client IDs =====
function getCachedClientId(tempId) {
  const cache = JSON.parse(localStorage.getItem("clientIdCache") || "{}");
  return cache[tempId];
}
function setCachedClientId(tempId, clientId) {
  const cache = JSON.parse(localStorage.getItem("clientIdCache") || "{}");
  cache[tempId] = clientId;
  localStorage.setItem("clientIdCache", JSON.stringify(cache));
}
function removeCachedClientId(tempId) {
  const cache = JSON.parse(localStorage.getItem("clientIdCache") || "{}");
  delete cache[tempId];
  localStorage.setItem("clientIdCache", JSON.stringify(cache));
}

// ===== DOM Elements =====
const branchList = document.getElementById("branchList");
const clientSearchInput = document.getElementById("clientSearchInput");
const employeeTableBody = document.getElementById("employeeTableBody");
const viewModal = document.getElementById("viewModal");
const detailsContainer = document.getElementById("detailsContainer");

// ===== CLIENT MANAGEMENT =====
let editMode = false; // ✅ track mode

const editBtn = document.getElementById("editBtn");
editBtn?.addEventListener("click", async () => {
  if (!editMode) {
    editMode = true;
    editBtn.textContent = "Save";
    Array.from(branchList.children).forEach(row => {
      const salaryCell = row.querySelector(".salary-cell");
      const expCell = row.querySelector(".exp-cell");
      if (salaryCell) {
        const val = salaryCell.textContent.trim() === "N/A" ? "" : salaryCell.textContent.trim();
        salaryCell.innerHTML = `<input type="number" class="salary-input" value="${val}" min="0">`;
      }
      if (expCell) {
        const val = expCell.textContent.trim() === "N/A" ? "" : expCell.textContent.trim();
        expCell.innerHTML = `<input type="date" class="exp-input" value="${val}">`;
      }
      const actionCell = row.querySelector(".action-cell");
      if (actionCell) {
        actionCell.innerHTML = `<button class="remove-btn">Remove</button>`;
        const id = row.getAttribute("data-id");
        actionCell.querySelector(".remove-btn").onclick = () => confirmRemoveClient(id);
      }
    });
  } else {
    await saveChanges();
    editMode = false;
    editBtn.textContent = "Edit";
    loadClients();
  }
});

async function confirmRemoveClient(id) {
  if (confirm("Are you sure you want to remove this client's account?")) {
    try {
      const res = await fetch(`https://www.mither3security.com/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseError(res));
      alert("Client account removed successfully.");
      loadClients();
    } catch (err) {
      alert("Failed to remove client: " + err.message);
    }
  }
}

// ===== Save Salary & Exp Date =====
async function saveChanges() {
  const updates = [];
  Array.from(branchList.children).forEach(row => {
    const id = row.getAttribute("data-id");
    const salaryInput = row.querySelector(".salary-input");
    const expInput = row.querySelector(".exp-input");
    const newSalary = parseFloat(salaryInput?.value) || null;
    const newExpDate = expInput?.value ? new Date(expInput.value).toISOString() : null;
    updates.push({ id, salary: newSalary, expirationDate: newExpDate });
  });

  for (const u of updates) {
    try {
      const res = await fetch(`https://www.mither3security.com/api/branches/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salary: u.salary, expirationDate: u.expirationDate }),
      });
      if (!res.ok) throw new Error(await parseError(res));
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }
  alert("Updates saved successfully.");
}

// ===== LOAD CLIENTS =====
async function loadClients() {
  try {
    const res = await fetch("https://www.mither3security.com/api/branches");
    if (!res.ok) throw new Error(await parseError(res));
    const clients = await res.json();

    branchList.innerHTML = clients.length ? "" : `<tr><td colspan="7">No clients available.</td></tr>`;

    clients.forEach(client => {
  const c = client.branchData || {};
  const name = c.name || "N/A";
  const branch = c.branch || "N/A";
  const clientId = client.clientIdNumber || "N/A";
  const salary = client.salary != null ? client.salary : "N/A";
  const expDate = client.expirationDate ? new Date(client.expirationDate).toISOString().split("T")[0] : "N/A";
  const profileImg = client.credentials?.profileImage || "../../image/default-profile.png";

  const row = document.createElement("tr");
  row.setAttribute("data-id", client._id);
  row.innerHTML = `
    <td><img src="${profileImg}" class="profile-circle"></td>
    <td>${name}</td>
    <td>${branch}</td>
    <td class="salary-cell">${salary}</td>
    <td class="exp-cell">${expDate}</td>
    <td>${clientId}</td>
    <td class="action-cell"><button class="view-btn">View</button></td>
  `;
  row.querySelector(".view-btn").onclick = () => showClientProfile(client);
  branchList.appendChild(row);
});

  } catch (err) {
    console.error(err);
    alert("Failed to load clients: " + err.message);
  }
}

function showClientProfile(client) {
  const c = client.branchData || {};
  // Guard shift fallback
  const shift = client.guardShift || c.guardShift || { day: "N/A", night: "N/A" };
  const credentials = c.credentials || {};

  document.getElementById("clientProfileImg").src =
    credentials.profileImage || "../../image/default-profile.png";

  document.getElementById("clientProfileName").textContent = c.name || client.name || "N/A";
  document.getElementById("clientProfileBranch").textContent = c.branch || "Branch: N/A";
  document.getElementById("clientProfileID").textContent = client.clientIdNumber || "N/A";
  document.getElementById("clientProfileEmail").textContent = c.email || client.email || "N/A";

  document.getElementById("clientProfileContract").innerHTML =
    c.contract || client.contract
      ? `<button class="view-file-btn" data-url="${c.contract || client.contract}">View Contract</button>`
      : "N/A";

  // Display both day and night shifts
  document.getElementById("clientProfileShift").innerHTML = `
    <p><strong>Day Shift:</strong> ${shift.day || "N/A"}</p>
    <p><strong>Night Shift:</strong> ${shift.night || "N/A"}</p>
  `;

  document.getElementById("clientProfileModal").classList.add("show");

  document.querySelectorAll("#clientProfileModal .view-file-btn").forEach(btn => {
    btn.onclick = () => window.open(btn.getAttribute("data-url"), "_blank");
  });
}


document.getElementById("closeClientModal")?.addEventListener("click", () => {
  document.getElementById("clientProfileModal").classList.remove("show");
});
document.getElementById("clientProfileModal")?.addEventListener("click", e => {
  if (e.target.id === "clientProfileModal")
    document.getElementById("clientProfileModal").classList.remove("show");
});

// ===== SEARCH FILTER =====
clientSearchInput?.addEventListener("input", () => {
  const filter = clientSearchInput.value.toLowerCase();
  Array.from(branchList.children).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(filter)
      ? ""
      : "none";
  });
});

// ===== ACCOUNT DETAILS MODAL =====
function showPasswordModal(name, password) {
  const modal = document.getElementById("passwordModal");
  document.getElementById("passwordMessage").textContent = `Temporary password for ${name}: ${password}`;
  modal.classList.add("show");
  document.getElementById("copyPasswordBtn").onclick = () =>
    navigator.clipboard.writeText(password).then(() => alert("Password copied!"));
}

document.getElementById("closeModalBtn")?.addEventListener("click", () => {
  document.getElementById("passwordModal")?.classList.remove("show");
});
document.getElementById("passwordModal")?.addEventListener("click", e => {
  if (e.target.id === "passwordModal") e.target.classList.remove("show");
});

// ===== renderAccountDetails() =====
function renderAccountDetails(acc) {
  let html = `<p><strong>Role:</strong> ${acc.role || "N/A"}</p>`;

  if (acc.role === "employee") {
    const b = acc.employeeData?.basicInformation || {};
    const p = acc.employeeData?.personalData || {};
    const e = acc.employeeData?.educationalBackground || [];
    const c = acc.employeeData?.credentials || {};

    html += `<h4>Basic Information:</h4>`;
    html += `<p><strong>Branch:</strong> ${b.branch || "N/A"}</p>`;
    html += `<p><strong>Badge No:</strong> ${b.badgeNo || "N/A"}</p>`;
    html += `<p><strong>Status:</strong> ${acc.status || "N/A"}</p>`;

    html += `<h4>Personal Data:</h4>`;
    for (const key in p) html += `<p><strong>${key}:</strong> ${p[key] || "N/A"}</p>`;

    html += `<h4>Educational Background:</h4>`;
    if (e.length) {
      html += `<table class="edu-table">
        <thead><tr><th>School</th><th>Inclusive Date</th><th>Degree</th><th>Date Graduated</th></tr></thead>
        <tbody>${e
          .map(
            edu => `
          <tr><td>${edu.school || ""}</td><td>${edu.inclusiveDate || ""}</td><td>${edu.degree || ""}</td><td>${edu.dateGraduated || ""}</td></tr>
        `
          )
          .join("")}</tbody></table>`;
    } else html += "<p>N/A</p>";

    html += `<h4>Credentials:</h4>`;
    for (const key in c) {
      const value = c[key];
      if (!value) continue;
      if (typeof value === "string") {
        const fileUrl = value.startsWith("/uploads") ? value : `/uploads/${value}`;
        html += fileUrl.match(/\.(pdf|jpg|jpeg|png|docx?)$/i)
          ? `<p><strong>${key}:</strong> <button class="view-file-btn" data-url="${fileUrl}">View</button></p>`
          : `<p><strong>${key}:</strong> ${value}</p>`;
      }
    }
  } else if (acc.role === "client") {
  const c = acc.clientData || acc.branchData || {};
  const guardShift = acc.guardShift || c.guardShift || { day: "N/A", night: "N/A" };

  html += `<h4>Client Details:</h4>`;
  html += `<p><strong>Name:</strong> ${c.name || "N/A"}</p>`;
  html += `<p><strong>Branch:</strong> ${c.branch || "N/A"}</p>`;
  html += `<p><strong>Client ID:</strong> ${acc.clientIdNumber || "N/A"}</p>`;
  html += `<p><strong>Email:</strong> ${c.email || "N/A"}</p>`;

  html += `<h4>Contract:</h4>`;
  html += c.contract
    ? `<button class="view-file-btn" data-url="${c.contract}">View Contract</button>`
    : "N/A";

  html += `<h4>Guard Shift:</h4>`;
  html += `<p><strong>Day Shift:</strong> ${guardShift.day || "N/A"}</p>`;
  html += `<p><strong>Night Shift:</strong> ${guardShift.night || "N/A"}</p>`;
}


  detailsContainer.innerHTML = html;
  viewModal.classList.add("show");

  detailsContainer.querySelectorAll(".view-file-btn").forEach(btn => {
    btn.onclick = () => window.open(btn.getAttribute("data-url"), "_blank");
  });
}

// ===== BRANCHES MANAGEMENT =====
const manageBranchesBtn = document.getElementById("manageBranchesBtn");
const branchesModal = document.getElementById("branchesModal");
const closeBranchesModal = document.getElementById("closeBranchesModal");
const branchesTableBody = document.getElementById("branchesTableBody");
const addBranchBtn = document.getElementById("addBranchBtn");
const newBranchNameInput = document.getElementById("newBranchName");

// Open modal
manageBranchesBtn?.addEventListener("click", () => {
  branchesModal.classList.add("show");
  loadBranches();
});

// Close modal
closeBranchesModal?.addEventListener("click", () => branchesModal.classList.remove("show"));
branchesModal?.addEventListener("click", e => {
  if (e.target.id === "branchesModal") branchesModal.classList.remove("show");
});

// Load branches from new API
async function loadBranches() {
  try {
    const res = await fetch("https://www.mither3security.com/api/branches-management");
    if (!res.ok) throw new Error("Failed to fetch branches.");
    const branches = await res.json();

    branchesTableBody.innerHTML = branches.length
      ? ""
      : `<tr><td colspan="2">No branches available.</td></tr>`;

    branches.forEach(branch => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", branch._id);
      row.innerHTML = `
        <td>${branch.name}</td>
        <td><button class="remove-branch-btn">Remove</button></td>
      `;
      row.querySelector(".remove-branch-btn").onclick = () => removeBranch(branch._id);
      branchesTableBody.appendChild(row);
    });
  } catch (err) {
    alert(err.message);
  }
}

// Add new branch
addBranchBtn?.addEventListener("click", async () => {
  const name = newBranchNameInput.value.trim();
  if (!name) return alert("Branch name cannot be empty.");
  try {
    const res = await fetch("https://www.mither3security.com/api/branches-management", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to add branch.");
    newBranchNameInput.value = "";
    loadBranches();
  } catch (err) {
    alert(err.message);
  }
});

// Remove branch
async function removeBranch(id) {
  if (!confirm("Are you sure you want to remove this branch?")) return;
  try {
    const res = await fetch(`https://www.mither3security.com/api/branches-management/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to remove branch.");
    loadBranches();
  } catch (err) {
    alert(err.message);
  }
}

// ===== EMPLOYEE / ACCOUNT MANAGEMENT =====
async function loadEmployees() {
  try {
    const res = await fetch("https://www.mither3security.com/accounts");
    if (!res.ok) throw new Error(await parseError(res));
    const accounts = await res.json();

    employeeTableBody.innerHTML = accounts.length
      ? ""
      : `<tr><td colspan="5">No accounts for approval yet.</td></tr>`;

    accounts.forEach(acc => {
      let name = "N/A";
      let badgeNo = "N/A";
      let branch = "N/A";

      if (acc.role === "employee" && acc.employeeData?.personalData) {
        const p = acc.employeeData.personalData;
        const family = p.familyName || "";
        const first = p.firstName || "";
        const middle = p.middleName ? p.middleName.charAt(0) + "." : "";
        name = [family, first, middle].filter(Boolean).join(" ").trim() || "N/A";

        badgeNo = acc.employeeData.basicInformation?.badgeNo || "N/A";
        branch = acc.employeeData.basicInformation?.branch || "N/A";
      } else if (acc.role === "client") {
        const c = acc.clientData || acc.branchData || {};
        name = c.name || acc.name || "N/A";
        branch = c.branch || "N/A";

        let clientId = acc.clientIdNumber || getCachedClientId(acc._id);
        if (!clientId) {
          clientId = generateClientId();
          setCachedClientId(acc._id, clientId);
        }
        acc.clientIdNumber = clientId;
        badgeNo = clientId; // Display client ID in place of badgeNo
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${name}</td>
        <td>${acc.role || "N/A"}</td>
        <td>${branch}</td>
        <td>${badgeNo}</td>
        <td><button class="view-btn">View</button> <button class="approve-btn">Approve</button></td>
      `;

      // ===== View Button =====
      row.querySelector(".view-btn").onclick = () => renderAccountDetails(acc);

      // ===== Approve Button =====
row.querySelector(".approve-btn").onclick = async () => {
  try {
    const token = localStorage.getItem("token")?.trim();
    if (!token) return alert("No admin token found.");

    // Fetch the latest account data
    const accountRes = await fetch(`https://www.mither3security.com/accounts/${acc._id}`);
    if (!accountRes.ok) throw new Error(await parseError(accountRes));
    const freshAccount = await accountRes.json();

    // ===== EMPLOYEE APPROVAL =====
    if (freshAccount.role === "employee") {
      const empData = freshAccount.employeeData || {};
      const personal = empData.personalData || {};
      const basic = empData.basicInformation || {};
      const education = Array.isArray(empData.educationalBackground) ? empData.educationalBackground : [];
      const credentials = empData.credentials || {};
      const firearmsIssued = Array.isArray(empData.firearmsIssued) ? empData.firearmsIssued : [];

      const fullName = [personal.familyName, personal.firstName, personal.middleName?.charAt(0)]
        .filter(Boolean).join(" ").trim();
      const email = personal.email?.trim();
      const badgeNo = basic.badgeNo || null;
      const password = generatePassword();

      showPasswordModal(fullName, password);

      // --- Step 1: Check if Employee exists ---
      let employeeId = null;
      if (!email || email.trim() === "") {
        alert("This employee has no email address. Please assign a unique email before approving.");
        return;
      }

        const empCheckRes = await fetch(`https://www.mither3security.com/employees?email=${email}`);
        const existingEmp = await empCheckRes.json();
        if (email && existingEmp.length === 1) {
        employeeId = existingEmp[0]._id;
      } else {
        employeeId = null; // create new employee record instead
      }


      // --- Step 2: Create Employee if not exists ---
      if (!employeeId) {
        const empRes = await fetch("https://www.mither3security.com/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({
            role: "employee",
            employeeData: { basicInformation: basic, personalData: personal, educationalBackground: education, credentials, firearmsIssued },
          }),
        });
        if (!empRes.ok) throw new Error(await parseError(empRes));
        const savedEmp = await empRes.json();
        employeeId = savedEmp.employee._id;
      }

      // --- Step 3: Register User ---
      const userPayload = { name: fullName, email, password, role: "employee", status: "Active", badgeNumber: badgeNo, employeeId };
      const registerRes = await fetch("https://www.mither3security.com/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(userPayload),
      });
      if (!registerRes.ok) throw new Error(await parseError(registerRes));

      // --- Step 4: Send Email Notification ---
      if (email) {
        await fetch("https://www.mither3security.com/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            subject: "Your Account Has Been Approved - Mither3 Security",
            html: `<p>Hi ${fullName},</p><p>Your account is approved. Temporary password: <b>${password}</b></p>`,
          }),
        });
      }


      // --- Step 5: Remove from pending accounts ---
      if (acc._id) {
        await fetch(`https://www.mither3security.com/accounts/${acc._id}`, { method: "DELETE" });
      }


      alert(`✅ Employee ${fullName} approved and linked successfully.`);

    } 
    // ===== CLIENT APPROVAL =====
    // ===== CLIENT APPROVAL =====
else if (freshAccount.role === "client") {
  const c = freshAccount.clientData || freshAccount.branchData || {};
  const clientName = c.name || freshAccount.name || "Unnamed Client";
  const clientBranch = c.branch || "Unknown Branch";

  // Ensure clientIdNumber exists
  let clientIdNumber = freshAccount.clientIdNumber || getCachedClientId(acc._id);
  if (!clientIdNumber) {
    clientIdNumber = generateClientId();
    setCachedClientId(acc._id, clientIdNumber);
  }

  // --- Payload for creating Branch record ---
const clientPayload = {
  role: "client",
  clientIdNumber,
  salary: null,
  expirationDate: null,
  contract: c.contract || "",
  credentials: c.credentials || {},
  guardShift: c.guardShift || { day: "N/A", night: "N/A" }, // use proper fallback
  branchData: {
    name: clientName,
    email: c.email || "",
    branch: clientBranch,
    password: c.password || "", 
  }
};



  const branchRes = await fetch("https://www.mither3security.com/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientPayload),
  });
  if (!branchRes.ok) throw new Error(await parseError(branchRes));

  // --- Payload for creating User account ---
  const userPayload = {
    name: clientName,
    email: c.email || "",
    password: c.password || generatePassword(), // fallback in case password is missing
    role: "client",
    clientIdNumber,
    branch: clientBranch,
  };

  await fetch("https://www.mither3security.com/api/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(userPayload),
  });

  removeCachedClientId(acc._id);
  alert(`✅ Client ${clientName} approved successfully.`);

  // Remove from pending accounts
  if (acc._id) {
  await fetch(`https://www.mither3security.com/accounts/${acc._id}`, { method: "DELETE" });
}


  // Refresh UI
  loadEmployees();
  loadClients();
}

  } catch (err) {
    console.error(err);
    alert("Failed to approve account: " + err.message);
  }
};



      employeeTableBody.appendChild(row);
    });
} catch (err) {
    console.error(err);
    alert("Failed to approve employee: " + err.message);
  }
};


document.getElementById("closeViewModal")?.addEventListener("click", () =>
  viewModal.classList.remove("show")
);
viewModal?.addEventListener("click", e => {
  if (e.target.id === "viewModal") viewModal.classList.remove("show");
});

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("role") !== "admin") {
    const branchModule = document.getElementById("branchModule");
    if (branchModule) branchModule.style.display = "none";
    if (window.location.pathname.split("/").pop() === "accValidation.html") {
      alert("Access denied.");
      window.location.href = "dashboard.html";
    }
  }

 // ===== Requirement & Branch Modal =====
// ===== Requirement & Branch Modal =====
const createRequirementBtn = document.getElementById("createRequirementBtn");
const branchSelectionModal = document.getElementById("branchSelectionModal");
const closeBranchModal = document.getElementById("closeBranchModal");
const addRequirementBtn = document.getElementById("addRequirementBtn");

const requirementModal = document.getElementById("requirementModal");
const closeRequirementModal = document.getElementById("closeRequirementModal");
const reqBranchSelect = document.getElementById("reqBranch");
const reqClientName = document.getElementById("reqClientName");
const reqSalary = document.getElementById("reqSalary");
const requirementForm = document.getElementById("requirementForm");

// ===== Show Branch Selection Modal =====
createRequirementBtn?.addEventListener("click", () => {
  loadRequirements();
  branchSelectionModal.classList.add("show");
});

// ===== Close Branch Selection Modal =====
closeBranchModal?.addEventListener("click", () => {
  branchSelectionModal.classList.remove("show");
});

branchSelectionModal?.addEventListener("click", e => {
  if (e.target.id === "branchSelectionModal") branchSelectionModal.classList.remove("show");
});

// ===== Close Requirement Modal =====
closeRequirementModal?.addEventListener("click", () => {
  requirementModal.classList.remove("show");
});

requirementModal?.addEventListener("click", e => {
  if (e.target.id === "requirementModal") requirementModal.classList.remove("show");
});

// ===== Load Branches for Requirement Modal =====
async function loadBranchOptions() {
  try {
    const res = await fetch("https://www.mither3security.com/api/branches");
    const branches = await res.json();

    // Reset options with default first
    reqBranchSelect.innerHTML = '<option value="" disabled selected>-- Select Branch --</option>';

    // Populate branch list
    branches.forEach(branch => {
      const option = document.createElement("option");
      option.value = branch.branchData?.branch || "Unnamed Branch";
      option.textContent = branch.branchData?.branch || "Unnamed Branch";
      option.dataset.clientName = branch.branchData?.name || "N/A";
      option.dataset.salary = branch.salary || "";
      reqBranchSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load branches:", err);
  }
}

// ===== When a Branch is selected =====
reqBranchSelect?.addEventListener("change", (e) => {
  const selected = e.target.options[e.target.selectedIndex];
  reqClientName.value = selected.dataset.clientName || "";
  reqSalary.value = selected.dataset.salary || "";
});

// ===== Open Requirement Modal & Load Branches =====
addRequirementBtn?.addEventListener("click", async () => {
  branchSelectionModal.classList.remove("show");
  requirementModal.classList.add("show");
  await loadBranchOptions();
});

// ===== Requirement Form Submission =====
requirementForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    clientName: reqClientName.value.trim(),
    branch: reqBranchSelect.value.trim(),
    salary: parseFloat(reqSalary.value),
    height: parseFloat(document.getElementById("reqHeight").value),
    weight: parseFloat(document.getElementById("reqWeight").value),
  };

  try {
    const res = await fetch("https://www.mither3security.com/api/requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseError(res));
    alert("Requirement saved successfully!");
    requirementModal.classList.remove("show");
    requirementForm.reset();
  } catch (err) {
    console.error(err);
    alert("Failed to save requirement: " + err.message);
  }
});

// ===== Render Requirements in Branch Selection Modal =====
async function loadRequirements() {
  try {
    const res = await fetch("https://www.mither3security.com/api/requirements");
    const data = await res.json();
    const tbody = document.getElementById("branchTableBody");
    tbody.innerHTML = "";

    data.forEach(req => {
      const tr = document.createElement("tr");
      tr.dataset.id = req._id;
      tr.innerHTML = `
        <td>${req.branch}</td>
        <td>${req.clientName}</td>
        <td>${req.salary}</td>
        <td>${req.height}</td>
        <td>${req.weight}</td>
        <td><button class="remove-btn">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load requirements:", err);
  }
}

// ===== Event Delegation for Delete Buttons =====
document.getElementById("branchTableBody").addEventListener("click", async (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const tr = e.target.closest("tr");
    const id = tr.dataset.id;
    if (!confirm("Are you sure you want to delete this requirement?")) return;

    try {
      const res = await fetch(`https://www.mither3security.com/api/requirements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete requirement");
      alert("Requirement deleted successfully!");
      loadRequirements();
    } catch (err) {
      console.error(err);
      alert("Failed to delete requirement: " + err.message);
    }
  }
});


  loadEmployees();
  loadClients();
});
