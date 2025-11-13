document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  await loadBranchOverview();
  await loadGuardsForBranch();
  initLogout();
});

function getUser() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.token) {
    window.location.href = "loginSection.html";
    return null;
  }
  return user;
}

// === Tabs Switching ===
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(btn.dataset.target).classList.add("active");
    });
  });
}

// === Guard Details Sub-Tab Switching ===
function initGuardDetailTabs() {
  const detailTabs = document.querySelectorAll("#guardDetailModal .tab-btn");
  
  detailTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active from all sub-tabs
      detailTabs.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("#guardDetailModal .sub-modal").forEach((m) => m.classList.remove("active"));
      
      // Activate selected
      btn.classList.add("active");
      const target = btn.dataset.target;
      document.querySelector(target).classList.add("active");
    });
  });
}


// === Logout ===
function initLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../html/loginSection.html";
  });
}

async function loadBranchOverview() {
  const user = getUser();
  if (!user || !user.branchId) {
    console.error("❌ No valid branchId found in localStorage.");
    return;
  }

  try {
    const res = await fetch(`https://www.mither3security.com/api/branches/${user.branchId}`);
    if (!res.ok) throw new Error(`Failed to fetch branch data (status ${res.status})`);
    const data = await res.json();

    // Fill form based on Branch schema
    document.getElementById("branchName").value = data.branchData?.branch || "";
    document.getElementById("clientName").value = data.branchData?.name || "";
    document.getElementById("branchEmail").value = data.branchData?.email || "";
    document.getElementById("branchContact").value = data.branchData?.contactNumber || "";
    document.getElementById("branchContract").value = data.contract || "";
    document.getElementById("branchDayShift").value = data.guardShift?.day || "";
    document.getElementById("branchNightShift").value = data.guardShift?.night || "";
    document.getElementById("branchExpDate").value = data.expirationDate || "";

    // Fill profile card
    document.getElementById("branchNameCard").textContent = data.branchData?.branch || "N/A";
    document.getElementById("branchEmailCard").textContent = data.branchData?.email || "N/A";
    document.getElementById("branchRoleCard").textContent = data.role || "N/A";
    document.getElementById("branchIdCard").textContent = data.clientIdNumber || "N/A";
    document.getElementById("branchProfileImg").src =
      data.credentials?.profileImage || "../../image/default-profile.png";

    // Make all fields readonly by default
    const inputs = document.querySelectorAll("#branchForm input");
    inputs.forEach((input) => input.setAttribute("readonly", true));

    const editBtn = document.getElementById("editBranch");
    let isEditing = false;

    editBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!isEditing) {
        // 🔹 Switch to edit mode
        isEditing = true;
        editBtn.textContent = "Save";
        inputs.forEach((input) => {
          input.removeAttribute("readonly");
          input.classList.add("editable");
        });
      } else {
        // 🔹 Switch to saving mode
        editBtn.disabled = true;
        const originalText = editBtn.textContent;
        editBtn.innerHTML = `<span class="loader"></span> Saving...`;

        // Collect form data
        const body = {
          "branchData.branch": document.getElementById("branchName").value,
          "branchData.name": document.getElementById("clientName").value,
          "branchData.email": document.getElementById("branchEmail").value,
          "branchData.contactNumber": document.getElementById("branchContact").value,
          contract: document.getElementById("branchContract").value,
          guardShift: {
            day: document.getElementById("branchDayShift").value,
            night: document.getElementById("branchNightShift").value,
          },
          expirationDate: document.getElementById("branchExpDate").value,
        };

        try {
          const updateRes = await fetch(
            `https://www.mither3security.com/api/branches/${user.branchId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify(body),
            }
          );

          if (!updateRes.ok) throw new Error("Failed to update branch info");
          const updated = await updateRes.json();

          // 🔹 Update UI
          document.getElementById("branchNameCard").textContent =
            updated.branch.branchData?.branch;
          document.getElementById("branchEmailCard").textContent =
            updated.branch.branchData?.email;

          alert("✅ Branch info updated successfully!");
        } catch (err) {
          console.error("❌ Error updating branch:", err);
          alert("❌ Failed to update branch info. Please try again.");
        } finally {
          // 🔹 Restore UI state
          isEditing = false;
          editBtn.disabled = false;
          editBtn.textContent = originalText;
          inputs.forEach((input) => {
            input.setAttribute("readonly", true);
            input.classList.remove("editable");
          });
        }
      }
    });
  } catch (err) {
    console.error("❌ loadBranchOverview error:", err);
  }
}


// === Load Guards ===
// === Load Guards ===
async function loadGuardsForBranch() {
  const user = getUser();
  if (!user || !user.branchId) {
    console.error("❌ No valid branchId found in localStorage.");
    return;
  }

  try {
    // ✅ Fetch guards assigned to this branch
    const res = await fetch(`https://www.mither3security.com/employees/branch/${user.branchId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch guards (status ${res.status})`);
    }

    const guards = await res.json();

    // ✅ Check if guards were found
    const tbody = document.querySelector("#guardsTable tbody");
    if (!Array.isArray(guards) || guards.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6" style="text-align:center;">No guards found for this branch.</td></tr>`;
      return;
    }

    // ✅ Populate the guards table with all columns filled
    tbody.innerHTML = guards.map(g => {
      const name = g.employeeData?.personalData?.name || "N/A";
      const badge = g.employeeData?.basicInformation?.badgeNo || "N/A";
      const shift = g.employeeData?.basicInformation?.shift || "N/A";
      const status = g.status || "Active";
      const profile = g.employeeData?.credentials?.profileImage || "../../image/default-profile.png";

      return `
        <tr>
          <td><img src="${profile}" alt="Profile" class="guard-profile-img"></td>
          <td>${name}</td>
          <td>${badge}</td>
          <td>${shift}</td>
          <td>${status}</td>
          <td><button class="view-guard" data-id="${g._id}">View</button></td>
        </tr>
      `;
    }).join("");

    // ✅ Add event listener for "View" buttons
    document.querySelectorAll(".view-guard").forEach(btn => {
      btn.addEventListener("click", (e) => showGuardDetails(e.target.dataset.id));
    });

  } catch (err) {
    console.error("❌ loadGuardsForBranch error:", err);
    const tbody = document.querySelector("#guardsTable tbody");
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center; color:red;">Error loading guards.</td></tr>`;
  }
}




// === Search Guards ===
function initSearch() {
  document.getElementById("searchBtn").addEventListener("click", async () => {
    const query = document.getElementById("searchGuard").value;
    await loadGuards(query);
  });
}

// === Guard Details Modal ===
async function showGuardDetails(guardId) {
  const modal = document.getElementById("guardDetailModal");
  modal.classList.add("active");

  initGuardDetailTabs();

  const employeeRes = await fetch(`https://www.mither3security.com/employees/${guardId}`);
  const employee = await employeeRes.json();

  // Load attendance
  // Load attendance by employee ID only
const attendanceRes = await fetch(`https://www.mither3security.com/attendance/${guardId}`);
if (!attendanceRes.ok) {
  console.error("❌ Failed to fetch attendance for employee ID:", guardId);
} else {
  const attendanceData = await attendanceRes.json();
  generateMonthlyTable(attendanceData, employee.employeeData.basicInformation.branch);
}


const concernRes = await fetch(`https://www.mither3security.com/tickets?reportedEmployeeId=${guardId}`, {
  headers: { "Authorization": `Bearer ${getUser().token}` }
});

if (!concernRes.ok) {
  console.error("❌ Failed to load concerns");
  return;
}

const concerns = await concernRes.json();
const tbody = document.querySelector("#guardConcernsTable tbody");

tbody.innerHTML = concerns.length
  ? concerns.map(c => `
      <tr>
        <td>${c.subject}</td>
        <td>${c.status}</td>
        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
        <td><button class="view-ticket-btn" data-id="${c._id}">View</button></td>
      </tr>
    `).join("")
  : `<tr><td colspan="4" style="text-align:center;">No concerns found</td></tr>`;

// === Handle "View" button click ===
document.querySelectorAll(".view-ticket-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const ticketId = btn.dataset.id;
    try {
      const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
        headers: { "Authorization": `Bearer ${getUser().token}` }
      });
      const ticket = await res.json();

      // Fill modal content
      document.getElementById("ticketSubject").textContent = ticket.subject || "N/A";
      document.getElementById("ticketStatus").textContent = ticket.status || "N/A";
      document.getElementById("ticketDate").textContent = new Date(ticket.createdAt).toLocaleString();
      document.getElementById("ticketSource").textContent = ticket.source || "N/A";
      document.getElementById("ticketRating").textContent = ticket.rating || "N/A";
      document.getElementById("ticketDescription").textContent = ticket.description || "No description provided.";

      // Show modal
      document.getElementById("ticketModal").classList.add("active");
    } catch (err) {
      console.error("❌ Error loading ticket:", err);
    }
  });
});

// === Close modal button ===
document.getElementById("closeTicketModal").addEventListener("click", () => {
  document.getElementById("ticketModal").classList.remove("active");
});

}

function generateMonthlyTable(data, branch) {
  const tableBody = document.querySelector("#monthlyAttendanceTable tbody");
  const records = data.records || []; // ensure safe fallback

  if (!Array.isArray(records) || records.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <span class="material-symbols-outlined empty-state-icon">event_busy</span>
          <p>No attendance records available.</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = records.map((r) => {
    const date = new Date(r.checkinTime).toLocaleDateString();
    const status = r.status || "N/A";
    const timeIn = r.checkinTime
      ? new Date(r.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "N/A";
    const timeOut = r.checkoutTime
      ? new Date(r.checkoutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "N/A";

    let statusClass = "";
    if (status.toLowerCase().includes("late")) statusClass = "status-late";
    else if (status.toLowerCase().includes("absent")) statusClass = "status-absent";
    else statusClass = "status-ontime";

    return `
      <tr>
        <td>${date}</td>
        <td class="${statusClass}">${status}</td>
        <td>${timeIn}</td>
        <td>${timeOut}</td>
      </tr>
    `;
  }).join("");
}


// === Close Guard Detail Modal ===
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("guardDetailModal");
  const closeBtn = document.getElementById("closeGuardDetail");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  // Optional: Close when clicking outside the modal content
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
    }
  });
});

