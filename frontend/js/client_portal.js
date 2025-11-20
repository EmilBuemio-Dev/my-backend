document.addEventListener("DOMContentLoaded", async () => {
  console.log("client_portal.js loaded");
  
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
  initNotificationCenter();
  
  // Poll for new HR messages every 5 seconds
  setInterval(checkForNewMessages, 5000);
});

// ===== NOTIFICATION SYSTEM (Only HR Messages) =====
function initNotificationCenter() {
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDropdown = document.getElementById("notificationDropdown");

  if (!notificationBtn || !notificationDropdown) return;

  notificationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle("show");
    loadNotifications();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".notification-container")) {
      notificationDropdown.classList.remove("show");
    }
  });

  loadNotifications();
}

async function checkForNewMessages() {
  try {
    const user = getUserData();
    if (!user) return;

    const res = await fetch("https://www.mither3security.com/ticket-chats/unread/count", {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (res.ok) {
      const data = await res.json();
      updateNotificationBadge(data.unreadCount);

      // Fetch actual unread messages
      if (data.unreadCount > 0) {
        fetchUnreadMessages();
      }
    }
  } catch (err) {
    console.error("Error checking for messages:", err);
  }
}

async function fetchUnreadMessages() {
  try {
    const user = getUserData();
    if (!user) return;

    const res = await fetch("https://www.mither3security.com/ticket-chats/messages/unread-details", {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (res.ok) {
      const messages = await res.json();
      
      // Show only the latest unread message
      if (messages.length > 0) {
        const latestMsg = messages[0];
        const notification = {
          message: `New message from HR regarding "${latestMsg.ticketId.subject}"`,
          type: "info",
          ticketId: latestMsg.ticketId._id,
          messageId: latestMsg._id,
          timestamp: new Date().toLocaleString()
        };

        // Show toast
        showNotificationToast(notification);
      }
    }
  } catch (err) {
    console.error("Error fetching unread messages:", err);
  }
}

function showNotificationToast(notification) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${notification.type}`;
  toast.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
      <span>${notification.message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem;">×</button>
    </div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 6000);
}

function showNotification(message, type = "success", ticketId = null) {
  const notificationList = document.getElementById("notificationList");
  
  // Only show HR message notifications
  if (type !== "info") return;

  const notifItem = document.createElement("div");
  notifItem.className = `notification-item notification-${type}`;
  notifItem.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="close-notification">×</button>
    </div>
  `;
  
  if (notificationList) {
    notificationList.insertBefore(notifItem, notificationList.firstChild);
  }

  notifItem.querySelector(".close-notification").addEventListener("click", () => {
    notifItem.remove();
  });

  updateNotificationBadge();

  // Store only HR message notifications
  let notifications = JSON.parse(localStorage.getItem("hr_notifications") || "[]");
  notifications.unshift({ message, type, ticketId, timestamp: new Date().toLocaleString() });
  notifications = notifications.slice(0, 10);
  localStorage.setItem("hr_notifications", JSON.stringify(notifications));
}

function loadNotifications() {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;

  notificationList.innerHTML = "";
  const notifications = JSON.parse(localStorage.getItem("hr_notifications") || "[]");

  if (notifications.length === 0) {
    notificationList.innerHTML = "<p style='text-align:center; color: #999; padding: 1rem;'>No new messages</p>";
    return;
  }

  notifications.forEach(notif => {
    const item = document.createElement("div");
    item.className = `notification-item notification-${notif.type}`;
    item.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${notif.message}</span>
        <span class="notification-time" style="font-size: 0.75rem; color: #999;">${notif.timestamp}</span>
      </div>
    `;
    notificationList.appendChild(item);
  });
}

function updateNotificationBadge(count = null) {
  const notificationBell = document.getElementById("notificationBell");
  if (!notificationBell) return;

  let unreadCount = count;
  if (count === null) {
    const notifications = JSON.parse(localStorage.getItem("hr_notifications") || "[]");
    unreadCount = notifications.length;
  }

  if (unreadCount > 0) {
    notificationBell.textContent = unreadCount > 9 ? "9+" : unreadCount;
    notificationBell.style.display = "flex";
  } else {
    notificationBell.style.display = "none";
  }
}

// ===== Helper: Get user and token ===
function getUserData() {
  try {
    const userStr = localStorage.getItem("user");
    
    if (!userStr) {
      console.warn("No user in localStorage");
      alert("Invalid user session. Please log in again.");
      window.location.href = "index.html";
      return null;
    }

    const user = JSON.parse(userStr);
    
    if (!user || !user.token || !user.role || user.role !== "client") {
      console.warn("Invalid user data");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return null;
    }
    
    return user;
  } catch (err) {
    console.error("Error parsing user data:", err);
    localStorage.removeItem("user");
    window.location.href = "index.html";
    return null;
  }
}

// ===== Load all guards under client's branch ===
async function loadClientGuards(searchName = "") {
  try {
    const clientData = getUserData();
    if (!clientData) return [];

    const clientBranch = clientData.branch || "";
    
    if (!clientBranch) {
      console.warn("⚠️ Client branch is not set!");
      return [];
    }

    const res = await fetch("https://www.mither3security.com/employees");
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

// ===== Populate Employee Selection ===
async function populateEmployeeSelect() {
  const select = document.getElementById("reportedEmployee");
  if (!select) return;
  
  select.innerHTML = `<option value="">-- Optional: Report a specific employee --</option>`;

  const guards = await loadClientGuards();
  guards.forEach(emp => {
    const name = emp.employeeData?.personalData?.name || "Unnamed";
    const badge = emp.employeeData?.basicInformation?.badgeNo || "";
    const opt = document.createElement("option");
    opt.value = emp._id;
    opt.textContent = `${name} ${badge ? `(${badge})` : ""}`;
    select.appendChild(opt);
  });
}

// ===== Render Guards Table ===
function renderGuardsTable(guards) {
  const tbody = document.querySelector("#guardsTable tbody");
  if (!tbody) return;
  
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
      <td><img src="${profileImg}" alt="profile" style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
      <td>${name}</td>
      <td>${badgeNo}</td>
      <td>${shift}</td>
      <td><span class="status ${status.toLowerCase()}">${status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== Initialize File Preview ===
function initFilePreview() {
  const fileInput = document.getElementById("ticketAttachment");
  const preview = document.getElementById("attachmentPreview");

  if (!fileInput) return;

  let selectedFiles = [];

  fileInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    
    newFiles.forEach(file => {
      if (!file.type.startsWith("image/")) {
        alert("Only image files allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        alert("File already added");
        return;
      }

      selectedFiles.push(file);
      renderFilePreview();
    });

    fileInput.value = "";
  });

  function renderFilePreview() {
    preview.innerHTML = "";

    if (selectedFiles.length === 0) return;

    const container = document.createElement("div");
    container.style.marginTop = "1rem";
    container.style.padding = "1rem";
    container.style.background = "var(--clr-light)";
    container.style.borderRadius = "6px";

    const title = document.createElement("p");
    title.style.fontWeight = "600";
    title.textContent = `Selected Files (${selectedFiles.length})`;
    container.appendChild(title);

    const fileList = document.createElement("div");
    fileList.style.display = "flex";
    fileList.style.flexDirection = "column";
    fileList.style.gap = "0.5rem";

    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileItem = document.createElement("div");
        fileItem.style.display = "flex";
        fileItem.style.gap = "0.5rem";
        fileItem.style.alignItems = "flex-start";
        fileItem.style.padding = "0.5rem";
        fileItem.style.background = "var(--clr-white)";
        fileItem.style.borderRadius = "6px";

        const img = document.createElement("img");
        img.src = event.target.result;
        img.style.width = "60px";
        img.style.height = "60px";
        img.style.borderRadius = "4px";
        img.style.objectFit = "cover";

        const info = document.createElement("div");
        info.style.flex = "1";
        info.innerHTML = `
          <p style="font-size: 0.85rem; margin: 0;">${file.name}</p>
          <p style="font-size: 0.75rem; color: #999; margin: 0.25rem 0 0 0;">${(file.size / 1024).toFixed(2)} KB</p>
        `;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "×";
        removeBtn.style.background = "var(--clr-danger)";
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.width = "24px";
        removeBtn.style.height = "24px";
        removeBtn.style.cursor = "pointer";
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          selectedFiles.splice(index, 1);
          renderFilePreview();
        });

        fileItem.appendChild(img);
        fileItem.appendChild(info);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
      };
      reader.readAsDataURL(file);
    });

    container.appendChild(fileList);
    preview.appendChild(container);
  }

  const originalForm = document.getElementById("ticketForm");
  originalForm.addEventListener("submit", (e) => {
    if (selectedFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      selectedFiles.forEach(file => dataTransfer.items.add(file));
      fileInput.files = dataTransfer.files;
    }
  });
}

// ===== Initialize Ticket Submission ===
function initTicketSubmit() {
  const ticketForm = document.getElementById("ticketForm");
  if (!ticketForm) return;

  ticketForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = getUserData();
    if (!user) return;

    const subject = document.getElementById("subject")?.value;
    const concern = document.getElementById("concern")?.value.trim();
    const priority = document.getElementById("priority")?.value || "Pending";
    const reportedEmployeeId = document.getElementById("reportedEmployee")?.value || null;
    const fileInput = document.getElementById("ticketAttachment");

    if (!subject || !concern) {
      alert("Please fill subject and concern.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("concern", concern);
      formData.append("priority", priority);
      formData.append("reportedEmployeeId", reportedEmployeeId);
      formData.append("creatorId", user._id);
      formData.append("creatorEmail", user.email);

      if (fileInput?.files?.length > 0) {
        Array.from(fileInput.files).forEach((file) => {
          formData.append(`ticketAttachment`, file);
        });
      }

      const res = await fetch("https://www.mither3security.com/tickets", {
        method: "POST",
        headers: { "Authorization": `Bearer ${user.token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit ticket");

      alert(`✅ Ticket submitted successfully!\nStatus: ${data.ticket.status}`);
      ticketForm.reset();
      document.getElementById("attachmentPreview").innerHTML = "";
      await loadMyTickets();
    } catch (err) {
      console.error("Error submitting ticket:", err);
      alert("Error submitting ticket.");
    }
  });
}

// ===== Load My Tickets ===
async function loadMyTickets() {
  const user = getUserData();
  if (!user) return;

  try {
    const res = await fetch("https://www.mither3security.com/tickets", {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch tickets");

    const tickets = await res.json();
    const tableBody = document.querySelector("#ticketsTable tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!tickets.length) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No tickets submitted yet.</td></tr>`;
      return;
    }

    tickets.forEach(ticket => {
      const row = document.createElement("tr");
      const reported = ticket.reportedEmployeeName ? ` — ${ticket.reportedEmployeeName}` : "";
      row.innerHTML = `
        <td>${ticket.subject}${reported}</td>
        <td><span class="status ${ticket.status.toLowerCase()}">${ticket.status}</span></td>
        <td>${new Date(ticket.createdAt).toLocaleString()}</td>
        <td><button class="view-record" data-ticket-id="${ticket._id}">View</button></td>
      `;
      tableBody.appendChild(row);

      row.querySelector(".view-record").addEventListener("click", () => {
        openTicketModal(ticket);
      });
    });
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
}

// ===== Open Ticket Modal with Chat ===
async function openTicketModal(ticket) {
  let modal = document.getElementById("ticketDetailsModal");
  
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ticketDetailsModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-modal">&times;</button>
        <h2>Ticket Details</h2>
        <div id="modalDetails"></div>
        <div id="chatSection" style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--clr-light);">
          <h3 style="margin-bottom: 1rem;">Chat with HR</h3>
          <div id="chatBox" style="background: var(--clr-light); padding: 1rem; border-radius: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 1rem; min-height: 200px;">
            <!-- Messages will load here -->
          </div>
          <form id="chatForm" style="display: flex; gap: 0.5rem;">
            <input type="text" id="chatInput" placeholder="Type your message..." style="flex: 1; padding: 0.6rem; border: 1px solid #ddd; border-radius: 6px;">
            <button type="submit" style="padding: 0.6rem 1.5rem; background: var(--clr-primary); color: white; border: none; border-radius: 6px; cursor: pointer;">Send</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".close-modal").addEventListener("click", () => {
      modal.classList.remove("show");
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
      }
    });
  }

  const detailsDiv = modal.querySelector("#modalDetails");
  let attachmentHTML = "";
  
  if (ticket.attachments && ticket.attachments.length > 0) {
    attachmentHTML = `
      <div class="ticket-detail-item">
        <strong>Attachments:</strong>
        <div style="margin-top: 0.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem;">
          ${ticket.attachments.map(att => `
            <img src="https://www.mither3security.com${att}" alt="attachment" 
                 style="max-width: 100%; height: 100px; border-radius: 6px; object-fit: cover; cursor: pointer;">
          `).join("")}
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
      <strong>Priority:</strong> <span class="status ${ticket.priority?.toLowerCase() || 'pending'}">${ticket.priority || 'Pending'}</span>
    </div>
    <div class="ticket-detail-item">
      <strong>Date:</strong> ${new Date(ticket.createdAt).toLocaleString()}
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

  // Load chat messages
  await loadChatMessages(ticket._id);

  // Setup chat form
  const chatForm = modal.querySelector("#chatForm");
  const chatInput = modal.querySelector("#chatInput");

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    const user = getUserData();
    try {
      const res = await fetch(`https://www.mither3security.com/ticket-chats/${ticket._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        chatInput.value = "";
        await loadChatMessages(ticket._id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  modal.classList.add("show");
}

// ===== Load Chat Messages ===
async function loadChatMessages(ticketId) {
  const user = getUserData();
  if (!user) return;

  try {
    const res = await fetch(`https://www.mither3security.com/ticket-chats/${ticketId}/messages`, {
      headers: { "Authorization": `Bearer ${user.token}` },
    });

    if (!res.ok) return;

    const messages = await res.json();
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";

    if (messages.length === 0) {
      chatBox.innerHTML = "<p style='text-align: center; color: #999;'>No messages yet. Start the conversation!</p>";
      return;
    }

    messages.forEach(msg => {
      const isCurrentUser = msg.senderId === user._id || msg.senderEmail === user.email;
      const messageDiv = document.createElement("div");
      messageDiv.style.marginBottom = "0.8rem";
      messageDiv.style.padding = "0.8rem";
      messageDiv.style.borderRadius = "8px";
      messageDiv.style.background = isCurrentUser ? "var(--clr-primary)" : "var(--clr-white)";
      messageDiv.style.color = isCurrentUser ? "white" : "var(--clr-dark)";

      const timeStr = new Date(msg.createdAt).toLocaleTimeString();
      messageDiv.innerHTML = `
        <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.3rem;">
          ${msg.senderName} ${isCurrentUser ? "(You)" : `(${msg.senderRole.toUpperCase()})`}
        </div>
        <div>${msg.message}</div>
        <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 0.3rem;">${timeStr}</div>
      `;
      chatBox.appendChild(messageDiv);
    });

    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Mark messages as read
    messages.forEach(msg => {
      if (msg.senderId !== user._id && msg.senderEmail !== user.email) {
        fetch(`https://www.mither3security.com/ticket-chats/${msg._id}/read`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${user.token}` },
        }).catch(err => console.error("Error marking read:", err));
      }
    });
  } catch (err) {
    console.error("Error loading chat messages:", err);
  }
}

// ===== Search ===
function initSearch() {
  const searchBtn = document.getElementById("refreshGuards");
  const searchInput = document.getElementById("searchGuard");

  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    await loadClientGuards(query);
    await populateEmployeeSelect();
  });
}

// ===== Logout ===
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "loginSection.html";
  });
}