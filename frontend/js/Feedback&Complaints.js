const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
  alert("Please log in first.");
  window.location.href = "index.html";
} else if (role !== "admin" && role !== "hr") {
  alert("Access denied. Only admin or HR can view tickets.");
  window.location.href = "index.html";
}

// ===== TAB SWITCHING =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Update active tab content
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    
    // Load content if needed
    if (tabName === "remarks-tab") {
      loadRemarks();
      loadEmployeesForSelect();
    }
  });
});

// ===== LOAD TICKETS =====
async function loadTickets() {
  try {
    const res = await fetch("https://www.mither3security.com/tickets", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch tickets");
    const tickets = await res.json();

    const tableBody = document.querySelector("#ticketsTable tbody");
    tableBody.innerHTML = "";

    tickets.forEach(ticket => {
      let statusText = ticket.status || "Pending";
      let statusClass = statusText.toLowerCase();

      if (ticket.creatorRole === "client" && statusText !== "Completed") {
        statusText = "Urgent";
        statusClass = "urgent";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${ticket.creatorName || "Unknown"}</td>
        <td>${ticket.subject || "No Subject"}</td>
        <td>${ticket.creatorRole === "client" ? "Client" : "Employee"}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}</td>
        <td><button class="btn view-ticket" data-id="${ticket._id}">View</button></td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".view-ticket").forEach(btn => {
      btn.addEventListener("click", () => openTicketModal(btn.dataset.id));
    });
  } catch (err) {
    console.error("Error fetching tickets:", err);
  }
}

// ===== OPEN TICKET MODAL =====
async function openTicketModal(ticketId) {
  try {
    const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load ticket");
    const ticket = await res.json();

    document.getElementById("modalName").innerText = ticket.creatorName || "Unknown";
    document.getElementById("modalSubject").innerText = ticket.subject || "No subject";
    document.getElementById("modalSource").innerText = ticket.creatorRole === "client" ? "Client" : "Employee";
    
    let displayStatus = ticket.status === "Completed" ? "Completed" : (ticket.creatorRole === "client" ? "Urgent" : ticket.status || "Pending");
    document.getElementById("modalStatus").innerText = displayStatus;
    document.getElementById("modalStatus").className = "status " + displayStatus.toLowerCase();

    document.getElementById("modalDate").innerText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown";
    document.getElementById("modalConcern").innerText = ticket.concern || "No concern";

    const markBtn = document.getElementById("markCompletedBtn");
    if (ticket.status === "Completed") {
      markBtn.disabled = true;
      markBtn.innerText = "Completed";
    } else {
      markBtn.disabled = false;
      markBtn.innerText = "Mark as Completed";
      markBtn.onclick = () => markTicketCompleted(ticketId);
    }

    document.getElementById("ticketModal").classList.add("show");
  } catch (err) {
    console.error("Error loading ticket:", err);
    alert("Failed to open ticket modal.");
  }
}

// ===== MARK TICKET AS COMPLETED =====
async function markTicketCompleted(ticketId) {
  try {
    const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "Completed" }),
    });
    if (!res.ok) throw new Error("Failed to update ticket");

    alert("Ticket marked as completed!");
    document.getElementById("ticketModal").classList.remove("show");
    loadTickets();
  } catch (err) {
    console.error("Error updating ticket:", err);
    alert("Failed to mark as completed.");
  }
}

// ===== LOAD REMARKS =====
async function loadRemarks() {
  try {
    const res = await fetch("https://www.mither3security.com/remarks", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch remarks");
    const remarks = await res.json();

    const tableBody = document.querySelector("#remarksTable tbody");
    tableBody.innerHTML = "";

    remarks.forEach(remark => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${remark.employeeName || "Unknown"}</td>
        <td><span class="status ${remark.penaltyLevel.toLowerCase().replace(" ", "-")}">${remark.penaltyLevel}</span></td>
        <td>${remark.dueProcess}</td>
        <td><span class="status ${remark.status.toLowerCase()}">${remark.status}</span></td>
        <td>${new Date(remark.createdAt).toLocaleDateString()}</td>
        <td><button class="btn view-remark" data-id="${remark._id}">View</button></td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".view-remark").forEach(btn => {
      btn.addEventListener("click", () => openRemarkModal(btn.dataset.id));
    });
  } catch (err) {
    console.error("Error fetching remarks:", err);
  }
}

// ===== LOAD EMPLOYEES FOR SELECT =====
async function loadEmployeesForSelect() {
  try {
    const res = await fetch("https://www.mither3security.com/employees", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch employees");
    const employees = await res.json();

    const select = document.getElementById("employeeSelect");
    select.innerHTML = '<option value="">-- Select Employee --</option>';

    employees.forEach(emp => {
      const name = emp.employeeData?.personalData?.name || "Unknown";
      const option = document.createElement("option");
      option.value = emp._id;
      option.textContent = name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
  }
}

// ===== LOAD TICKETS FOR SELECT (with optional filter) =====
async function loadTicketsForSelect(employeeId = null) {
  try {
    let url = "https://www.mither3security.com/tickets";
    if (employeeId) {
      url += `?reportedEmployeeId=${employeeId}`;
    }

    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch tickets");
    const tickets = await res.json();

    const select = document.getElementById("ticketSelect");
    select.innerHTML = '<option value="">-- No Ticket --</option>';

    tickets.forEach(ticket => {
      const option = document.createElement("option");
      option.value = ticket._id;
      option.textContent = `${ticket.subject} (${ticket.creatorName})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error fetching tickets:", err);
  }
}

// ===== ADD REMARK MODAL HANDLERS =====
document.getElementById("addRemarkBtn").addEventListener("click", () => {
  document.getElementById("remarkForm").reset();
  document.getElementById("addRemarkModal").classList.add("show");
});

document.getElementById("employeeSelect").addEventListener("change", () => {
  const employeeId = document.getElementById("employeeSelect").value;
  if (employeeId) {
    loadTicketsForSelect(employeeId);
  }
});

document.getElementById("remarkForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const employeeId = document.getElementById("employeeSelect").value;
  const penaltyLevel = document.getElementById("penaltyLevel").value;
  const dueProcess = document.getElementById("dueProcess").value;
  const ticketId = document.getElementById("ticketSelect").value || null;
  const hrComment = document.getElementById("hrComment").value;

  try {
    const res = await fetch("https://www.mither3security.com/remarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        employeeId,
        penaltyLevel,
        dueProcess,
        ticketId,
        hrComment,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to create remark");
    }

    alert("Remark created successfully!");
    document.getElementById("addRemarkModal").classList.remove("show");
    loadRemarks();
  } catch (err) {
    console.error("Error creating remark:", err);
    alert("Failed to create remark: " + err.message);
  }
});

// ===== VIEW REMARK MODAL =====
async function openRemarkModal(remarkId) {
  try {
    const res = await fetch(`https://www.mither3security.com/remarks/${remarkId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load remark");
    const remark = await res.json();

    document.getElementById("viewRemarkEmployee").innerText = remark.employeeName || "Unknown";
    document.getElementById("viewRemarkPenalty").innerText = remark.penaltyLevel;
    document.getElementById("viewRemarkPenalty").className = "status " + remark.penaltyLevel.toLowerCase().replace(" ", "-");
    document.getElementById("viewRemarkDueProcess").innerText = remark.dueProcess;
    document.getElementById("viewRemarkStatus").innerText = remark.status;
    document.getElementById("viewRemarkStatus").className = "status " + remark.status.toLowerCase();
    document.getElementById("viewRemarkComment").innerText = remark.hrComment;
    
    const createdDate = new Date(remark.createdBy.timestamp).toLocaleString();
    document.getElementById("viewRemarkCreatedBy").innerText = remark.createdBy.name || "Unknown";
    document.getElementById("viewRemarkCreatedDate").innerText = createdDate;

    // ===== DISPLAY TICKET DETAILS =====
    const ticketSection = document.getElementById("ticketDetailsSection");
    
    if (remark.ticketId && remark.ticketDetails) {
      ticketSection.style.display = "block";
      
      const ticketDetails = remark.ticketDetails;
      
      document.getElementById("ticketSubjectDisplay").innerText = remark.ticketSubject || "N/A";
      document.getElementById("ticketCreatorDisplay").innerText = ticketDetails.creatorName || "Unknown";
      document.getElementById("ticketSourceDisplay").innerText = ticketDetails.creatorRole === "client" ? "Client" : "Employee";
      document.getElementById("ticketConcernDisplay").innerText = ticketDetails.concern || "No concern provided";
      document.getElementById("ticketRatingDisplay").innerText = ticketDetails.rating || "Not Rated";
      document.getElementById("ticketDateDisplay").innerText = ticketDetails.createdAt ? new Date(ticketDetails.createdAt).toLocaleString() : "Unknown";
      
      // Add button to open full ticket in new modal (optional)
      const viewFullTicketBtn = document.getElementById("viewFullTicketBtn");
      viewFullTicketBtn.onclick = () => {
        openTicketModal(remark.ticketId);
      };
    } else {
      ticketSection.style.display = "none";
    }

    // Show update section only if status is Pending
    const updateSection = document.getElementById("updateSection");
    const updateBtn = document.getElementById("updateRemarkBtn");
    
    if (remark.status === "Pending") {
      updateSection.style.display = "block";
      updateBtn.style.display = "block";
      document.getElementById("updateStatus").value = remark.status;
      document.getElementById("resolutionNotes").value = remark.resolutionNotes || "";
      updateBtn.onclick = () => updateRemark(remarkId);
    } else {
      updateSection.style.display = "none";
      updateBtn.style.display = "none";
    }

    document.getElementById("viewRemarkModal").classList.add("show");
  } catch (err) {
    console.error("Error loading remark:", err);
    alert("Failed to open remark modal.");
  }
}

// ===== UPDATE REMARK =====
async function updateRemark(remarkId) {
  const status = document.getElementById("updateStatus").value;
  const resolutionNotes = document.getElementById("resolutionNotes").value;

  try {
    const res = await fetch(`https://www.mither3security.com/remarks/${remarkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status, resolutionNotes }),
    });

    if (!res.ok) throw new Error("Failed to update remark");

    alert("Remark updated successfully!");
    document.getElementById("viewRemarkModal").classList.remove("show");
    loadRemarks();
  } catch (err) {
    console.error("Error updating remark:", err);
    alert("Failed to update remark: " + err.message);
  }
}

// ===== MODAL CLOSE HANDLERS =====
document.getElementById("closeTicketBtn").addEventListener("click", () => {
  document.getElementById("ticketModal").classList.remove("show");
});

document.getElementById("closeFooterBtn").addEventListener("click", () => {
  document.getElementById("ticketModal").classList.remove("show");
});

document.getElementById("closeRemarkBtn").addEventListener("click", () => {
  document.getElementById("addRemarkModal").classList.remove("show");
});

document.getElementById("cancelRemarkBtn").addEventListener("click", () => {
  document.getElementById("addRemarkModal").classList.remove("show");
});

document.getElementById("closeViewRemarkBtn").addEventListener("click", () => {
  document.getElementById("viewRemarkModal").classList.remove("show");
});

document.getElementById("closeViewRemarkFooterBtn").addEventListener("click", () => {
  document.getElementById("viewRemarkModal").classList.remove("show");
});

// Close on modal background click
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
    }
  });
});

// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "loginSection.html";
  });
}

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", loadTickets);