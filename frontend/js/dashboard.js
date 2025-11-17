const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
if (!token || (role !== "admin" && role !== "hr")) {
  if (role === "hr") {
    window.location.href = "hr_login.html";
  } else {
    window.location.href = "admin.html";
  }
}

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

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setCircleProgress(circleId, percent, circleLength) {
  const circle = document.getElementById(circleId);
  if (circle) {
    const offset = circleLength - (percent / 100) * circleLength;
    circle.style.strokeDasharray = circleLength;
    circle.style.strokeDashoffset = offset;
  }
}

// ============================================
// LOAD DASHBOARD STATISTICS
// ============================================

async function loadDashboardStats() {
  try {
    const res = await fetch("https://www.mither3security.com/employees");
    if (!res.ok) throw new Error("Failed to fetch employees");
    const employees = await res.json();

    const total = employees.length;
    const active = employees.filter(e => e.employeeData?.basicInformation?.status === "Active").length;
    const pending = employees.filter(e => e.employeeData?.basicInformation?.status === "Pending").length;

    document.getElementById("totalCount").textContent = total;
    document.getElementById("activeCount").textContent = active;
    document.getElementById("inactiveCount").textContent = pending;

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;

    document.getElementById("totalPercent").textContent = "100%";
    document.getElementById("activePercent").textContent = `${activePercent}%`;
    document.getElementById("inactivePercent").textContent = `${pendingPercent}%`;

    const circleLength = 2 * Math.PI * 30;
    setTimeout(() => {
      setCircleProgress("totalCircle", 100, circleLength);
      setCircleProgress("activeCircle", activePercent, circleLength);
      setCircleProgress("inactiveCircle", pendingPercent, circleLength);
    }, 100);

  } catch (err) {
    console.error("Error loading dashboard stats:", err);
  }
}

// ============================================
// LOAD ATTENDANCE RATE PIE CHART
// ============================================

async function loadAttendanceRateBarGraph() {
  try {
    const res = await fetch("https://www.mither3security.com/attendance/all", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch attendance records");

    const records = await res.json();
    
    const attendanceCounts = {
      onTime: 0,
      late: 0,
      absent: 0
    };

    records.forEach(record => {
      if (!record.status) return;
      
      const status = record.status.toLowerCase();
      if (status.includes("absent")) {
        attendanceCounts.absent++;
      } else if (status.includes("late")) {
        attendanceCounts.late++;
      } else if (status.includes("on-time") || status === "on-time") {
        attendanceCounts.onTime++;
      } else {
        attendanceCounts.onTime++;
      }
    });

    const total = records.length || 1;

    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['On-Time', 'Late', 'Absent'],
        datasets: [{
          data: [attendanceCounts.onTime, attendanceCounts.late, attendanceCounts.absent],
          backgroundColor: [
            '#1abc9c',
            '#f39c12',
            '#e74c3c'
          ],
          borderColor: '#fff',
          borderWidth: 3,
          hoverBorderWidth: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#222222',
              font: { size: 13, weight: '600' },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#3498db',
            borderWidth: 1,
            displayColors: true,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const percent = Math.round((value / total) * 100);
                return `${label}: ${value} (${percent}%)`;
              }
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Error loading attendance rate pie chart:", err);
  }
}

// ============================================
// LOAD WEEKLY ATTENDANCE REPORT
// ============================================

async function loadWeeklyAttendanceReport() {
  try {
    const attendanceModal = document.getElementById("weeklyAttendanceModal");
    const tbody = document.getElementById("weeklyReportBody");
    
    tbody.innerHTML = '<tr><td colspan="4" class="no-data">Loading weekly report...</td></tr>';
    attendanceModal.classList.add("show");

    const res = await fetch("https://www.mither3security.com/attendance/all", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch attendance records");

    const records = await res.json();

    // Get week date range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Filter records for this week
    const weekRecords = records.filter(r => {
      const recordDate = new Date(r.checkinTime);
      return recordDate >= weekStart && recordDate <= weekEnd;
    });

    // Group by employee
    const employeeStats = {};
    weekRecords.forEach(record => {
      const empName = record.employeeName || "Unknown";
      if (!employeeStats[empName]) {
        employeeStats[empName] = { onTime: 0, late: 0, absent: 0 };
      }

      const status = record.status.toLowerCase();
      if (status.includes("absent")) {
        employeeStats[empName].absent++;
      } else if (status.includes("late")) {
        employeeStats[empName].late++;
      } else {
        employeeStats[empName].onTime++;
      }
    });

    // Calculate totals
    let totalOnTime = 0, totalLate = 0, totalAbsent = 0;
    Object.values(employeeStats).forEach(stats => {
      totalOnTime += stats.onTime;
      totalLate += stats.late;
      totalAbsent += stats.absent;
    });

    tbody.innerHTML = "";

    // Add employee rows
    Object.entries(employeeStats).forEach(([empName, stats]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${empName}</td>
        <td class="on-time-cell">${stats.onTime}</td>
        <td class="late-cell">${stats.late}</td>
        <td class="absent-cell">${stats.absent}</td>
      `;
      tbody.appendChild(tr);
    });

    // Add total row (static footer)
    const totalRow = document.createElement("tr");
    totalRow.classList.add("total-row");
    totalRow.innerHTML = `
      <td><strong>TOTAL</strong></td>
      <td class="on-time-cell"><strong>${totalOnTime}</strong></td>
      <td class="late-cell"><strong>${totalLate}</strong></td>
      <td class="absent-cell"><strong>${totalAbsent}</strong></td>
    `;
    tbody.appendChild(totalRow);

    // Update date range display
    const weekDateRange = document.getElementById("weekDateRange");
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    weekDateRange.textContent = `${startStr} - ${endStr}`;

  } catch (err) {
    console.error("Error loading weekly attendance report:", err);
    const tbody = document.getElementById("weeklyReportBody");
    tbody.innerHTML = `<tr><td colspan="4" class="no-data">Error loading report</td></tr>`;
  }
}

// ============================================
// LOAD COMPLAINTS CHART
// ============================================

async function loadComplaintsChart() {
  try {
    const res = await fetch("https://www.mither3security.com/tickets", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if(!res.ok) throw new Error("Failed to fetch complaints");

    const tickets = await res.json();

    const weekCounts = [0,0,0,0,0,0,0];

    tickets.forEach(ticket => {
      if (!ticket.createdAt) return;

      const date = new Date(ticket.createdAt);
      const day = date.getDay();
      weekCounts[day]++;
    });

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [
      weekCounts[1],
      weekCounts[2],
      weekCounts[3],
      weekCounts[4],
      weekCounts[5],
      weekCounts[6],
      weekCounts[0]
    ];

    const ctx = document.getElementById('complaintschart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.01)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Complaints',
          data: data,
          borderColor: '#3498db',
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#3498db',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return 'Complaints: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawBorder: false
            },
            ticks: {
              stepSize: 5,
              color: '#7d8da1',
              font: { size: 11 }
            }
          },
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#7d8da1',
              font: { size: 11 }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

  } catch(err) {
    console.error("Error loading complaints chart:", err);
  }
}

// ============================================
// LOAD TODAY'S COMPLAINTS
// ============================================

async function loadTodayComplaints() {
  try {
    const res = await fetch("https://www.mither3security.com/tickets", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch complaints");

    const complaints = await res.json();
    const today = new Date().toISOString().split("T")[0];
    const todaysComplaints = complaints.filter(c => new Date(c.createdAt).toISOString().split("T")[0] === today);

    const tbody = document.getElementById("complaints-body");
    tbody.innerHTML = "";

    if (todaysComplaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="no-data">No complaints today</td></tr>`;
    } else {
      todaysComplaints.forEach(c => {
        const isUrgent = c.creatorRole === "client";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${c.creatorName || "Unknown"}</td>
          <td>${c.subject || ""}</td>
          <td><span class="status ${isUrgent ? "urgent" : c.status === "Pending" ? "pending" : "completed"}">
            ${isUrgent ? "Urgent" : c.status}
          </span></td>
          <td>${new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td><button class="view-record" data-id="${c._id}">View</button></td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll(".view-record").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openTicketModal(btn.dataset.id);
        });
      });
    }
  } catch (err) {
    console.error("Error loading today's complaints:", err);
    const tbody = document.getElementById("complaints-body");
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">Error loading complaints</td></tr>`;
  }
}

const leaveCard = document.getElementById("leaveCard");
const leaveTableModal = document.getElementById("leaveTableModal");
const closeLeaveTableModal = document.getElementById("closeLeaveTableModal");
const leaveModal = document.getElementById("leaveModal");
const closeLeaveModal = document.getElementById("closeLeaveModal");
const approveLeaveBtn = document.getElementById("approveLeaveBtn");
const disapproveLeaveBtn = document.getElementById("disapproveLeaveBtn");
const leaveCount = document.getElementById("leaveCount");

// ============================================
// ATTENDANCE CARD CLICK - OPEN WEEKLY REPORT
// ============================================

const attendanceCard = document.querySelector(".attendance-bargraph");
if (attendanceCard) {
  attendanceCard.style.cursor = "pointer";
  attendanceCard.addEventListener("click", () => {
    loadWeeklyAttendanceReport();
  });
}

const closeWeeklyModal = document.getElementById("closeWeeklyModal");
if (closeWeeklyModal) {
  closeWeeklyModal.addEventListener("click", () => {
    document.getElementById("weeklyAttendanceModal").classList.remove("show");
  });
}

window.addEventListener("click", e => {
  if (e.target.id === "weeklyAttendanceModal") {
    document.getElementById("weeklyAttendanceModal").classList.remove("show");
  }
});

// Open leave requests modal
leaveCard.addEventListener("click", () => {
    loadLeaveRequests();
    leaveTableModal.classList.add("show");
});

// Close modal
closeLeaveTableModal.addEventListener("click", () => leaveTableModal.classList.remove("show"));
closeLeaveModal.addEventListener("click", () => leaveModal.classList.remove("show"));
window.addEventListener("click", e => {
    if (e.target === leaveTableModal) leaveTableModal.classList.remove("show");
    if (e.target === leaveModal) leaveModal.classList.remove("show");
});

// ✅ LOAD LEAVE COUNT ON PAGE LOAD
async function loadLeaveCount() {
    try {
        const res = await fetch("https://www.mither3security.com/leave-requests", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch leave requests");

        const leaves = await res.json();
        leaveCount.textContent = leaves.length;

    } catch (err) {
        console.error("Error loading leave count:", err);
        leaveCount.textContent = "0";
    }
}

// Load leave requests
async function loadLeaveRequests() {
    try {
        const res = await fetch("https://www.mither3security.com/leave-requests", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch leave requests");

        const leaves = await res.json();
        leaveCount.textContent = leaves.length;

        const tbody = document.getElementById("leaveRequestsBody");
        tbody.innerHTML = "";

        if (!leaves.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="no-data">No leave requests found</td></tr>`;
            return;
        }

        leaves.forEach(leave => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${leave.name || "N/A"}</td>
                <td>${leave.leaveType || "N/A"}</td>
                <td>${leave.status || "N/A"}</td>
                <td><button class="view-leave" data-id="${leave._id}">View</button></td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".view-leave").forEach(btn => {
            btn.addEventListener("click", () => openLeaveModal(btn.dataset.id));
        });

    } catch (err) {
        console.error(err);
        document.getElementById("leaveRequestsBody").innerHTML = `<tr><td colspan="4" class="no-data">Error loading leave requests</td></tr>`;
    }
}

// Open individual leave modal
async function openLeaveModal(leaveId) {
    try {
        const res = await fetch(`https://www.mither3security.com/leave-requests/${leaveId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch leave details");

        const leave = await res.json();

        document.getElementById("leaveName").innerText = leave.name || "N/A";
        document.getElementById("leaveType").innerText = leave.leaveType || "N/A";
        document.getElementById("leaveDate").innerText = leave.dateOfEffectivity ? new Date(leave.dateOfEffectivity).toLocaleDateString() : "N/A";
        document.getElementById("leaveDuty").innerText = leave.placeOfDuty || "N/A";
        document.getElementById("leaveAddress").innerText = leave.addressWhileOnLeave || "N/A";
        document.getElementById("leaveContact").innerText = leave.contactNumber || "N/A";
        document.getElementById("leaveReason").innerText = leave.reason || "N/A";
        document.getElementById("leaveStatus").innerText = leave.status || "N/A";

        if (role === "admin" || role === "hr") {
            approveLeaveBtn.style.display = "inline-block";
            disapproveLeaveBtn.style.display = "inline-block";
            approveLeaveBtn.onclick = () => updateLeaveStatus(leaveId, "Approved");
            disapproveLeaveBtn.onclick = () => updateLeaveStatus(leaveId, "Disapproved");
        } else {
            approveLeaveBtn.style.display = "none";
            disapproveLeaveBtn.style.display = "none";
        }

        leaveModal.classList.add("show");

    } catch (err) {
        console.error(err);
        alert("Failed to open leave details.");
    }
}

// Update leave status
async function updateLeaveStatus(leaveId, status) {
    try {
        const res = await fetch(`https://www.mither3security.com/leave-requests/${leaveId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error("Failed to update leave status");

        alert(`Leave ${status.toLowerCase()} successfully`);
        leaveModal.classList.remove("show");
        loadLeaveCount();
        loadLeaveRequests();
    } catch (err) {
        console.error(err);
        alert("Failed to update leave status");
    }
}

closeLeaveModal.addEventListener("click", () => leaveModal.classList.remove("show"));
window.addEventListener("click", e => {
    if (e.target === leaveModal) leaveModal.classList.remove("show");
});

// ============================================
// LOAD ATTENDANCE ALERTS & COMPLAINTS
// ============================================

async function loadAttendanceAlerts() {
  try {
    const notifList = document.querySelector(".notificationslist");
    notifList.innerHTML = "";

    const alerts = [];

    try {
      const attendanceRes = await fetch("https://www.mither3security.com/attendance/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (attendanceRes.ok) {
        const records = await attendanceRes.json();
        records.forEach(record => {
          const checkin = new Date(record.checkinTime);
          const checkout = record.checkoutTime ? new Date(record.checkoutTime) : null;
          const shiftStart = new Date(checkin); 
          shiftStart.setHours(7, 0, 0, 0);
          const shiftEnd = new Date(checkin); 
          shiftEnd.setHours(19, 0, 0, 0);

          if (checkin > shiftStart && (checkin - shiftStart) / 60000 > 5) {
            alerts.push({ 
              type: "attendance",
              name: record.employeeName, 
              msg: `Late Time-In at ${checkin.toLocaleTimeString()}`,
              severity: "warning"
            });
          }
          if (checkout && checkout < shiftEnd) {
            alerts.push({ 
              type: "attendance",
              name: record.employeeName, 
              msg: `Early Time-Out at ${checkout.toLocaleTimeString()}`,
              severity: "warning"
            });
          }
        });
      }
    } catch (err) {
      console.error("Error loading attendance alerts:", err);
    }

    try {
      const ticketRes = await fetch("https://www.mither3security.com/tickets", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (ticketRes.ok) {
        const tickets = await ticketRes.json();
        
        const pendingTickets = tickets.filter(t => 
          t.status === "Pending" || t.creatorRole === "client"
        );

        pendingTickets.forEach(ticket => {
          const statusLabel = ticket.creatorRole === "client" ? "Urgent" : ticket.status;
          alerts.push({
            type: "complaint",
            name: ticket.creatorName || "Unknown",
            msg: `${statusLabel} Complaint: ${ticket.subject || "No subject"}`,
            severity: ticket.creatorRole === "client" ? "urgent" : "info",
            ticketId: ticket._id
          });
        });
      }
    } catch (err) {
      console.error("Error loading complaints:", err);
    }

    if (alerts.length > 0) {
      alerts.forEach((alert, index) => {
        const div = document.createElement("div");
        div.style.padding = "0.8rem";
        div.style.borderBottom = "1px solid #e0e0e0";
        div.style.borderLeft = alert.severity === "urgent" ? "4px solid #e74c3c" : 
                                 alert.severity === "warning" ? "4px solid #f39c12" : "4px solid #3498db";
        
        let html = `<p style="margin: 0; color: var(--clr-dark); font-size: 0.85rem;"><b>${alert.name}</b> - ${alert.msg}</p>`;
        
        if (alert.type === "complaint" && alert.ticketId) {
          html += `<button class="view-alert-btn" data-id="${alert.ticketId}" style="margin-top: 0.5rem; padding: 0.4rem 0.8rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">View</button>`;
        }
        
        div.innerHTML = html;
        notifList.appendChild(div);
      });

      notifList.querySelectorAll(".view-alert-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openTicketModal(btn.dataset.id);
        });
      });

      const notifDot = document.getElementById("notifDot");
      if (notifDot) notifDot.classList.add('show');
    } else {
      notifList.innerHTML = '<p style="color: #7d8da1; text-align: center; padding: 2rem;">No new notifications</p>';
      const notifDot = document.getElementById("notifDot");
      if (notifDot) notifDot.classList.remove('show');
    }
  } catch (err) {
    console.error("Error loading notifications:", err);
    const notifList = document.querySelector(".notificationslist");
    notifList.innerHTML = '<p style="color: #7d8da1; text-align: center; padding: 2rem;">Error loading notifications</p>';
  }
}

// ============================================
// TICKET MODAL FUNCTIONS
// ============================================

async function openTicketModal(ticketId) {
  try {
    const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load ticket ${ticketId}`);
    const ticket = await res.json();

    document.getElementById("modalName").innerText = ticket.creatorName || "Unknown";
    document.getElementById("modalReportedEmployee").innerText = ticket.reportedEmployeeName || "N/A";
    document.getElementById("modalSubject").innerText = ticket.subject || "No subject";
    document.getElementById("modalSource").innerText = ticket.creatorRole === "client" ? "Client" : "Employee";
    
    const status = ticket.creatorRole === "client" ? "Urgent" : ticket.status;
    const statusClass = ticket.creatorRole === "client" ? "urgent" : ticket.status.toLowerCase();
    document.getElementById("modalStatus").innerHTML = `<span class="status ${statusClass}">${status}</span>`;
    
    document.getElementById("modalRating").innerText = ticket.rating ? ticket.rating + " Stars" : "Not Rated";
    document.getElementById("modalConcern").innerText = ticket.concern || "No concern";
    document.getElementById("modalDate").innerText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown";

    const markBtn = document.getElementById("markCompletedBtn");
    if (ticket.status === "Completed") {
      markBtn.disabled = true;
      markBtn.innerText = "Completed";
    } else {
      markBtn.disabled = false;
      markBtn.innerText = "Mark as Completed";
      markBtn.onclick = () => markCompleted(ticketId);
    }

    document.getElementById("ticketModal").classList.add('show');
  } catch (err) {
    console.error("Error loading ticket details:", err);
    alert("Failed to open ticket modal.");
  }
}

async function markCompleted(ticketId) {
  try {
    const res = await fetch(`https://www.mither3security.com/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "Completed" }),
    });
    if (!res.ok) throw new Error("Failed to update ticket status");
    alert("Ticket marked as completed!");
    document.getElementById("ticketModal").classList.remove('show');
    loadTodayComplaints();
  } catch (err) {
    console.error("Error updating ticket:", err);
    alert("Failed to mark as completed.");
  }
}

// Close modal handlers
document.getElementById("closeBtn").addEventListener("click", () => {
  document.getElementById("ticketModal").classList.remove('show');
});

window.addEventListener("click", (e) => {
  if (e.target.id === "ticketModal") {
    document.getElementById("ticketModal").classList.remove('show');
  }
});

// ============================================
// THEME TOGGLER
// ============================================

document.querySelectorAll('.theme-toggler span').forEach(span => {
  span.addEventListener('click', () => {
    document.querySelectorAll('.theme-toggler span').forEach(s => s.classList.remove('active'));
    span.classList.add('active');
  });
});

// ============================================
// INITIALIZE DASHBOARD ON PAGE LOAD
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadAttendanceRateBarGraph();  
  loadComplaintsChart();
  loadTodayComplaints();
  loadLeaveCount();
  loadAttendanceAlerts();
});