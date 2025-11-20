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
    let ticketsList = [];

    if (ticketsRes.ok) {
      ticketsList = await ticketsRes.json();
    }

    // ===== UPDATE STATS =====
    document.getElementById("clientCount").textContent = branches.length;
    document.getElementById("guardCount").textContent = employees.length;
    document.getElementById("totalGuards").textContent = employees.length;

    // ===== CALCULATE TICKET STATS =====
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();

    const monthlyTickets = ticketsList.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      return ticketDate.getFullYear() === currentYear && ticketDate.getMonth() === currentMonthNum;
    });

    document.getElementById("totalTickets").textContent = monthlyTickets.length;
    document.getElementById("pendingTickets").textContent = monthlyTickets.filter(t => t.status === "Pending").length;
    document.getElementById("resolvedTickets").textContent = monthlyTickets.filter(t => t.status === "Resolved").length;
    document.getElementById("monthlyTicketCount").textContent = monthlyTickets.length;

    // ===== BUILD DISPOSITION ROWS WITH SUB-ROWS =====
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
          html: `<tr class="branch-row">
            <td><strong>${branchIndex++}. ${branchName}</strong></td>
            <td colspan="5" style="text-align:center;">No guards assigned</td>
          </tr>`
        };
      }

      // Build sub-rows for each guard
      let subRowsHtml = '';
      guards.forEach((guard, idx) => {
        const fullName = guard.employeeData?.personalData?.name || "";
        const guardName = fullName && fullName.trim() ? fullName : 
          `${guard.employeeData?.personalData?.familyName || ""}, ${guard.employeeData?.personalData?.firstName || ""} ${guard.employeeData?.personalData?.middleName || ""}`.trim() || "N/A";
        
        const degree = guard.employeeData?.educationalBackground?.[0]?.degree;
        const school = guard.employeeData?.educationalBackground?.[0]?.school;
        const education = degree || school || "N/A";
        
        const license = guard.employeeData?.basicInformation?.pslNo || "N/A";
        const expiry = guard.employeeData?.basicInformation?.expiryDate
          ? new Date(guard.employeeData.basicInformation.expiryDate).toLocaleDateString()
          : "N/A";
        
        const badgeNo = guard.employeeData?.basicInformation?.badgeNo || "N/A";
        
        let firearms = "N/A";
        if (guard.employeeData?.firearmsIssued?.length) {
          firearms = guard.employeeData.firearmsIssued
            .map(f => `${f.kind || "N/A"} | ${f.make || "N/A"} | ${f.sn || "N/A"}`)
            .join(", ");
        }
        
        subRowsHtml += `<tr class="sub-row">
          <td style="padding-left: 2rem; font-size: 0.9rem;">${idx === 0 ? `<strong>${branchIndex}. ${branchName}</strong>` : ''}</td>
          <td>${guardName}</td>
          <td>${education}</td>
          <td>${license}<br><small style="color: #666;">${expiry}</small></td>
          <td>${badgeNo}</td>
          <td>${firearms}</td>
        </tr>`;
      });

      branchIndex++;
      return {
        branchName,
        guardCount: guards.length,
        html: subRowsHtml
      };
    });

    filteredBranchRows = allBranchRows;

    // ===== BUILD TICKET ROWS =====
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
    const clonedElement = element.cloneNode(true);
    
    // Show all rows in PDF
    const tbody = clonedElement.querySelector("#reportBody");
    tbody.innerHTML = filteredBranchRows.map(row => row.html).join("");
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Monthly_Disposition_Report_${now.toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };
    
    html2pdf().set(opt).from(clonedElement).save();
  });

  // ===== DOWNLOAD TICKET REPORT PDF =====
  document.getElementById("downloadTicketReportBtn").addEventListener("click", () => {
    const element = document.getElementById("ticketReportContent");
    const clonedElement = element.cloneNode(true);
    
    // Show all tickets in PDF
    const tbody = clonedElement.querySelector("#ticketReportBody");
    tbody.innerHTML = filteredTickets.map(ticket => ticket.html).join("");
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Monthly_Ticket_Report_${now.toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };
    
    html2pdf().set(opt).from(clonedElement).save();
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