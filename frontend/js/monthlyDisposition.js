const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
if (!token || role !== "admin") {
  window.location.href = "dashboard.html";
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "loginSection.html";
  });
}

// Global variables
let allBranches = [];
let allEmployees = [];
let allTickets = [];
let dispositionTable = null;

// Helper functions for nested tables
function createDetailedNestedTable(dataArray) {
  if (!dataArray || dataArray.length === 0) return '<div>N/A</div>';
  
  let html = '<table class="nested-table"><tbody>';
  dataArray.forEach((item) => {
    html += '<tr><td>';
    if (typeof item === 'object') {
      html += Object.values(item).join(' | ');
    } else {
      html += item;
    }
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  return html;
}

function createArrayNestedTable(items) {
  if (!items || items.length === 0) return '<div>N/A</div>';
  
  let html = '<table class="nested-table"><tbody>';
  items.forEach((item) => {
    html += '<tr>';
    if (typeof item === 'object') {
      Object.values(item).forEach(value => {
        html += `<td>${value || 'N/A'}</td>`;
      });
    } else {
      html += `<td>${item}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

document.addEventListener("DOMContentLoaded", async () => {
  const dateEl = document.getElementById("reportDate");
  const now = new Date();
  
  dateEl.textContent = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Initialize
  await loadAllData();
  setupEventListeners();
});

async function loadAllData() {
  try {
    // Fetch branches, employees, and tickets
    const [branchesRes, employeesRes, ticketsRes] = await Promise.all([
      fetch("https://www.mither3security.com/api/branches"),
      fetch("https://www.mither3security.com/employees"),
      fetch("https://www.mither3security.com/tickets", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    if (!branchesRes.ok || !employeesRes.ok) {
      throw new Error("Failed to fetch data.");
    }

    allBranches = await branchesRes.json();
    allEmployees = await employeesRes.json();
    allTickets = ticketsRes.ok ? await ticketsRes.json() : [];

    // Update stats
    updateStats();
    
    // Load disposition report
    loadDispositionReport();
    
    // Load tickets report
    loadTicketsReport();

  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById("reportBody").innerHTML = 
      `<tr><td colspan="6" style="color:red;text-align:center;">Failed to load data</td></tr>`;
  }
}

function updateStats() {
  // Update counts
  document.getElementById("clientCount").textContent = allBranches.length;
  document.getElementById("guardCount").textContent = allEmployees.length;

  // Filter tickets from current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyTickets = allTickets.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    return ticketDate.getMonth() === currentMonth && 
           ticketDate.getFullYear() === currentYear;
  });

  const pendingTickets = monthlyTickets.filter(t => t.status === "Pending");
  const resolvedTickets = monthlyTickets.filter(t => 
    t.status === "Resolved" || t.status === "Closed"
  );

  document.getElementById("totalTickets").textContent = monthlyTickets.length;
  document.getElementById("pendingTickets").textContent = pendingTickets.length;
  document.getElementById("resolvedTickets").textContent = resolvedTickets.length;
}

function loadDispositionReport() {
  const tbody = document.getElementById("reportBody");
  const branchFilter = document.getElementById("branchFilter");
  
  // Build table data
  const tableData = [];
  const branchNames = new Set();

  allBranches.forEach(branch => {
    const branchName = branch.branchData?.branch || "N/A";
    branchNames.add(branchName);
    
    const guards = allEmployees.filter(
      e => e.employeeData?.basicInformation?.branch === branchName
    );

    const guardsCount = guards.length;

    if (guardsCount === 0) {
      tableData.push({
        branch: branchName,
        guardsCount: 0,
        guards: "No guards assigned",
        education: "N/A",
        license: "N/A",
        badge: "N/A",
        firearms: "N/A"
      });
    } else {
      // Build guard names
      const guardNames = guards.map((g) => {
        const fullName = g.employeeData?.personalData?.name || "";
        if (fullName && fullName.trim()) {
          return fullName;
        }
        const family = g.employeeData?.personalData?.familyName || "";
        const first = g.employeeData?.personalData?.firstName || "";
        const middle = g.employeeData?.personalData?.middleName || "";
        return `${family}, ${first} ${middle}`.trim() || "N/A";
      });
      const guardListHTML = createDetailedNestedTable(guardNames);

      // Build education
      const educationData = guards.map(g => {
        const degree = g.employeeData?.educationalBackground?.[0]?.degree;
        const school = g.employeeData?.educationalBackground?.[0]?.school;
        return degree || school || "N/A";
      });
      const educationListHTML = createDetailedNestedTable(educationData);

      // Build license
      const licenseData = guards.map(g => {
        const license = g.employeeData?.basicInformation?.pslNo || "N/A";
        const expiry = g.employeeData?.basicInformation?.expiryDate
          ? new Date(g.employeeData.basicInformation.expiryDate).toLocaleDateString()
          : "N/A";
        return { license, expiry };
      });
      const licenseListHTML = createArrayNestedTable(licenseData);

      // Build badge
      const badgeData = guards.map(g =>
        g.employeeData?.basicInformation?.badgeNo || "N/A"
      );
      const badgeListHTML = createDetailedNestedTable(badgeData);

      // Build firearms
      const firearmsList = guards.map(g => {
        if (g.employeeData?.firearmsIssued?.length) {
          return g.employeeData.firearmsIssued.map(f => ({
            kind: f.kind || "N/A",
            make: f.make || "N/A",
            sn: f.sn || "N/A"
          }));
        }
        return [{ kind: "N/A", make: "N/A", sn: "N/A" }];
      }).flat();
      const firearmListHTML = createArrayNestedTable(firearmsList);

      tableData.push({
        branch: branchName,
        guardsCount: guardsCount,
        guards: guardListHTML,
        education: educationListHTML,
        license: licenseListHTML,
        badge: badgeListHTML,
        firearms: firearmListHTML
      });
    }
  });

  // Populate branch filter
  branchFilter.innerHTML = '<option value="">All Branches</option>';
  Array.from(branchNames).sort().forEach(name => {
    branchFilter.innerHTML += `<option value="${name}">${name}</option>`;
  });

  // Initialize DataTable
  if (dispositionTable) {
    dispositionTable.destroy();
  }

  dispositionTable = $('#dispositionTable').DataTable({
    data: tableData,
    columns: [
      { data: 'branch' },
      { data: 'guards' },
      { data: 'education' },
      { data: 'license' },
      { data: 'badge' },
      { data: 'firearms' }
    ],
    responsive: true,
    pageLength: 10,
    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
    order: [[0, 'asc']],
    language: {
      search: "Search:",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ entries",
      infoEmpty: "No entries available",
      infoFiltered: "(filtered from _MAX_ total entries)",
      paginate: {
        first: "First",
        last: "Last",
        next: "Next",
        previous: "Previous"
      }
    }
  });

  // Custom filters
  $('#branchFilter').on('change', function() {
    dispositionTable.column(0).search(this.value).draw();
  });

  $('#guardsFilter').on('change', function() {
    const value = this.value;
    dispositionTable.rows().every(function() {
      const data = this.data();
      const count = data.guardsCount;
      let show = true;

      if (value === "0") {
        show = count === 0;
      } else if (value === "1-5") {
        show = count >= 1 && count <= 5;
      } else if (value === "6-10") {
        show = count >= 6 && count <= 10;
      } else if (value === "11+") {
        show = count >= 11;
      }

      if (show) {
        $(this.node()).show();
      } else {
        $(this.node()).hide();
      }
    });
  });

  $('#searchFilter').on('keyup', function() {
    dispositionTable.search(this.value).draw();
  });
}

function loadTicketsReport() {
  const ticketsGrid = document.getElementById("ticketsGrid");
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter tickets from current month
  let monthlyTickets = allTickets.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    return ticketDate.getMonth() === currentMonth && 
           ticketDate.getFullYear() === currentYear;
  });

  if (monthlyTickets.length === 0) {
    ticketsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--clr-info-dark);">
        No tickets submitted this month
      </div>`;
    return;
  }

  // Sort by date (newest first)
  monthlyTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  renderTickets(monthlyTickets);

  // Setup filters
  document.getElementById("ticketStatusFilter").addEventListener("change", filterTickets);
  document.getElementById("ticketSourceFilter").addEventListener("change", filterTickets);
}

function renderTickets(tickets) {
  const ticketsGrid = document.getElementById("ticketsGrid");
  
  if (tickets.length === 0) {
    ticketsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--clr-info-dark);">
        No tickets match the selected filters
      </div>`;
    return;
  }

  ticketsGrid.innerHTML = tickets.map(ticket => {
    const date = new Date(ticket.createdAt).toLocaleDateString();
    const statusClass = ticket.status.toLowerCase().replace(" ", "-");
    
    return `
      <div class="ticket-card ${statusClass}">
        <div class="ticket-header">
          <div class="ticket-id">#${ticket._id.slice(-6).toUpperCase()}</div>
          <div class="ticket-status ${statusClass}">${ticket.status}</div>
        </div>
        <div class="ticket-subject">${ticket.subject}</div>
        <div class="ticket-concern">${ticket.concern}</div>
        <div class="ticket-meta">
          <div class="ticket-meta-item">
            <span class="material-symbols-outlined">person</span>
            <span>${ticket.creatorName} (${ticket.source})</span>
          </div>
          <div class="ticket-meta-item">
            <span class="material-symbols-outlined">location_on</span>
            <span>${ticket.branch || "N/A"}</span>
          </div>
          <div class="ticket-meta-item">
            <span class="material-symbols-outlined">calendar_today</span>
            <span>${date}</span>
          </div>
          ${ticket.reportedEmployeeName ? `
          <div class="ticket-meta-item">
            <span class="material-symbols-outlined">flag</span>
            <span>Reported: ${ticket.reportedEmployeeName}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterTickets() {
  const statusFilter = document.getElementById("ticketStatusFilter").value;
  const sourceFilter = document.getElementById("ticketSourceFilter").value;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let filtered = allTickets.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    const isCurrentMonth = ticketDate.getMonth() === currentMonth && 
                           ticketDate.getFullYear() === currentYear;
    
    if (!isCurrentMonth) return false;
    
    if (statusFilter && ticket.status !== statusFilter) return false;
    if (sourceFilter && ticket.source !== sourceFilter) return false;
    
    return true;
  });

  renderTickets(filtered);
}

function setupEventListeners() {
  // Stat cards navigation
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', function() {
      const reportType = this.dataset.report;
      
      // Update active card
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      
      // Show relevant report
      document.querySelectorAll('.report-section').forEach(section => {
        section.classList.remove('active');
      });
      
      if (reportType === 'disposition') {
        document.getElementById('dispositionReport').classList.add('active');
      } else {
        document.getElementById('ticketsReport').classList.add('active');
      }
    });
  });

  // Download PDF
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const element = document.getElementById("dispositionReport");
    const now = new Date();
    
    // Hide filters and actions before printing
    const filters = element.querySelector('.filters-container');
    const actions = element.querySelector('.report-actions');
    filters.style.display = 'none';
    actions.style.display = 'none';
    
    const opt = {
      margin: 0.5,
      filename: `Monthly_Disposition_Report_${now.toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
    };
    
    html2pdf().from(element).set(opt).save().then(() => {
      filters.style.display = '';
      actions.style.display = '';
    });
  });

  // Export tickets
  document.getElementById("exportTicketsBtn").addEventListener("click", () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTickets = allTickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      return ticketDate.getMonth() === currentMonth && 
             ticketDate.getFullYear() === currentYear;
    });

    // Create CSV
    const headers = ["ID", "Subject", "Status", "Creator", "Source", "Branch", "Date", "Concern"];
    const rows = monthlyTickets.map(t => [
      t._id,
      t.subject,
      t.status,
      t.creatorName,
      t.source,
      t.branch || "N/A",
      new Date(t.createdAt).toLocaleDateString(),
      t.concern.replace(/,/g, ";")
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Monthly_Tickets_Report_${now.toLocaleDateString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  });
}