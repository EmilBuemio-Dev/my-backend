const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const userId = localStorage.getItem("userId");

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
    
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    
    if (tabName === "remarks-tab") {
      loadRemarks();
      loadEmployeesForSelect();
    }
  });
});

// ===== LOAD TICKETS WITH UPDATED FUNCTIONS =====
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

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${ticket.creatorName || "Unknown"}</td>
        <td>${ticket.subject || "No Subject"}</td>
        <td>${ticket.creatorRole === "client" ? "Client" : "Employee"}</td>
        <td>
          <span class="status ${statusClass}">${statusText}</span>
          ${ticket.priority ? `<br><span class="status ${ticket.priority.toLowerCase()}">${ticket.priority}</span>` : ""}
        </td>
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

// ===== OPEN TICKET MODAL WITH CHAT =====
async function openTicketModal(ticketId) {
  try {
    if (!ticketId) {
      alert("Invalid ticket ID");
      return;
    }

    const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load ticket`);
    const ticket = await res.json();

    document.getElementById("modalName").innerText = ticket.creatorName || "Unknown";
    document.getElementById("modalSubject").innerText = ticket.subject || "No subject";
    
    const reportedEmployeeElement = document.getElementById("modalReportedEmployee");
    if (ticket.reportedEmployeeId && ticket.reportedEmployeeName) {
      reportedEmployeeElement.innerHTML = `
        <a href="#" data-employee-id="${ticket.reportedEmployeeId}" 
           style="color: #007bff; text-decoration: underline; cursor: pointer;"
           class="employee-link">
          ${ticket.reportedEmployeeName}
        </a>
      `;
      
      const employeeLink = reportedEmployeeElement.querySelector('.employee-link');
      employeeLink.addEventListener('click', (e) => {
        e.preventDefault();
        const employeeId = e.target.dataset.employeeId;
        window.location.href = `../html/profile.html?id=${employeeId}`;
      });
    } else {
      reportedEmployeeElement.innerText = "N/A";
    }
    
    document.getElementById("modalSource").innerText = ticket.creatorRole === "client" ? "Client" : "Employee";
    document.getElementById("modalStatus").innerText = ticket.status || "Pending";
    document.getElementById("modalStatus").className = "status " + (ticket.status?.toLowerCase() || "pending");
    
    // Display priority
    if (ticket.priority) {
      const priorityEl = document.getElementById("modalPriority");
      if (priorityEl) {
        priorityEl.innerText = ticket.priority;
        priorityEl.className = "status " + ticket.priority.toLowerCase();
      }
    }

    document.getElementById("modalDate").innerText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown";
    document.getElementById("modalConcern").innerText = ticket.concern || "No concern";

    // Display multiple attachments
    const attachmentDiv = document.getElementById("modalAttachment");
    if (ticket.attachments && ticket.attachments.length > 0) {
      attachmentDiv.innerHTML = `
        <p><strong>Attachments (${ticket.attachments.length}):</strong></p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem;">
          ${ticket.attachments.map(att => `
            <a href="https://www.mither3security.com${att}" target="_blank" style="cursor: pointer;">
              <img src="https://www.mither3security.com${att}" 
                   alt="attachment" 
                   style="max-width: 100%; height: 100px; border-radius: 8px; object-fit: cover; border: 2px solid #ddd; transition: transform 0.2s ease;"
                   onmouseover="this.style.transform='scale(1.05)'"
                   onmouseout="this.style.transform='scale(1)'">
            </a>
          `).join("")}
        </div>
      `;
      attachmentDiv.style.display = "block";
    } else {
      attachmentDiv.style.display = "none";
    }

    const markBtn = document.getElementById("markCompletedBtn");
    if (ticket.status === "Completed") {
      markBtn.disabled = true;
      markBtn.innerText = "Completed";
    } else {
      markBtn.disabled = false;
      markBtn.innerText = "Mark as Completed";
      markBtn.onclick = () => markTicketCompleted(ticketId);
    }

    // Load chat messages
    await loadChatMessages(ticketId);

    // Setup chat form
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");

    if (chatForm && chatInput) {
      chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        try {
          const res = await fetch(`https://www.mither3security.com/ticket-chats/${ticketId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
          });

          if (res.ok) {
            chatInput.value = "";
            await loadChatMessages(ticketId);
          }
        } catch (err) {
          console.error("Error sending message:", err);
        }
      };
    }

    document.getElementById("ticketModal").classList.add("show");
  } catch (err) {
    console.error("Error loading ticket:", err);
    alert("Failed to open ticket modal: " + err.message);
  }
}

// ===== LOAD CHAT MESSAGES =====
async function loadChatMessages(ticketId) {
  try {
    const res = await fetch(`https://www.mither3security.com/ticket-chats/${ticketId}/messages`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) return;

    const messages = await res.json();
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";

    if (messages.length === 0) {
      chatBox.innerHTML = "<p style='text-align: center; color: #999; padding: 1rem;'>No messages yet. Start a conversation with the client.</p>";
      return;
    }

    messages.forEach(msg => {
      const isHRMessage = msg.senderRole === "hr" || msg.senderRole === "admin";
      const messageDiv = document.createElement("div");
      messageDiv.style.marginBottom = "0.8rem";
      messageDiv.style.padding = "0.8rem";
      messageDiv.style.borderRadius = "8px";
      messageDiv.style.background = isHRMessage ? "#e3f2fd" : "#f0f0f0";
      messageDiv.style.borderLeft = isHRMessage ? "4px solid #007bff" : "4px solid #999";

      const timeStr = new Date(msg.createdAt).toLocaleTimeString();
      messageDiv.innerHTML = `
        <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.3rem; color: var(--clr-dark);">
          ${msg.senderName} <span style="font-size: 0.75rem; color: #666;">(${msg.senderRole.toUpperCase()})</span>
        </div>
        <div style="color: var(--clr-dark);">${msg.message}</div>
        <div style="font-size: 0.75rem; color: #999; margin-top: 0.3rem;">${timeStr}</div>
      `;
      chatBox.appendChild(messageDiv);
    });

    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Mark messages as read
    messages.forEach(msg => {
      if (msg.senderRole === "client" && msg.senderId !== userId) {
        fetch(`https://www.mither3security.com/ticket-chats/${msg._id}/read`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` },
        }).catch(err => console.error("Error marking read:", err));
      }
    });
  } catch (err) {
    console.error("Error loading chat messages:", err);
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

// ===== LOAD TICKETS FOR SELECT =====
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

    const employeeElement = document.getElementById("viewRemarkEmployee");
    if (remark.employeeId) {
      employeeElement.innerHTML = `
        <a href="#" data-employee-id="${remark.employeeId}" 
           style="color: #007bff; text-decoration: underline; cursor: pointer;"
           class="employee-link">
          ${remark.employeeName || "Unknown"}
        </a>
      `;
      
      const employeeLink = employeeElement.querySelector('.employee-link');
      employeeLink.addEventListener('click', (e) => {
        e.preventDefault();
        const employeeId = e.target.dataset.employeeId;
        window.location.href = `../html/profile.html?id=${employeeId}`;
      });
    } else {
      employeeElement.innerText = remark.employeeName || "Unknown";
    }

    document.getElementById("viewRemarkPenalty").innerText = remark.penaltyLevel;
    document.getElementById("viewRemarkPenalty").className = "status " + remark.penaltyLevel.toLowerCase().replace(" ", "-");
    document.getElementById("viewRemarkDueProcess").innerText = remark.dueProcess;
    document.getElementById("viewRemarkStatus").innerText = remark.status;
    document.getElementById("viewRemarkStatus").className = "status " + remark.status.toLowerCase();
    document.getElementById("viewRemarkComment").innerText = remark.hrComment;
    
    const createdDate = new Date(remark.createdBy.timestamp).toLocaleString();
    document.getElementById("viewRemarkCreatedBy").innerText = remark.createdBy.name || "Unknown";
    document.getElementById("viewRemarkCreatedDate").innerText = createdDate;

    const ticketSection = document.getElementById("ticketDetailsSection");
    
    if (remark.ticketId) {
      try {
        const ticketRes = await fetch(`https://www.mither3security.com/tickets/${remark.ticketId}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        
        if (ticketRes.ok) {
          const ticketDetails = await ticketRes.json();
          
          ticketSection.style.display = "block";
          
          document.getElementById("ticketSubjectDisplay").innerText = ticketDetails.subject || "N/A";
          document.getElementById("ticketCreatorDisplay").innerText = ticketDetails.creatorName || "Unknown";
          document.getElementById("ticketSourceDisplay").innerText = ticketDetails.creatorRole === "client" ? "Client" : "Employee";
          document.getElementById("ticketDateDisplay").innerText = ticketDetails.createdAt ? new Date(ticketDetails.createdAt).toLocaleString() : "Unknown";
          
          // Display multiple ticket attachments
          const ticketAttachmentDiv = document.getElementById("ticketAttachmentDisplay");
          if (ticketDetails.attachments && ticketDetails.attachments.length > 0) {
            ticketAttachmentDiv.innerHTML = `
              <p style="margin-top: 1rem;"><strong>📎 Attached Images (${ticketDetails.attachments.length}):</strong></p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem;">
                ${ticketDetails.attachments.map(att => `
                  <a href="https://www.mither3security.com${att}" target="_blank">
                    <img src="https://www.mither3security.com${att}" 
                         alt="attachment" 
                         style="max-width: 100%; height: 100px; border-radius: 6px; object-fit: contain; border: 2px solid #007bff; transition: transform 0.2s ease; cursor: pointer;"
                         onmouseover="this.style.transform='scale(1.05)'"
                         onmouseout="this.style.transform='scale(1)'">
                  </a>
                `).join("")}
              </div>
            `;
            ticketAttachmentDiv.style.display = "block";
          } else {
            ticketAttachmentDiv.style.display = "none";
          }
          
          const viewFullTicketBtn = document.getElementById("viewFullTicketBtn");
          if (viewFullTicketBtn) {
            viewFullTicketBtn.onclick = () => {
              openTicketModal(remark.ticketId);
            };
          }
        } else {
          ticketSection.style.display = "none";
        }
      } catch (ticketErr) {
        console.error("Error fetching ticket details:", ticketErr);
        ticketSection.style.display = "none";
      }
    } else {
      ticketSection.style.display = "none";
    }

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