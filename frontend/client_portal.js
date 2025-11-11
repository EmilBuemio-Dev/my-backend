// client_portal.js

document.addEventListener("DOMContentLoaded", async () => {
  await loadClientGuards();
  await populateEmployeeSelect();
  await loadMyTickets();
  initSearch();
  initLogout();
  initTicketSubmit();
});

// === Helper: Get user and token ===
function getUserData() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user || !user.token) {
    alert("Invalid user session. Please log in again.");
    localStorage.removeItem("user");
    window.location.href = "client_login.html";
    return null;
  }
  return user;
}

// === Load all guards under client's branch ===
async function loadClientGuards(searchName = "") {
  try {
    const clientData = getUserData();
    if (!clientData) return;

    const clientBranch = clientData.branch || "";
    if (!clientBranch) return alert("⚠️ Your branch is not set!");

    const res = await fetch("http://localhost:5000/employees");
    if (!res.ok) throw new Error("Failed to fetch employees");
    const employees = await res.json();

    const filtered = employees.filter(emp =>
      emp.employeeData?.basicInformation?.branch === clientBranch &&
      emp.employeeData?.basicInformation?.status === "Active"
    );

    const finalList = searchName
      ? filtered.filter(emp =>
          emp.employeeData?.personalData?.name
            ?.toLowerCase()
            .includes(searchName.toLowerCase())
        )
      : filtered;

    renderGuardsTable(finalList);
    return finalList;
  } catch (err) {
    console.error("❌ Failed to load guards:", err);
    return [];
  }
}

// === Populate Employee Selection in Ticket Form ===
async function populateEmployeeSelect() {
  const select = document.getElementById("reportedEmployee");
  if (!select) return;
  select.innerHTML = `<option value="">-- Optional: Report a specific employee --</option>`;

  const guards = await loadClientGuards();
  if (!guards?.length) return;

  guards.forEach(emp => {
    const name = emp.employeeData?.personalData?.name || "Unnamed";
    const id = emp._id;
    const badge = emp.employeeData?.basicInformation?.badgeNo
      ? ` (${emp.employeeData.basicInformation.badgeNo})`
      : "";
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${name}${badge}`;
    select.appendChild(opt);
  });
}

// === Render Guards Table ===
function renderGuardsTable(guards) {
  const tbody = document.querySelector("#guardsTable tbody");
  tbody.innerHTML = "";

  if (!guards.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No guards found</td></tr>`;
    return;
  }

  guards.forEach(emp => {
    const profileImg = emp.employeeData?.credentials?.profileImage
      ? `http://localhost:5000${emp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
      : "../../image/profile.png";

    const name = emp.employeeData?.personalData?.name || "N/A";
    const badgeNo = emp.employeeData?.basicInformation?.badgeNo || "N/A";
    const shift = emp.employeeData?.basicInformation?.shift || "N/A";
    const status = emp.employeeData?.basicInformation?.status || "Inactive";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${profileImg}" alt="profile"
           style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
      <td>${name}</td>
      <td>${badgeNo}</td>
      <td>${shift}</td>
      <td><span class="status ${status.toLowerCase()}">${status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// === Initialize Ticket Submission ===
function initTicketSubmit() {
  const ticketForm = document.getElementById("ticketForm");
  ticketForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = getUserData();
    if (!user) return;

    const subject = document.getElementById("subject").value.trim();
    const concern = document.getElementById("concern").value.trim();
    const reportedEmployeeSelect = document.getElementById("reportedEmployee");
    const reportedEmployeeId = reportedEmployeeSelect?.value || null;

    // ⭐ Get selected rating (only for clients)
    let rating = "Not Rated";
    if (user.role === "client") {
      const selectedRating = document.querySelector('input[name="rating"]:checked');
      if (selectedRating) {
        rating = selectedRating.value;
      }
    }

    if (!subject || !concern) {
      alert("Please fill subject and concern.");
      return;
    }

    try {
      const body = {
        subject,
        concern,
        reportedEmployeeId: reportedEmployeeId || null,
        rating,
        creatorId: user._id,
        creatorEmail: user.email,
      };

      const res = await fetch("http://localhost:5000/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit ticket");

      alert(`✅ ${data.message}\nStatus: ${data.ticket.status}`);
      ticketForm.reset();
      await loadMyTickets();
    } catch (err) {
      console.error(err);
      alert("Error submitting ticket. See console for details.");
    }
  });
}


// === Load Client's Submitted Tickets ===
async function loadMyTickets() {
  const user = getUserData();
  if (!user) return;

  try {
    const res = await fetch("http://localhost:5000/tickets", {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to fetch tickets");
    }

    const tickets = await res.json();
    const tableBody = document.querySelector("#ticketsTable tbody");
    tableBody.innerHTML = "";

    if (!tickets.length) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No tickets submitted yet.</td></tr>`;
      return;
    }

    tickets.forEach(ticket => {
      const row = document.createElement("tr");
      const reported = ticket.reportedEmployeeName ? ` — Reported: ${ticket.reportedEmployeeName}` : "";
      row.innerHTML = `
        <td>${ticket.subject}${reported}</td>
        <td>${ticket.status}</td>
        <td>${new Date(ticket.createdAt).toLocaleString()}</td>
        <td><a href="message.html?id=${ticket._id}" class="view-record">View</a></td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
}

// === Search button click ===
function initSearch() {
  const searchBtn = document.getElementById("refreshGuards");
  const searchInput = document.getElementById("searchGuard");

  searchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    await loadClientGuards(query);
    await populateEmployeeSelect();
  });
}

// === Logout handler ===
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../html/client_login.html";
  });
}
