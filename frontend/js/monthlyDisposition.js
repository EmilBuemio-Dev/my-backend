const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
if (!token || (role !== "admin")) {
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

// ===== HELPER FUNCTIONS FOR NESTED TABLES =====
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

// ===== DISPOSITION REPORT STATE =====
let allBranchRows = [];
let filteredBranchRows = [];
let currentDispositionPage = 1;
const dispositionRowsPerPage = 10;

// ===== TICKET REPORT STATE =====
let allTickets = [];
let filteredTickets = [];
let currentTicketPage = 1;
const ticketRowsPerPage = 10;

const now = new Date();
const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });

document.addEventListener("DOMContentLoaded", async () => {
  // ==== SET DATE AND MONTH ====
  document.getElementById("reportDate").textContent = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("reportMonth").textContent = currentMonth;
  document.getElementById("ticketReportDate").textContent = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("ticketReportMonth").textContent = currentMonth;

  // ==== LOAD DATA ====
  try {
    // Load disposition data
    const [branchesRes, employeesRes, ticketsRes] = await Promise.all([
      fetch("https://www.mither3security.com/api/branches"),
      fetch("https://www.mither3security.com/employees"),
      fetch("https://www.mither3security.com/tickets", {
        headers: { "Authorization": `Bearer ${token}` }
      })
    ]);

    if (!branchesRes.ok || !employeesRes.ok)
      throw new Error("Failed to fetch disposition data.");

    const branches = await branchesRes.json();
    const employees = await employeesRes.json();
    let allTickets = [];

    if (ticketsRes.ok) {
      allTickets = await ticketsRes.json();
    }

    // ===== UPDATE STATS =====
    document.getElementById("clientCount").textContent = branches.length;
    document.getElementById("guardCount").textContent = employees.length;
    document.getElementById("totalGuards").textContent = employees.length;

    // ===== CALCULATE TICKET STATS =====
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();

    const monthlyTickets = allTickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      return ticketDate.getFullYear() === currentYear && ticketDate.getMonth() === currentMonthNum;
    });

    document.getElementById("totalTickets").textContent = monthlyTickets.length;
    document.getElementById("pendingTickets").textContent = monthlyTickets.filter(t => t.status === "Pending").length;
    document.getElementById("resolvedTickets").textContent = monthlyTickets.filter(t => t.status === "Resolved").length;
    document.getElementById("monthlyTicketCount").textContent = monthlyTickets.length;

    // ===== BUILD DISPOSITION ROWS =====
    let branchIndex = 1;
    allBranchRows = branches.map(branch => {
      const branchName = branch.branchData?.branch || "N/A";
      const guards = employees.filter(
        e => e.employeeData?.basicInformation?.branch === branchName
      );

      if (!guards.length) {
        return {
          branchName,
          guardCount: 0,
          html: `<tr>
            <td><strong>${branchIndex++}. ${branchName}</strong></td>
            <td colspan="5" style="text-align:center;">No guards assigned</td>
          </tr>`
        };
      }

      const guardNames = guards.map((g) => {
        const fullName = g.employeeData?.personalData?.name || "";
        if (fullName && fullName.trim()) return fullName;
        const family = g.employeeData?.personalData?.familyName || "";
        const first = g.employeeData?.personalData?.firstName || "";
        const middle = g.employeeData?.personalData?.middleName || "";
        return `${family}, ${first} ${middle}`.trim() || "N/A";
      });
      const guardListHTML = createDetailedNestedTable(guardNames);

      const educationData = guards.map(g => {
        const degree = g.employeeData?.educationalBackground?.[0]?.degree;
        const school = g.employeeData?.educationalBackground?.[0]?.school;
        return degree || school || "N/A";
      });
      const educationListHTML = createDetailedNestedTable(educationData);

      const licenseData = guards.map(g => {
        const license = g.employeeData?.basicInformation?.pslNo || "N/A";
        const expiry = g.employeeData?.basicInformation?.expiryDate
          ? new Date(g.employeeData.basicInformation.expiryDate).toLocaleDateString()
          : "N/A";
        return { license, expiry };
      });
      const licenseListHTML = createArrayNestedTable(licenseData);

      const badgeData = guards.map(g =>
        g.employeeData?.basicInformation?.badgeNo || "N/A"
      );
      const badgeListHTML = createDetailedNestedTable(badgeData);

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

      return {
        branchName,
        guardCount: guards.length,
        html: `<tr>
          <td><strong>${branchIndex++}. ${branchName}</strong></td>
          <td>${guardListHTML}</td>
          <td>${educationListHTML}</td>
          <td>${licenseListHTML}</td>
          <td>${badgeListHTML}</td>
          <td>${firearmListHTML}</td>
        </tr>`
      };
    });

    filteredBranchRows = allBranchRows;

    // ===== BUILD TICKET ROWS =====
    const ticketsBody = document.getElementById("ticketReportBody");
    allTickets = monthlyTickets.map((ticket, idx) => ({
      ...ticket,
      index: idx + 1,
      html: `<tr>
        <td>${idx + 1}</td>
        <td>${ticket._id || "N/A"}</td>
        <td>${ticket.subject || "N/A"}</td>
        <td>${ticket.creatorName || "N/A"}</td>
        <td>${ticket.creatorRole || "N/A"}</td>
        <td>${ticket.branch || "N/A"}</td>
        <td><strong>${ticket.status || "N/A"}</strong></td>
        <td>${new Date(ticket.createdAt).toLocaleDateString() || "N/A"}</td>
      </tr>`
    }));

    filteredTickets = allTickets;

    // ===== RENDER INITIAL PAGES =====
    renderDispositionPage();
    renderTicketPage();

  } catch (err) {
    console.error("Error loading reports:", err);
    document.getElementById("reportBody").innerHTML = `<tr><td colspan="6" style="color:red;text-align:center;">Failed to load data</td></tr>`;
    document.getElementById("ticketReportBody").innerHTML = `<tr><td colspan="8" style="color:red;text-align:center;">Failed to load tickets</td></tr>`;
  }

  // ===== FILTER BY BRANCH =====
  document.getElementById("filterByBranchBtn").addEventListener("click", () => {
    const letter = document.getElementById("branchFilter").value.toUpperCase();
    if (!letter) {
      alert("Please enter a letter to filter");
      return;
    }
    filteredBranchRows = allBranchRows.filter(row => 
      row.branchName.toUpperCase().startsWith(letter)
    );
    currentDispositionPage = 1;
    renderDispositionPage();
  });

  // ===== FILTER BY GUARD COUNT =====
  document.getElementById("filterByGuardCountBtn").addEventListener("click", () => {
    const range = document.getElementById("guardCountFilter").value;
    if (!range) {
      filteredBranchRows = allBranchRows;
    } else {
      filteredBranchRows = allBranchRows.filter(row => {
        const count = row.guardCount;
        if (range === "1-5") return count >= 1 && count <= 5;
        if (range === "6-10") return count >= 6 && count <= 10;
        if (range === "11-20") return count >= 11 && count <= 20;
        if (range === "21+") return count >= 21;
        return true;
      });
    }
    currentDispositionPage = 1;
    renderDispositionPage();
  });

  // ===== RESET FILTERS =====
  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    document.getElementById("branchFilter").value = "";
    document.getElementById("guardCountFilter").value = "";
    filteredBranchRows = allBranchRows;
    currentDispositionPage = 1;
    renderDispositionPage();
  });

  // ===== DISPOSITION PAGINATION =====
  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentDispositionPage > 1) {
      currentDispositionPage--;
      renderDispositionPage();
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    const maxPages = Math.ceil(filteredBranchRows.length / dispositionRowsPerPage);
    if (currentDispositionPage < maxPages) {
      currentDispositionPage++;
      renderDispositionPage();
    }
  });

  // ===== TICKET PAGINATION =====
  document.getElementById("prevTicketPageBtn").addEventListener("click", () => {
    if (currentTicketPage > 1) {
      currentTicketPage--;
      renderTicketPage();
    }
  });

  document.getElementById("nextTicketPageBtn").addEventListener("click", () => {
    const maxPages = Math.ceil(filteredTickets.length / ticketRowsPerPage);
    if (currentTicketPage < maxPages) {
      currentTicketPage++;
      renderTicketPage();
    }
  });

  // ===== DOWNLOAD DISPOSITION PDF =====
  document.getElementById("downloadDispositionBtn").addEventListener("click", () => {
    const element = document.getElementById("dispositionContent");
    const opt = {
      margin: 0.5,
      filename: `Monthly_Disposition_Report_${now.toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
    };
    html2pdf().from(element).set(opt).save();
  });

  // ===== DOWNLOAD TICKET REPORT PDF =====
  document.getElementById("downloadTicketReportBtn").addEventListener("click", () => {
    const element = document.getElementById("ticketReportContent");
    const opt = {
      margin: 0.5,
      filename: `Monthly_Ticket_Report_${now.toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
    };
    html2pdf().from(element).set(opt).save();
  });
});

// ===== RENDER DISPOSITION PAGE =====
function renderDispositionPage() {
  const start = (currentDispositionPage - 1) * dispositionRowsPerPage;
  const end = start + dispositionRowsPerPage;
  const tbody = document.getElementById("reportBody");
  
  tbody.innerHTML = filteredBranchRows
    .slice(start, end)
    .map(row => row.html)
    .join("");
  
  const maxPages = Math.ceil(filteredBranchRows.length / dispositionRowsPerPage);
  document.getElementById("pageInfo").textContent = `Page ${currentDispositionPage} of ${maxPages}`;
  document.getElementById("prevPageBtn").disabled = currentDispositionPage === 1;
  document.getElementById("nextPageBtn").disabled = currentDispositionPage === maxPages;
}

// ===== RENDER TICKET PAGE =====
function renderTicketPage() {
  const start = (currentTicketPage - 1) * ticketRowsPerPage;
  const end = start + ticketRowsPerPage;
  const tbody = document.getElementById("ticketReportBody");
  
  tbody.innerHTML = filteredTickets
    .slice(start, end)
    .map(ticket => ticket.html)
    .join("");
  
  const maxPages = Math.ceil(filteredTickets.length / ticketRowsPerPage);
  document.getElementById("ticketPageInfo").textContent = `Page ${currentTicketPage} of ${maxPages}`;
  document.getElementById("prevTicketPageBtn").disabled = currentTicketPage === 1;
  document.getElementById("nextTicketPageBtn").disabled = currentTicketPage === maxPages;
}