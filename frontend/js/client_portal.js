// client_portal.js

document.addEventListener("DOMContentLoaded", async () => {
  console.log("client_portal.js loaded");
  
  // Check user session first
  const userData = getUserData();
  if (!userData) {
    console.log("No user data, redirecting to login");
    return;
  }

  console.log("User data retrieved:", userData);

  await loadClientGuards();
  await populateEmployeeSelect();
  await loadMyTickets();
  initSearch();
  initLogout();
  initTicketSubmit();
  initFilePreview();
});

// === Helper: Get user and token ===
function getUserData() {
  try {
    const userStr = localStorage.getItem("user");
    console.log("Raw localStorage user:", userStr);
    
    if (!userStr) {
      console.warn("No user in localStorage");
      alert("Invalid user session. Please log in again.");
      window.location.href = "index.html";
      return null;
    }

    const user = JSON.parse(userStr);
    console.log("Parsed user object:", user);
    
    // Validate required fields
    if (!user) {
      console.warn("User object is null/undefined after parsing");
      alert("Session error. Please log in again.");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }

    if (!user.token) {
      console.warn("No token in user object");
      alert("Invalid session token. Please log in again.");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }

    if (!user.role) {
      console.warn("No role in user object");
      alert("User role not found. Please log in again.");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }

    if (user.role !== "client") {
      console.warn("User role is not client:", user.role);
      alert("Unauthorized access. Please log in as a client.");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }
    
    console.log("User validation passed");
    return user;
  } catch (err) {
    console.error("Error parsing user data:", err);
    alert("Session error. Please log in again.");
    localStorage.removeItem("user");
    window.location.href = "index.html";
    return null;
  }
}

// === Load all guards under client's branch ===
async function loadClientGuards(searchName = "") {
  try {
    const clientData = getUserData();
    if (!clientData) return [];

    const clientBranch = clientData.branch || "";
    console.log("Client branch:", clientBranch);
    
    if (!clientBranch) {
      console.warn("⚠️ Client branch is not set!");
      return [];
    }

    const res = await fetch("https://www.mither3security.com/employees");
    if (!res.ok) throw new Error("Failed to fetch employees");
    const employees = await res.json();
    console.log("Employees fetched:", employees.length);

    const filtered = employees.filter(emp =>
      emp.employeeData?.basicInformation?.branch === clientBranch &&
      emp.employeeData?.basicInformation?.status === "Active"
    );

    console.log("Filtered guards for branch:", filtered.length);

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
  if (!select) {
    console.warn("reportedEmployee select not found in DOM");
    return;
  }
  
  select.innerHTML = `<option value="">-- Optional: Report a specific employee --</option>`;

  const guards = await loadClientGuards();
  if (!guards?.length) {
    console.warn("No guards to populate");
    return;
  }

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
  
  console.log("Employee select populated with", guards.length, "guards");
}

// === Render Guards Table ===
function renderGuardsTable(guards) {
  const tbody = document.querySelector("#guardsTable tbody");
  if (!tbody) {
    console.warn("#guardsTable tbody not found in DOM");
    return;
  }
  
  tbody.innerHTML = "";

  if (!guards.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No guards found</td></tr>`;
    return;
  }

  guards.forEach(emp => {
    const profileImg = emp.employeeData?.credentials?.profileImage
      ? `https://www.mither3security.com${emp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
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
  
  console.log("Guards table rendered with", guards.length, "entries");
}

// === Initialize File Preview ===
function initFilePreview() {
  const fileInput = document.getElementById("ticketAttachment");
  const preview = document.getElementById("attachmentPreview");

  if (!fileInput) return;

  fileInput.addEventListener("change", (e) => {
    preview.innerHTML = "";
    const file = e.target.files[0];

    if (!file) {
      console.log("No file selected");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG)");
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      preview.innerHTML = `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--clr-light); border-radius: 6px;">
          <p style="font-weight: 600; color: var(--clr-dark); margin-bottom: 0.5rem;">Preview:</p>
          <img src="${event.target.result}" alt="preview" style="max-width: 100%; max-height: 200px; border-radius: 6px; object-fit: cover;">
          <p style="font-size: 0.85rem; color: var(--clr-black-variant); margin-top: 0.5rem;">${file.name} (${(file.size / 1024).toFixed(2)} KB)</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  });

  console.log("File preview handler initialized");
}

// === Initialize Ticket Submission ===
function initTicketSubmit() {
  const ticketForm = document.getElementById("ticketForm");
  if (!ticketForm) {
    console.warn("ticketForm not found in DOM");
    return;
  }

  ticketForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = getUserData();
    if (!user) return;

    const subject = document.getElementById("subject")?.value.trim();
    const concern = document.getElementById("concern")?.value.trim();
    const reportedEmployeeSelect = document.getElementById("reportedEmployee");
    const reportedEmployeeId = reportedEmployeeSelect?.value || null;
    const fileInput = document.getElementById("ticketAttachment");

    if (!subject || !concern) {
      alert("Please fill subject and concern.");
      return;
    }

    try {
      // ✅ Use FormData to handle file upload
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("concern", concern);
      formData.append("reportedEmployeeId", reportedEmployeeId || null);
      formData.append("creatorId", user._id);
      formData.append("creatorEmail", user.email);

      // ✅ Append file if selected
      if (fileInput?.files?.length > 0) {
        formData.append("ticketAttachment", fileInput.files[0]);
        console.log("📎 File attached:", fileInput.files[0].name);
      }

      const res = await fetch("https://www.mither3security.com/tickets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit ticket");

      alert(`✅ ${data.message}\nStatus: ${data.ticket.status}`);
      ticketForm.reset();
      document.getElementById("attachmentPreview").innerHTML = "";
      await loadMyTickets();
    } catch (err) {
      console.error("❌ Error submitting ticket:", err);
      alert("Error submitting ticket. See console for details.");
    }
  });
  
  console.log("Ticket submit handler initialized");
}

// === Load Client's Submitted Tickets ===
async function loadMyTickets() {
  const user = getUserData();
  if (!user) return;

  try {
    const res = await fetch("https://www.mither3security.com/tickets", {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to fetch tickets");
    }

    const tickets = await res.json();
    const tableBody = document.querySelector("#ticketsTable tbody");
    if (!tableBody) {
      console.warn("#ticketsTable tbody not found in DOM");
      return;
    }

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
        <td><button class="view-record" data-ticket-id="${ticket._id}">View</button></td>
      `;
      tableBody.appendChild(row);

      // Add event listener to view button
      row.querySelector(".view-record").addEventListener("click", () => {
        openTicketModal(ticket);
      });
    });
    
    console.log("Tickets loaded:", tickets.length);
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
}

// === Open Ticket Modal ===
function openTicketModal(ticket) {
  let modal = document.getElementById("ticketDetailsModal");
  
  // Create modal if it doesn't exist
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ticketDetailsModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-modal">&times;</button>
        <h2>Ticket Details</h2>
        <div id="modalDetails"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close button handler
    modal.querySelector(".close-modal").addEventListener("click", () => {
      modal.classList.remove("show");
    });

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  }

  // Populate modal with ticket details
  const detailsDiv = modal.querySelector("#modalDetails");
  let attachmentHTML = "";
  
  if (ticket.attachment) {
    attachmentHTML = `
      <div class="ticket-detail-item">
        <strong>Attachment:</strong>
        <div style="margin-top: 0.5rem;">
          <img src="https://www.mither3security.com${ticket.attachment}" alt="ticket attachment" 
               style="max-width: 100%; max-height: 300px; border-radius: 6px; object-fit: contain;">
        </div>
      </div>
    `;
  }

  detailsDiv.innerHTML = `
    <div class="ticket-detail-item">
      <strong>Subject:</strong> ${ticket.subject}
    </div>
    <div class="ticket-detail-item">
      <strong>Status:</strong> <span class="status ${ticket.status.toLowerCase()}">${ticket.status}</span>
    </div>
    <div class="ticket-detail-item">
      <strong>Date Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}
    </div>
    ${ticket.reportedEmployeeName ? `
      <div class="ticket-detail-item">
        <strong>Reported Employee:</strong> ${ticket.reportedEmployeeName}
      </div>
    ` : ""}
    <div class="ticket-detail-item">
      <strong>Concern:</strong>
      <p class="concern-text">${ticket.concern}</p>
    </div>
    ${attachmentHTML}
  `;

  // Show modal
  modal.classList.add("show");
}

// === Search button click ===
function initSearch() {
  const searchBtn = document.getElementById("refreshGuards");
  const searchInput = document.getElementById("searchGuard");

  if (!searchBtn) {
    console.warn("refreshGuards button not found in DOM");
    return;
  }
  
  if (!searchInput) {
    console.warn("searchGuard input not found in DOM");
    return;
  }

  searchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    console.log("Searching for guards:", query);
    await loadClientGuards(query);
    await populateEmployeeSelect();
  });
  
  console.log("Search handler initialized");
}

// === Logout handler ===
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    console.warn("logoutBtn not found in DOM");
    return;
  }

  logoutBtn.addEventListener("click", () => {
    console.log("Logout clicked");
    localStorage.removeItem("user");
    window.location.href = "loginSection.html";
  });
  
  console.log("Logout handler initialized");
}