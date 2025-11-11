    document.addEventListener("DOMContentLoaded", async () => {
      const editBtn = document.getElementById("editBtn");
      const compareBtn = document.getElementById("compareBtn");
      const urlParams = new URLSearchParams(window.location.search);
      const employeeId = urlParams.get("id");
      let isEditing = false;
      let employeeDataCache = {}; // store fetched data
      let fileInputs = {}; // store selected files
      

      async function fetchEmployeeData() {
        try {
          if (!employeeId) return alert("No employee ID found in the URL.");
          const res = await fetch(`http://localhost:5000/employees/${employeeId}`);
          if (!res.ok) throw new Error("Failed to fetch employee data");
          const emp = await res.json();
          employeeDataCache = emp;
          populateProfile(emp);
        } catch (error) {
          console.error("Error fetching employee:", error);
          alert("Error loading employee data. Check console for details.");
        }
      }

      function populateProfile(emp) {
        const employeeData = emp.employeeData || {};
        const basic = employeeData.basicInformation || {};
        const personal = employeeData.personalData || {};
        const education = employeeData.educationalBackground || [];
        const creds = employeeData.credentials || {};

        const photoElement = document.getElementById("employeePhoto");
        if (photoElement) {
          photoElement.src = creds.profileImage
            ? `http://localhost:5000${creds.profileImage}`
            : "../../image/profile.png";
        }

        const setText = (id, value, isDate = false) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (isDate && value) {
            const d = new Date(value);
            el.textContent = isNaN(d) ? "" : d.toLocaleDateString();
          } else {
            el.textContent = value ?? "";
          }
        };

        // Basic Info
        // ===== Basic Information =====
    // ===== Basic Information =====
    const basicKeyMap = {
      pslNo: "pslNo",
      sssNo: "sssNo",
      tinNo: "tinNo",
      cellNo: "celNo", // model: celNo → HTML: cellNo
      shift: "shift",
      status: "status",
      expiryDate: "expiryDate",
      badgeNo: "badgeNo",
      branch: "branch",
      salary: "salary"
    };

    Object.keys(basicKeyMap).forEach(f => {
      const modelKey = basicKeyMap[f];
      setText(f, basic[modelKey], f === "expiryDate");
    });


    // ===== Personal Information =====
    const personalKeyMap = {
      fullName: "name",
      email: "email",
      dob: "dateOfBirth",
      presentAddress: "presentAddress",
      birthPlace: "placeOfBirth",
      previousAddress: "prevAddress",
      citizenship: "citizenship",
      weight: "weight",
      language: "languageSpoken",
      age: "age",
      height: "height",
      religion: "religion",
      civilStatus: "civilStatus",
      hairColor: "colorOfHair",
      eyeColor: "colorOfEyes"
    };

    Object.keys(personalKeyMap).forEach(f => {
      const modelKey = personalKeyMap[f];
      setText(f, personal[modelKey]);
    });



        // Education
        const tbody = document.querySelector("#educationTable tbody");
        if (tbody) {
          tbody.innerHTML = "";
          if (!education.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No education records found</td></tr>`;
          } else {
            education.forEach(edu => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td>${edu.school || ""}</td>
                <td>${edu.inclusiveDate || ""}</td>
                <td>${edu.degree || ""}</td>
                <td>${edu.dateGraduated || ""}</td>
              `;
              tbody.appendChild(tr);
            });
          }
        }

        // Credentials
        const credFields = [
          "barangayClearance","policeClearance","diClearance","nbiClearance",
          "personalHistory","residenceHistory","maritalStatus","physicalData",
          "educationData","characterReference","employmentHistory",
          "neighborhoodInvestigation","militaryRecord"
        ];

        credFields.forEach(f => {
          const span = document.getElementById(f);
          if (!span) return;
          const filePath = creds[f];
          const cleanedPath = filePath ? filePath.split("/").map(s => encodeURIComponent(s)).join("/") : null;
          const fileUrl = cleanedPath ? `http://localhost:5000/${cleanedPath}` : null;

          span.innerHTML = "";
          if (fileUrl) {
            const viewBtn = document.createElement("button");
            viewBtn.className = "view-btn";
            viewBtn.textContent = "View";
            viewBtn.onclick = () => window.open(fileUrl, "_blank");
            span.appendChild(viewBtn);
          } else {
            span.textContent = "No file";
          }

          if (isEditing) {
            const input = document.createElement("input");
            input.type = "file";
            input.style.marginLeft = "10px";
            input.onchange = e => { fileInputs[f] = e.target.files[0]; };
            span.appendChild(input);
          }
        });
      }

      async function saveEmployeeData() {
        const basicFields = ["pslNo","sssNo","tinNo","celNo","shift","expiryDate","badgeNo","branch","salary"];
        const personalFields = ["fullName","email","dob","presentAddress","birthPlace","previousAddress","citizenship","weight","language","age","height","religion","civilStatus","hairColor","eyeColor"];
        const credFields = [
          "barangayClearance","policeClearance","diClearance","nbiClearance",
          "personalHistory","residenceHistory","maritalStatus","physicalData",
          "educationData","characterReference","employmentHistory",
          "neighborhoodInvestigation","militaryRecord"
        ];

        const updated = { employeeData: {} };
        // Basic
        const basicOld = employeeDataCache.employeeData?.basicInformation || {};
        const basicUpdated = {};
        basicFields.forEach(f => {
          const el = document.getElementById(f);
          const val = el?.getAttribute("contenteditable") === "true" ? el.textContent.trim() : null;
          if (val !== null && val !== basicOld[f]) basicUpdated[f] = val;
        });
        if (Object.keys(basicUpdated).length) updated.employeeData.basicInformation = basicUpdated;

        // Personal
        const personalOld = employeeDataCache.employeeData?.personalData || {};
        const personalUpdated = {};
        personalFields.forEach(f => {
          const el = document.getElementById(f);
          const val = el?.getAttribute("contenteditable") === "true" ? el.textContent.trim() : null;
          const keyMap = {
            fullName: "name",
            dob: "dateOfBirth",
            previousAddress: "prevAddress",
            hairColor: "colorOfHair",
            eyeColor: "colorOfEyes",
            language: "languageSpoken"
          };
          const key = keyMap[f] || f;
          if (val !== null && val !== personalOld[key]) personalUpdated[key] = val;
        });
        if (Object.keys(personalUpdated).length) updated.employeeData.personalData = personalUpdated;

        // Credentials + files
        const formData = new FormData();
        formData.append("updatedData", JSON.stringify(updated));
        credFields.forEach(f => {
          if (fileInputs[f]) formData.append(f, fileInputs[f]);
        });

        try {
          const res = await fetch(`http://localhost:5000/employees/${employeeId}`, {
            method: "PATCH",
            body: formData
          });
          if (!res.ok) throw new Error("Failed to save employee data");
          const saved = await res.json();
          alert("Employee data saved successfully!");
          employeeDataCache = saved;
          fileInputs = {};
          populateProfile(saved);
        } catch (err) {
          console.error(err);
          alert("Error saving data. Check console for details.");
        }
      }

      editBtn.addEventListener("click", async () => {
        isEditing = !isEditing;
        document.querySelectorAll("[contenteditable]").forEach(f => {
          f.setAttribute("contenteditable", isEditing);
          f.style.backgroundColor = isEditing ? "#f0f8ff" : "transparent";
        });
        populateProfile(employeeDataCache);
        if (!isEditing) {
          await saveEmployeeData();
          editBtn.textContent = "EDIT";
        } else {
          editBtn.textContent = "SAVE";
        }
      });

      compareBtn.addEventListener("click", async () => {
      try {
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.id = "compareModal";
        modal.innerHTML = `
          <div class="modal-content" style="max-width:1000px;">
            <span id="closeCompareModal" class="close">&times;</span>
            <h3>Select Employee to Compare</h3>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Badge No.</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="compareTableBody">
                  <tr><td colspan="5" style="text-align:center;">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = "flex";

        document.getElementById("closeCompareModal").onclick = () => {
      if (modal && modal.parentNode) modal.remove();
    };


        // Fetch all employees
        const res = await fetch("http://localhost:5000/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const employees = await res.json();

        const tbody = document.getElementById("compareTableBody");
        tbody.innerHTML = "";

        employees.forEach(emp => {
          const profileImg = emp.employeeData?.credentials?.profileImage
            ? `http://localhost:5000/${emp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
            : "../../image/profile.png";
          const name = emp.employeeData?.personalData?.name || "N/A";
          const badgeNo = emp.employeeData?.basicInformation?.badgeNo || "N/A";
          const status = emp.employeeData?.basicInformation?.status || "Inactive";

          // skip same employee (current)
          if (emp._id === employeeId) return;

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><img src="${profileImg}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
            <td>${name}</td>
            <td><span class="status ${status.toLowerCase()}">${status}</span></td>
            <td>${badgeNo}</td>
            <td><button class="compare-action" data-id="${emp._id}">Compare</button></td>
          `;
          tbody.appendChild(tr);
        });

        // Add event for compare button
        document.querySelectorAll(".compare-action").forEach(btn => {
          btn.addEventListener("click", async () => {
            const secondId = btn.dataset.id;
            modal.remove(); // close modal
            await openCompareView(employeeId, secondId);
          });
        });

      } catch (err) {
        console.error("Error loading compare list:", err);
        alert("Failed to open compare modal.");
      }
    });

    // ===== Open side-by-side compare view =====
    async function openCompareView(firstId, secondId) {
      try {
        const [firstRes, secondRes, reqRes] = await Promise.all([
          fetch(`http://localhost:5000/employees/${firstId}`),
          fetch(`http://localhost:5000/employees/${secondId}`),
          fetch("http://localhost:5000/api/requirements")
        ]);

        if (!firstRes.ok || !secondRes.ok || !reqRes.ok)
          throw new Error("Failed to fetch comparison or requirements data");

        const [firstEmp, secondEmp, requirements] = await Promise.all([
          firstRes.json(),
          secondRes.json(),
          reqRes.json()
        ]);

        const compareContainer = document.createElement("div");
        compareContainer.className = "compare-view";
        compareContainer.innerHTML = `
          <div class="compare-header">
            <h3>Compare Employees</h3>
            <button id="closeCompareView" class="close-btn">×</button>
          </div>

          <div class="compare-content">

            <!-- First Employee -->
            <div class="compare-column">
              <div class="compare-top">
                <h4>${firstEmp.employeeData?.personalData?.name || "N/A"}</h4>
                <select id="reqSelect" class="req-select">
                  <option value="">-- Select Requirement --</option>
                  ${requirements.map(r => `<option value="${r._id}" data-height="${r.height}" data-weight="${r.weight}">
                    ${r.branch} (${r.clientName})
                  </option>`).join("")}
                </select>
              </div>

              <img src="${
                firstEmp.employeeData?.credentials?.profileImage
                  ? `http://localhost:5000/${firstEmp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
                  : "../../image/profile.png"
              }" class="compare-photo">

              <p><strong>Branch:</strong> ${firstEmp.employeeData?.basicInformation?.branch || "N/A"}</p>
              <p><strong>Shift:</strong> ${firstEmp.employeeData?.basicInformation?.shift || "N/A"}</p>
              <p><strong>Badge No.:</strong> ${firstEmp.employeeData?.basicInformation?.badgeNo || "N/A"}</p>
              <p><strong>Status:</strong> ${firstEmp.employeeData?.basicInformation?.status || "N/A"}</p>
              <p><strong>Salary:</strong> ${firstEmp.employeeData?.basicInformation?.salary || "N/A"}</p>

              <p><strong>Height:</strong> 
                <span id="firstHeight">${firstEmp.employeeData?.personalData?.height || "N/A"}</span>
              </p>
              <p><strong>Weight:</strong> 
                <span id="firstWeight">${firstEmp.employeeData?.personalData?.weight || "N/A"}</span>
              </p>
              <p><strong>Address:</strong> ${firstEmp.employeeData?.personalData?.presentAddress || "N/A"}</p>

              <h4 style="margin-top: 1.5rem;">Educational Background</h4>
              <table class="compare-table">
                <thead>
                  <tr><th>School</th><th>Inclusive Date</th><th>Degree</th><th>Date Graduated</th></tr>
                </thead>
                <tbody>
                  ${(firstEmp.employeeData?.educationalBackground || [])
                    .map(edu => `
                      <tr>
                        <td>${edu.school || "N/A"}</td>
                        <td>${edu.inclusiveDate || "N/A"}</td>
                        <td>${edu.degree || "N/A"}</td>
                        <td>${edu.dateGraduated || "N/A"}</td>
                      </tr>
                    `)
                    .join("") || `<tr><td colspan="4">No data</td></tr>`}
                </tbody>
              </table>
            </div>

            <!-- Second Employee -->
            <div class="compare-column">
              <h4>${secondEmp.employeeData?.personalData?.name || "N/A"}</h4>
              <img src="${
                secondEmp.employeeData?.credentials?.profileImage
                  ? `http://localhost:5000/${secondEmp.employeeData.credentials.profileImage.replace(/^\/?/, "")}`
                  : "../../image/profile.png"
              }" class="compare-photo">

              <p><strong>Branch:</strong> ${secondEmp.employeeData?.basicInformation?.branch || "N/A"}</p>
              <p><strong>Shift:</strong> ${secondEmp.employeeData?.basicInformation?.shift || "N/A"}</p>
              <p><strong>Badge No.:</strong> ${secondEmp.employeeData?.basicInformation?.badgeNo || "N/A"}</p>
              <p><strong>Status:</strong> ${secondEmp.employeeData?.basicInformation?.status || "N/A"}</p>
              <p><strong>Salary:</strong> ${secondEmp.employeeData?.basicInformation?.salary || "N/A"}</p>

              <p><strong>Height:</strong> 
                <span id="secondHeight">${secondEmp.employeeData?.personalData?.height || "N/A"}</span>
              </p>
              <p><strong>Weight:</strong> 
                <span id="secondWeight">${secondEmp.employeeData?.personalData?.weight || "N/A"}</span>
              </p>
              <p><strong>Address:</strong> ${secondEmp.employeeData?.personalData?.presentAddress || "N/A"}</p>

              <h4 style="margin-top: 1.5rem;">Educational Background</h4>
              <table class="compare-table">
                <thead>
                  <tr><th>School</th><th>Inclusive Date</th><th>Degree</th><th>Date Graduated</th></tr>
                </thead>
                <tbody>
                  ${(secondEmp.employeeData?.educationalBackground || [])
                    .map(edu => `
                      <tr>
                        <td>${edu.school || "N/A"}</td>
                        <td>${edu.inclusiveDate || "N/A"}</td>
                        <td>${edu.degree || "N/A"}</td>
                        <td>${edu.dateGraduated || "N/A"}</td>
                      </tr>
                    `)
                    .join("") || `<tr><td colspan="4">No data</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;

        document.body.appendChild(compareContainer);

        // ===== Close Button =====
        document.getElementById("closeCompareView").onclick = () => {
      if (compareContainer && compareContainer.parentNode) compareContainer.remove();
    };


        // ===== Requirement Selection Evaluation =====
        const reqSelect = compareContainer.querySelector("#reqSelect");
        const firstHeightEl = compareContainer.querySelector("#firstHeight");
        const firstWeightEl = compareContainer.querySelector("#firstWeight");
        const secondHeightEl = compareContainer.querySelector("#secondHeight");
        const secondWeightEl = compareContainer.querySelector("#secondWeight");

        reqSelect.addEventListener("change", e => {
          const selectedOption = e.target.selectedOptions[0];
          const reqHeight = parseFloat(selectedOption.dataset.height);
          const reqWeight = parseFloat(selectedOption.dataset.weight);

          const firstHeight = parseFloat(firstHeightEl.textContent) || 0;
          const firstWeight = parseFloat(firstWeightEl.textContent) || 0;
          const secondHeight = parseFloat(secondHeightEl.textContent) || 0;
          const secondWeight = parseFloat(secondWeightEl.textContent) || 0;

          // Evaluate both employees
          firstHeightEl.style.color = firstHeight >= reqHeight ? "green" : "red";
    firstHeightEl.style.fontWeight = "bold";

    firstWeightEl.style.color = firstWeight >= reqWeight ? "green" : "red";
    firstWeightEl.style.fontWeight = "bold";

    secondHeightEl.style.color = secondHeight >= reqHeight ? "green" : "red";
    secondHeightEl.style.fontWeight = "bold";

    secondWeightEl.style.color = secondWeight >= reqWeight ? "green" : "red";
    secondWeightEl.style.fontWeight = "bold";

        });

      } catch (err) {
        console.error("Error comparing employees:", err);
        alert("Failed to compare employees.");
      }
    }

    // ===== Tab Switching Logic =====
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        // Remove 'active' class from all tabs
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

        // Hide all tab content
        document.querySelectorAll(".tab-content").forEach(content => content.style.display = "none");

        // Activate the clicked tab
        tab.classList.add("active");

        // Show the target content
        const targetId = tab.getAttribute("data-target");
        document.getElementById(targetId).style.display = "block";
      });
    });

    // ================= ATTENDANCE SECTION =================
    const attendanceTableBody = document.querySelector("#attendanceTable tbody");
    const monthlyTableBody = document.querySelector("#monthlyAttendanceTable tbody");
    const attendancePercentage = document.getElementById("attendancePercentage");
    const attendanceChartCanvas = document.getElementById("attendanceChart");
    const monthlyReportModal = document.getElementById("monthlyReportModal");
    const closeMonthlyModal = document.getElementById("closeMonthlyModal");
    let attendanceChart;

    // ===== Load Weekly Attendance =====
    async function loadWeeklyAttendance() {
  try {
    if (!employeeId) throw new Error("Employee ID not found");

    const res = await fetch(`http://localhost:5000/attendance/${employeeId}/weekly`);
    if (!res.ok) throw new Error("Failed to fetch weekly attendance");

    const data = await res.json();
    attendanceTableBody.innerHTML = "";

    if (!data.length) {
      attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>`;
      return;
    }

        data.forEach(record => {
          const row = document.createElement("tr");
          const date = new Date(record.checkinTime || record.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const shift = record.shift || "-";
          const checkin = record.checkinTime ? new Date(record.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
          const checkout = record.checkoutTime ? new Date(record.checkoutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
          const status = record.status || "Absent";
          const statusClass =
            status.includes("Absent") ? "absent" :
            status.toLowerCase().includes("late") ? "late" : "ontime";

          row.innerHTML = `
            <td>${date}</td>
            <td>${shift}</td>
            <td>${checkin}</td>
            <td>${checkout}</td>
            <td><span class="status-tag ${statusClass}">${status}</span></td>
          `;
          attendanceTableBody.appendChild(row);
        });

        updateAttendanceChart(data);
      } catch (err) {
        console.error("Error loading weekly attendance:", err);
        attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Failed to load attendance</td></tr>`;
      }
    }

    // ===== Load Monthly Attendance =====
  // Generate table headers dynamically
  function generateMonthlyTableHeader() {
    const thead = document.querySelector("#monthlyAttendanceTable thead");
    thead.innerHTML = `
      <tr>
        <th>Branch</th>
        <th>Period Covered</th>
        <th>Guard Name</th>
        ${Array.from({ length: 16 }, (_, i) => `<th>Day ${i + 1}</th>`).join("")}
        <th>Total Hours</th>
        <th>Total Days</th>
      </tr>
    `;
  }

  // Load monthly attendance and fill table
async function loadMonthlyAttendance() {
  try {
    if (!employeeId) throw new Error("Employee ID not found");

    const res = await fetch(`http://localhost:5000/attendance/${employeeId}/monthly-summary`);
    if (!res.ok) throw new Error("Failed to fetch monthly summary");

    const data = await res.json();
    const tbody = document.querySelector("#monthlyAttendanceTable tbody");
    tbody.innerHTML = "";

    const records = data.records || data;
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;">No records found.</td></tr>`;
      return;
    }

    const branch = employeeDataCache.employeeData?.basicInformation?.branch || "N/A";
    const employeeName = employeeDataCache.employeeData?.personalData?.name || "N/A";

    const recordsPerRow = 16; // 16-day block
    const totalRows = 24; // fixed total rows

    for (let row = 0; row < totalRows; row++) {
      const startIndex = row * recordsPerRow;
      const rowRecords = records.slice(startIndex, startIndex + recordsPerRow);

      let firstRecordDate;
      if (rowRecords.length > 0) {
        firstRecordDate = new Date(rowRecords[0].checkinTime || rowRecords[0].createdAt);
      } else {
        // if no more records, just use today minus offset
        firstRecordDate = new Date();
        firstRecordDate.setDate(firstRecordDate.getDate() - (recordsPerRow * (totalRows - row - 1)));
      }

      // Build day cells
      const daysArray = rowRecords.map(record => {
        const status = record.status?.toLowerCase() || "absent";
        switch (status) {
          case "on-time": return "✅";
          case "late": return "⚠️";
          case "on-leave": return "🏖️";
          case "absent": return "❌";
          default: return "❌";
        }
      });

      // Fill remaining cells if less than 16
      while (daysArray.length < recordsPerRow) daysArray.push("");

      // Period Covered
      const periodStartStr = firstRecordDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const periodEndDate = new Date(firstRecordDate);
      periodEndDate.setDate(firstRecordDate.getDate() + recordsPerRow - 1);
      const periodEndStr = periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const totalDays = daysArray.filter(d => d !== "❌" && d !== "").length;
      const totalHours = totalDays * 12;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${branch}</td>
        <td>${periodStartStr} – ${periodEndStr}</td>
        <td>${employeeName}</td>
        ${daysArray.map(d => `<td class="status-emoji">${d}</td>`).join("")}
        <td>${totalHours}</td>
        <td>${totalDays}</td>
      `;
      tbody.appendChild(tr);
    }

  } catch (err) {
    console.error("Error loading monthly attendance:", err);
    const tbody = document.querySelector("#monthlyAttendanceTable tbody");
    tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;color:red;">Failed to load monthly data</td></tr>`;
  }
}


  // Initialize modal & table
  generateMonthlyTableHeader();

  attendanceChartCanvas.addEventListener("click", () => {
    monthlyReportModal.style.display = "flex";
    loadMonthlyAttendance();
  });

  closeMonthlyModal.addEventListener("click", () => monthlyReportModal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === monthlyReportModal) monthlyReportModal.style.display = "none";
  });


function downloadTableAsCSV(tableId, filename = "monthly_attendance.csv") {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csvContent = "";

  // Headers
  const headers = table.querySelectorAll("thead tr th");
  const headerRow = Array.from(headers).map(th => `"${th.innerText}"`).join(",");
  csvContent += headerRow + "\r\n";

  // Body rows
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    const rowContent = Array.from(cells).map(td => `"${td.innerText}"`).join(",");
    csvContent += rowContent + "\r\n";
  });

  // ✅ Create CSV Blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // ✅ Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  // ✅ Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


  // ===== Initialize Attendance Chart =====
 // ===== Initialize Attendance Chart =====
function updateAttendanceChart(data) {
  const ctx = attendanceChartCanvas.getContext("2d");

  const onTimeCount = data.filter(d => d.status?.toLowerCase() === "on-time").length;
  const lateCount = data.filter(d => d.status?.toLowerCase() === "late").length;
  const absentCount = data.filter(d => d.status?.toLowerCase().includes("absent")).length;

  const total = onTimeCount + lateCount + absentCount;
  const percentage = total > 0 ? ((onTimeCount / total) * 100).toFixed(1) : 0;
  attendancePercentage.textContent = `${percentage}% `;

  if (attendanceChart) attendanceChart.destroy();

  attendanceChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["On-Time", "Late", "Absent"],
      datasets: [{
        data: [onTimeCount, lateCount, absentCount],
        backgroundColor: ["#2ecc71", "#f39c12", "#e74c3c"], // 🟩 green, 🟧 orange, 🟥 red
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#333", font: { size: 13 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.raw} day(s)`
          }
        }
      },
      cutout: "65%"
    }
  });
}


  // ===== Start Initial Data Load =====
  if (employeeId) {
    await fetchEmployeeData();
    await loadWeeklyAttendance();
  }
});


  function updateAttendanceChart(records) {
    const onTimeDays = records.filter(r => r.status && r.status.toLowerCase().includes("on")).length;
    const lateDays = records.filter(r => r.status && r.status.toLowerCase().includes("late")).length;
    const absentDays = records.filter(r => r.status && r.status.toLowerCase().includes("absent")).length;

    const totalDays = onTimeDays + lateDays + absentDays;
    const attendanceRate = totalDays > 0 ? (((onTimeDays + lateDays) / totalDays) * 100).toFixed(0) : 0;
    attendancePercentage.textContent = `${attendanceRate}%`;

    const ctx = attendanceChartCanvas.getContext("2d");
    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["On Time", "Late", "Absent"],
        datasets: [{
          data: [onTimeDays, lateDays, absentDays],
          backgroundColor: ["#0a8a43", "#f39c12", "#c0392b"], // green, orange, red
          borderWidth: 1
        }]
      },
      options: {
        cutout: "70%",
        plugins: {
          legend: { display: false }
        }
      }
    });
  }


    // ===== Modal Opens When Chart Clicked =====
    attendanceChartCanvas.addEventListener("click", () => {
      monthlyReportModal.style.display = "flex";
      loadMonthlyAttendance();
    });
    closeMonthlyModal.addEventListener("click", () => monthlyReportModal.style.display = "none");
    window.addEventListener("click", e => {
      if (e.target === monthlyReportModal) monthlyReportModal.style.display = "none";
    });

    // ===== Tab Logic =====
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", e => {
        const target = e.target.getAttribute("data-target");
        document.querySelectorAll(".tab-content").forEach(s => s.style.display = "none");
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById(target).style.display = "block";
        if (target === "attendanceSection") loadWeeklyAttendance();
      });
    });

    if (employeeId) fetchEmployeeData();


