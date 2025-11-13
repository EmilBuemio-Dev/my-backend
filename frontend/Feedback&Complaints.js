const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
  alert("Please log in first.");
  window.location.href = "index.html";
} else if (role !== "admin" && role !== "hr") {
  alert("Access denied. Only admin or HR can view tickets.");
  window.location.href = "index.html";
}

// ===== Load all tickets =====
async function loadTickets() {
  try {
    const res = await fetch("http://localhost:5000/tickets", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
    const tickets = await res.json();

    const tableBody = document.querySelector("#ticketsTable tbody");
    tableBody.innerHTML = "";

    tickets.forEach(ticket => {
      // ✅ Determine proper status label and class
      let statusText = ticket.status || "Pending";
      let statusClass = statusText.toLowerCase();

      if (ticket.creatorRole === "client" && statusText !== "Completed") {
        statusText = "Urgent";
        statusClass = "urgent";
      } else if (statusText === "Completed") {
        statusClass = "completed";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${ticket.creatorName || "Unknown"}</td>
        <td>${ticket.subject || "No Subject"}</td>
        <td>${ticket.creatorRole === "client" ? "Client" : "Employee"}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}</td>
        <td><button class="view-record" data-id="${ticket._id}">View</button></td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".view-record").forEach(btn => {
      btn.addEventListener("click", () => openTicketModal(btn.dataset.id));
    });

  } catch (err) {
    console.error("Error fetching tickets:", err);
    alert("Failed to load tickets.");
  }
}

// ===== Open Ticket Modal =====
async function openTicketModal(ticketId) {
  try {
    const res = await fetch(`http://localhost:5000/tickets/${ticketId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load ticket ${ticketId}`);
    const ticket = await res.json();

    document.getElementById("modalName").innerText = ticket.creatorName || "Unknown";

    const reportedEmployeeElement = document.getElementById("modalReportedEmployee");
    if (ticket.reportedEmployeeId && ticket.reportedEmployeeName) {
      reportedEmployeeElement.innerHTML = `
        <a href="profile.html?id=${ticket.reportedEmployeeId}" 
           target="_blank" 
           class="employee-link">
           ${ticket.reportedEmployeeName}
        </a>
      `;
    } else {
      reportedEmployeeElement.innerText = ticket.reportedEmployeeName || "N/A";
    }

    document.getElementById("modalSubject").innerText = ticket.subject || "No subject";
    document.getElementById("modalSource").innerText = ticket.creatorRole === "client" ? "Client" : "Employee";
    
    // ✅ Correct display of status (Urgent only if not Completed)
    let displayStatus = ticket.status === "Completed" 
      ? "Completed" 
      : (ticket.creatorRole === "client" ? "Urgent" : ticket.status || "Pending");

    const statusClass = displayStatus.toLowerCase();

    document.getElementById("modalStatus").innerText = displayStatus;
    document.getElementById("modalStatus").className = "status " + statusClass;

    document.getElementById("modalRating").innerText = ticket.rating || "Not Rated";
    document.getElementById("modalConcern").innerText = ticket.concern || "No concern";
    document.getElementById("modalDate").innerText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown";

    const markBtn = document.getElementById("markCompletedBtn");
    if (ticket.status === "Completed") {
      markBtn.disabled = true;
      markBtn.innerText = "Completed";
      markBtn.classList.add("disabled");
    } else {
      markBtn.disabled = false;
      markBtn.innerText = "Mark as Completed";
      markBtn.classList.remove("disabled");
      markBtn.onclick = () => markCompleted(ticketId);
    }

    document.getElementById("ticketModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading ticket details:", err);
    alert("Failed to open ticket modal.");
  }
}

// ===== Mark Ticket as Completed =====
async function markCompleted(ticketId) {
  try {
    const res = await fetch(`http://localhost:5000/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "Completed" }),
    });
    if (!res.ok) throw new Error("Failed to update ticket status");

    alert("Ticket marked as completed!");
    document.getElementById("ticketModal").style.display = "none";
    await loadTickets(); // ✅ Refresh table instantly
  } catch (err) {
    console.error("Error updating ticket:", err);
    alert("Failed to mark as completed.");
  }
}


// ===== Close modal =====
document.getElementById("closeBtn").addEventListener("click", () => {
  document.getElementById("ticketModal").style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target.id === "ticketModal") document.getElementById("ticketModal").style.display = "none";
});

// ===== Logout =====
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

// ===== Load tickets on page load =====
window.addEventListener("DOMContentLoaded", loadTickets);