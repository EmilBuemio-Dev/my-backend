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

function updateComplaintsBadge(count) {
  const badge = document.getElementById('complaintsBadge');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

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
    const res = await fetch("http://localhost:5000/employees");
    if (!res.ok) throw new Error("Failed to fetch employees");
    const employees = await res.json();

    const total = employees.length;
    const active = employees.filter(e => e.employeeData?.basicInformation?.status === "Active").length;
    const inactive = employees.filter(e => e.employeeData?.basicInformation?.status === "Inactive").length;

    document.getElementById("totalCount").textContent = total;
    document.getElementById("activeCount").textContent = active;
    document.getElementById("inactiveCount").textContent = inactive;

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactive / total) * 100) : 0;

    document.getElementById("totalPercent").textContent = "100%";
    document.getElementById("activePercent").textContent = `${activePercent}%`;
    document.getElementById("inactivePercent").textContent = `${inactivePercent}%`;

    const circleLength = 2 * Math.PI * 30;
    setTimeout(() => {
      setCircleProgress("totalCircle", 100, circleLength);
      setCircleProgress("activeCircle", activePercent, circleLength);
      setCircleProgress("inactiveCircle", inactivePercent, circleLength);
    }, 100);

  } catch (err) {
    console.error("Error loading dashboard stats:", err);
  }
}

// ============================================
// LOAD COMPLAINTS RATINGS BAR GRAPH
// ============================================

async function loadComplaintRatingsBarGraph() {
  try {
    const res = await fetch("http://localhost:5000/tickets", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch complaints");

    const tickets = await res.json();
    const ratingCounts = {1:0, 2:0, 3:0, 4:0, 5:0};
    
    tickets.forEach(t => {
      if(t.rating && ratingCounts[t.rating] !== undefined) {
        ratingCounts[t.rating]++;
      }
    });

    // Array in order: 5 stars, 4 stars, 3 stars, 2 stars, 1 star
    const ratings = [
      ratingCounts[5],
      ratingCounts[4],
      ratingCounts[3],
      ratingCounts[2],
      ratingCounts[1]
    ];

    const maxRating = Math.max(...ratings, 1); // Avoid division by zero

    setTimeout(() => {
      document.querySelectorAll('.bar').forEach((bar, index) => {
        const fillInner = bar.querySelector('.bar-fill-inner');
        const countSpan = bar.querySelector('.count');
        const width = (ratings[index] / maxRating) * 100;
        
        // Update count display
        countSpan.textContent = ratings[index];
        
        // Animate bar width
        fillInner.style.width = width + '%';
      });
    }, 300);

  } catch (err) {
    console.error("Error loading complaints rating bar graph:", err);
  }
}

// ============================================
// LOAD COMPLAINTS CHART (TRENDS)
// ============================================

async function loadComplaintsChart() {
  try {
    const res = await fetch("http://localhost:5000/tickets", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if(!res.ok) throw new Error("Failed to fetch complaints");

    const tickets = await res.json();

    // Initialize counts for each day of the week (Sun=0, Mon=1,...)
    const weekCounts = [0,0,0,0,0,0,0];

    tickets.forEach(ticket => {
      if (!ticket.createdAt) return;

      const date = new Date(ticket.createdAt);
      const day = date.getDay(); // 0=Sunday, 1=Monday ...
      weekCounts[day]++;
    });

    // Map to labels starting from Monday
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [
      weekCounts[1], // Monday
      weekCounts[2], // Tuesday
      weekCounts[3], // Wednesday
      weekCounts[4], // Thursday
      weekCounts[5], // Friday
      weekCounts[6], // Saturday
      weekCounts[0]  // Sunday
    ];

    const ctx = document.getElementById('complaintschart').getContext('2d');
    
    // Create gradient
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
    const res = await fetch("http://localhost:5000/tickets", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch complaints");

    const complaints = await res.json();
    const today = new Date().toISOString().split("T")[0];
    const todaysComplaints = complaints.filter(c => new Date(c.createdAt).toISOString().split("T")[0] === today);

    // Update badge with urgent/pending count
    const urgentCount = complaints.filter(c => c.creatorRole === "client" || c.status === "Pending").length;
    updateComplaintsBadge(urgentCount);

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

// Load leave requests
async function loadLeaveRequests() {
    try {
        const res = await fetch("http://localhost:5000/leave-requests", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch leave requests");

        const leaves = await res.json();
        leaveCount.textContent = leaves.length;

        const tbody = document.getElementById("leaveRequestsBody");
        tbody.innerHTML = "";

        if (!leaves.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No leave requests found</td></tr>`;
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
        document.getElementById("leaveRequestsBody").innerHTML = `<tr><td colspan="5" class="no-data">Error loading leave requests</td></tr>`;
    }
}

// Open individual leave modal
async function openLeaveModal(leaveId) {
    try {
        const res = await fetch(`http://localhost:5000/leave-requests/${leaveId}`, {
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

        // Show approve/disapprove only for admin/HR
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
        const res = await fetch(`http://localhost:5000/leave-requests/${leaveId}`, {
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
        loadLeaveRequests();
    } catch (err) {
        console.error(err);
        alert("Failed to update leave status");
    }
}


// Close individual leave modal
closeLeaveModal.addEventListener("click", () => leaveModal.classList.remove("show"));
window.addEventListener("click", e => {
    if (e.target === leaveModal) leaveModal.classList.remove("show");
});




// ============================================
// LOAD ATTENDANCE ALERTS (NOTIFICATIONS)
// ============================================

async function loadAttendanceAlerts() {
  try {
    const res = await fetch("http://localhost:5000/attendance/all", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch attendance");

    const records = await res.json();
    const notifList = document.querySelector(".notificationslist");
    notifList.innerHTML = "";

    const alerts = [];

    records.forEach(record => {
      const checkin = new Date(record.checkinTime);
      const checkout = record.checkoutTime ? new Date(record.checkoutTime) : null;
      const shiftStart = new Date(checkin); 
      shiftStart.setHours(7,0,0,0);
      const shiftEnd = new Date(checkin); 
      shiftEnd.setHours(19,0,0,0);

      if (checkin > shiftStart && (checkin - shiftStart)/60000 > 5) {
        alerts.push({ name: record.employeeName, msg: `Late Time-In at ${checkin.toLocaleTimeString()}` });
      }
      if (checkout && checkout < shiftEnd) {
        alerts.push({ name: record.employeeName, msg: `Early Time-Out at ${checkout.toLocaleTimeString()}` });
      }
    });

    if (alerts.length > 0) {
      alerts.forEach(a => {
        const div = document.createElement("div");
        div.style.padding = "0.8rem";
        div.style.borderBottom = "1px solid #e0e0e0";
        div.innerHTML = `
          <p style="margin: 0; color: var(--clr-dark); font-size: 0.85rem;"><b>${a.name}</b> - ${a.msg}</p>
        `;
        notifList.appendChild(div);
      });
      const notifDot = document.getElementById("notifDot");
      if (notifDot) notifDot.classList.add('show');
    } else {
      notifList.innerHTML = '<p style="color: #7d8da1; text-align: center; padding: 2rem;">No new notifications</p>';
    }
  } catch (err) {
    console.error("Error loading attendance alerts:", err);
    const notifList = document.querySelector(".notificationslist");
    notifList.innerHTML = '<p style="color: #7d8da1; text-align: center; padding: 2rem;">Error loading notifications</p>';
  }
}

// ============================================
// TICKET MODAL FUNCTIONS
// ============================================

async function openTicketModal(ticketId) {
  try {
    const res = await fetch(`http://localhost:5000/tickets/${ticketId}`, {
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
  loadComplaintRatingsBarGraph();
  loadComplaintsChart();
  loadTodayComplaints(); 
  loadAttendanceAlerts();
});