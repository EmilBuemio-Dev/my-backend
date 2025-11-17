document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://www.mither3security.com";
  const token = localStorage.getItem("token");

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
  // ================= CALENDAR =================
  const calendarEl = document.getElementById("calendar");
  const monthYearEl = document.getElementById("monthYear");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  function renderCalendar(month, year) {
    calendarEl.innerHTML = "";

    // Weekday headers
    weekdays.forEach(day => {
      const div = document.createElement("div");
      div.textContent = day;
      div.classList.add("weekday");
      calendarEl.appendChild(div);
    });

    const firstDay = new Date(year, month).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots before start
    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement("div");
      calendarEl.appendChild(emptyDiv);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const div = document.createElement("div");
      div.textContent = d;
      div.classList.add("day");

      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        div.classList.add("highlight");
      }

      calendarEl.appendChild(div);
    }

    monthYearEl.textContent = new Date(year, month).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }

  prevMonthBtn.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  nextMonthBtn.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });

  renderCalendar(currentMonth, currentYear);

  // ================= EMPLOYEES =================
  async function loadEmployees() {
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const employees = await res.json();
      const total = employees.length || 0;

      document.getElementById("totalEmployees").textContent = total;

      // Progress circle - Updated to match new HTML structure
      const circle = document.getElementById("employeeCircle");
      const percentText = document.getElementById("employeePercent");
      
      if (circle && percentText) {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        let percent = total > 0 ? 100 : 0;
        
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
        percentText.textContent = percent + "%";
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      document.getElementById("totalEmployees").textContent = "0";
    }
  }

  // ================= SHIFTS =================
  async function updateShiftInfo() {
    const now = new Date();
    const hours = now.getHours();
    const isDayShift = hours >= 7 && hours < 19;

    // Get the shift card elements
    const shiftCards = document.querySelectorAll(".shift-grid .shift-card");
    
    if (shiftCards.length < 3) {
      console.error("Shift cards not found");
      return;
    }

    // Update shift displays
    const currentShiftEl = document.getElementById("currentShift");
    const lastShiftEl = document.getElementById("lastShift");
    const nextShiftEl = document.getElementById("nextShift");

    if (isDayShift) {
      if (currentShiftEl) currentShiftEl.textContent = "Day Shift";
      if (lastShiftEl) lastShiftEl.textContent = "Night Shift";
      if (nextShiftEl) nextShiftEl.textContent = "Day Shift";
    } else {
      if (currentShiftEl) currentShiftEl.textContent = "Night Shift";
      if (lastShiftEl) lastShiftEl.textContent = "Day Shift";
      if (nextShiftEl) nextShiftEl.textContent = "Night Shift";
    }

    // Add click handlers to shift cards
    shiftCards[0].addEventListener("click", () => openShiftModal(isDayShift ? "Day Shift" : "Night Shift"));
    shiftCards[1].addEventListener("click", () => openShiftModal(isDayShift ? "Night Shift" : "Day Shift"));
    shiftCards[2].addEventListener("click", () => openShiftModal(isDayShift ? "Day Shift" : "Night Shift"));
  }

  // ===== SHIFT MODAL FUNCTION =====
  async function openShiftModal(shiftType) {
  try {
    const res = await fetch(`${API_BASE}/api/branches`);
    if (!res.ok) throw new Error("Failed to load branch data");
    const branches = await res.json();

    // ✅ Correct: use client.guardShift, not client.branchData.guardShift
    const filteredBranches = branches.filter(client => {
      const shift = client.guardShift;
      if (!shift) return false;

      return shiftType === "Day Shift"
        ? shift.day && shift.day !== "N/A"
        : shift.night && shift.night !== "N/A";
    });

    const rows = filteredBranches.length
      ? filteredBranches
          .map(client => `
            <tr>
              <td>${client.branchData?.branch || "N/A"}</td>
              <td>${
                shiftType === "Day Shift"
                  ? client.guardShift?.day || "N/A"
                  : client.guardShift?.night || "N/A"
              }</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="2" style="text-align:center; padding: 2rem; color: #7d8da1;">No guards available for this shift</td></tr>`;

    let modal = document.querySelector(".shift-modal-dynamic");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal shift-modal-dynamic";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${shiftType}</h3>
          <span class="close-btn" onclick="this.closest('.modal').style.display='none'">&times;</span>
        </div>
        <div class="modal-body">
          <table class="shift-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Shift Time</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.style.display = "flex";

    modal.onclick = e => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };
  } catch (err) {
    console.error("Error opening shift modal:", err);
    alert("Failed to load shift details.");
  }
}


  // Update shifts immediately and every minute
  updateShiftInfo();
  setInterval(updateShiftInfo, 60000);

  // ================= ATTENDANCE =================
  async function loadAttendance() {
    try {
      const res = await fetch(`${API_BASE}/attendance/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch attendance data");

      const records = await res.json();
      const tbody = document.getElementById("attendanceBody");
      const notifList = document.getElementById("notifList");
      const notifDot = document.getElementById("notifDot");

      if (!tbody || !notifList || !notifDot) {
        console.error("Required elements not found");
        return;
      }

      tbody.innerHTML = "";
      notifList.innerHTML = "";
      let alerts = [];

      if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">No attendance records yet.</td></tr>`;
        notifDot.style.display = "none";
        return;
      }

      // Generate table + detect alerts
      records.forEach(record => {
        const checkin = new Date(record.checkinTime);
        const checkout = record.checkoutTime ? new Date(record.checkoutTime) : null;
        const status = record.status || "In Progress";

        // Add notifications
        if (status.toLowerCase() === "late") {
          alerts.push(`${record.employeeName} was late on ${checkin.toLocaleDateString()}.`);
        } else if (status.toLowerCase() === "absent") {
          alerts.push(`${record.employeeName} was absent on ${checkin.toLocaleDateString()}.`);
        } else if (!record.checkoutTime && status.toLowerCase() !== "absent") {
          alerts.push(`${record.employeeName} has not checked out yet.`);
        }

        // Populate table
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${record.employeeName || "Unknown"}</td>
          <td>
            ${record.checkinImageUrl 
              ? `<img src="${API_BASE}${record.checkinImageUrl}" 
                   alt="Photo"
                   style="width:50px;height:50px;object-fit:cover;cursor:pointer;border-radius:6px;" 
                   class="checkin-photo" />`
              : '<span style="color: #7d8da1;">No photo</span>'
            }
          </td>
          <td>${checkin.toLocaleString()}</td>
          <td>${checkout ? checkout.toLocaleString() : "-"}</td>
          <td><span class="status ${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span></td>
          <td><button class="view-photo-btn" data-url="${API_BASE}${record.checkinImageUrl}">View Photo</button></td>
        `;

        const viewBtn = tr.querySelector(".view-photo-btn");
        if (viewBtn && record.checkinImageUrl) {
          viewBtn.addEventListener("click", () => {
            window.open(API_BASE + record.checkinImageUrl, "_blank");
          });
        } else if (viewBtn) {
          viewBtn.disabled = true;
          viewBtn.textContent = "No Photo";
          viewBtn.style.opacity = "0.5";
          viewBtn.style.cursor = "not-allowed";
        }

        tbody.appendChild(tr);
      });

      // Update Notifications
      if (alerts.length > 0) {
        notifDot.style.display = "block";
        alerts.forEach(msg => {
          const li = document.createElement("li");
          li.textContent = msg;
          notifList.appendChild(li);
        });
      } else {
        notifDot.style.display = "none";
        notifList.innerHTML = "<li>No new notifications</li>";
      }

    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      const tbody = document.getElementById("attendanceBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error loading attendance records</td></tr>`;
      }
    }
  }

  // ================= NOTIFICATIONS MODAL =================
  const notifBtn = document.getElementById("notifBtn");
  const notifModal = document.getElementById("notifModal");

  if (notifBtn && notifModal) {
    notifBtn.addEventListener("click", () => {
      notifModal.style.display = "flex";
    });

    notifModal.addEventListener("click", e => {
      if (e.target === notifModal) {
        notifModal.style.display = "none";
      }
    });
  }

  // Global close function for modals
  window.closeNotifModal = function() {
    const modal = document.getElementById("notifModal");
    if (modal) modal.style.display = "none";
  };

  window.closeShiftModal = function() {
    const modal = document.getElementById("shiftModal");
    if (modal) modal.style.display = "none";
  };

  // ================= INITIALIZE =================
  loadEmployees();
  loadAttendance();
  
  console.log("Employee Dashboard initialized successfully");
});