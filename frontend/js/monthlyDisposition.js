const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
if (!token || (role !== "admin")) {
    window.location.href = "dashboard.html";
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

document.addEventListener("DOMContentLoaded", async () => {
  const dateEl = document.getElementById("reportDate");
  const clientCountEl = document.getElementById("clientCount");
  const guardCountEl = document.getElementById("guardCount");
  const tbody = document.getElementById("reportBody");

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const pageInfo = document.getElementById("pageInfo");
  const downloadBtn = document.getElementById("downloadBtn");
  const editBtn = document.getElementById("editBtn");

  let currentPage = 1;
  const rowsPerPage = 10;
  let branchRows = [];

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const [branchesRes, employeesRes] = await Promise.all([
      fetch("https://www.mither3security.com/api/branches"),
      fetch("https://www.mither3security.com/employees"),
    ]);

    if (!branchesRes.ok || !employeesRes.ok)
      throw new Error("Failed to fetch data.");

    const branches = await branchesRes.json();
    const employees = await employeesRes.json();

    clientCountEl.textContent = branches.length;
    guardCountEl.textContent = employees.length;

    // Build all rows first
    let branchIndex = 1;
    branchRows = branches.map(branch => {
      const branchName = branch.branchData?.branch || "N/A";
      const guards = employees.filter(
        e => e.employeeData?.basicInformation?.branch === branchName
      );

      if (!guards.length) {
        return `
          <tr>
            <td><strong>${branchIndex++}. ${branchName}</strong></td>
            <td colspan="5" style="text-align:center;">No guards assigned</td>
          </tr>`;
      }

      // ===== BUILD GUARD NAMES WITH NESTED TABLE =====
      const guardNames = guards.map((g) => {
        const family = g.employeeData?.personalData?.familyName || "";
        const first = g.employeeData?.personalData?.firstName || "";
        const middle = g.employeeData?.personalData?.middleName || "";
        const fullName = g.employeeData?.personalData?.name || "";
        
        // Try to use name field first, then construct from parts
        if (fullName && fullName.trim()) {
          return fullName;
        }
        
        const constructed = `${family}, ${first} ${middle}`.trim();
        return constructed || "N/A";
      });
      const guardListHTML = createDetailedNestedTable(guardNames);

      // ===== BUILD EDUCATION WITH NESTED TABLE =====
      const educationData = guards.map(g => {
        const degree = g.employeeData?.educationalBackground?.[0]?.degree;
        const school = g.employeeData?.educationalBackground?.[0]?.school;
        return degree || school || "N/A";
      });
      const educationListHTML = createDetailedNestedTable(educationData);

      // ===== BUILD LICENSE WITH NESTED TABLE =====
      const licenseData = guards.map(g => {
        const license = g.employeeData?.basicInformation?.pslNo || "N/A";
        const expiry = g.employeeData?.basicInformation?.expiryDate
          ? new Date(g.employeeData.basicInformation.expiryDate).toLocaleDateString()
          : "N/A";
        return { license, expiry };
      });
      const licenseListHTML = createArrayNestedTable(licenseData);

      // ===== BUILD BADGE NO WITH NESTED TABLE =====
      const badgeData = guards.map(g =>
        g.employeeData?.basicInformation?.badgeNo || "N/A"
      );
      const badgeListHTML = createDetailedNestedTable(badgeData);

      // ===== BUILD FIREARMS WITH NESTED TABLE =====
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

      return `
        <tr>
          <td><strong>${branchIndex++}. ${branchName}</strong></td>
          <td>${guardListHTML}</td>
          <td>${educationListHTML}</td>
          <td>${licenseListHTML}</td>
          <td>${badgeListHTML}</td>
          <td>${firearmListHTML}</td>
        </tr>`;
    });

    renderPage();

  } catch (err) {
    console.error("Error loading disposition report:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:red;text-align:center;">Failed to load data</td></tr>`;
  }

  // ✅ Pagination Functions
  function renderPage() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    tbody.innerHTML = branchRows.slice(start, end).join("");
    pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(branchRows.length / rowsPerPage)}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === Math.ceil(branchRows.length / rowsPerPage);
  }

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage < Math.ceil(branchRows.length / rowsPerPage)) {
      currentPage++;
      renderPage();
    }
  });

  // ✅ Download PDF
  downloadBtn.addEventListener("click", () => {
    const element = document.getElementById("reportContent");
    const opt = {
      margin: 0.5,
      filename: `Monthly_Disposition_Report_${now.toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" }
    };
    html2pdf().from(element).set(opt).save();
  });

  // ✅ Edit Button (placeholder)
  editBtn.addEventListener("click", () => {
    alert("Edit functionality coming soon! You can link this to an edit form or modal.");
  });
});